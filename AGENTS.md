# AGENTS.md

Guidance for AI agents working on Ghillie Up.

> **Keep documentation in sync:** whenever you change business logic that is documented here or in `README.md` (rule building, priority semantics, site matching, persistence behavior, etc.), update this file and the README in the same change. Likewise, when you add new business logic, document it here (and in the README where user-facing) as part of the same change.

## What this project is

Ghillie Up is an open-source browser extension (ModHeader-style) for Chrome and Firefox that modifies HTTP request headers. Users configure **Profiles** — each with a list of headers to inject and a list of sites where they apply — through a popup UI. Header rewriting is done natively by the browser via `declarativeNetRequest` (DNR) dynamic rules; no code runs per request. Both targets build as MV3 (`manifestVersion: 3` in `wxt.config.ts` — without it WXT would build Firefox as MV2, where the `action` API doesn't exist).

## Stack

- **WXT** (`wxt.config.ts`) — extension framework; entrypoints live in `entrypoints/`
- **React 19** + **TypeScript 6** — popup UI
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin (no tailwind.config file)
- **Zustand** — popup state (`lib/store.ts`)
- **@dnd-kit** — drag-to-reorder profiles

## Commands

```sh
npm run dev            # launch Chrome with the extension loaded, hot-reload
npm run dev:firefox    # same, but Firefox
npm run build          # outputs .output/chrome-mv3/
npm run build:firefox  # outputs .output/firefox-mv3/
npm run zip            # distributable Chrome zip
npm run zip:firefox    # distributable Firefox zip + AMO sources zip
npm run compile        # typecheck (tsc --noEmit) — run this to verify changes
```

There are no tests; `npm run compile` is the verification gate.

## Layout

| Path                        | Role                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`              | Data model (`Profile`, `HeaderEntry`, `SiteEntry`, `PersistedState`), `STORAGE_KEY`, `HOST_PERMISSION`                 |
| `lib/store.ts`              | Zustand store, all mutations in `actions`, hydration + immediate persistence                                           |
| `lib/profile-io.ts`         | Profile export/import JSON (de)serialization                                                                           |
| `entrypoints/background.ts` | Rebuilds DNR dynamic rules from persisted state                                                                        |
| `entrypoints/popup/`        | Popup entry (`App.tsx`, `main.tsx`, `index.html`, `style.css`)                                                         |
| `entrypoints/import/`       | Profile-import page, opened as a tab on Firefox (file pickers close the popup there)                                   |
| `components/`               | `Sidebar` (profile list, global switch), `ProfilePanel`, `HeadersTab`, `SettingsTab`, `Switch`, `HostPermissionBanner` |

## Business logic (keep this section accurate)

### Data flow

Popup mutates the Zustand store → store immediately auto-persists to `browser.storage.local` under key `ghillie-up` → background's `browser.storage.onChanged` listener rebuilds DNR rules. State never flows to the background via messaging; storage is the channel. The single runtime message is `DownloadProfileMessage` (profile export, see below), which carries no state.

### Rule building (`entrypoints/background.ts`)

- Global `enabled` flag is a kill switch: when off, all dynamic rules are removed.
- Only enabled profiles with at least one enabled, non-empty header produce rules.
- **Priority = profile order in the sidebar.** Earlier profiles get higher DNR priority, so when multiple profiles set the same header, the first one in the list wins (DNR applies only the highest-priority modification per header).
- **Sites are substring filters** (`urlFilter`) against the full request URL — `foobar.test` matches `https://foobar.test` and `http://lol.foobar.test`. One rule per enabled site.
- **A profile with no enabled sites applies to all URLs** (a single condition-less rule).
- Headers use the `set` operation and apply to all resource types.
- Rebuilds are serialized through a promise queue so overlapping storage events can't interleave `updateDynamicRules` calls.
- Rules are rebuilt from scratch each time (remove all existing IDs, add new); rule IDs are sequential from 1 and not stable across rebuilds.

### Host permissions (Firefox)

- Chrome grants the `<all_urls>` host permission at install; Firefox MV3 treats host permissions as optional — the user can decline at install or revoke later. Without host access, DNR `modifyHeaders` rules silently stop matching (rules stay registered and resume when access is granted).
- The background checks `browser.permissions.contains({ origins: [HOST_PERMISSION] })` on every rebuild and folds the result into `matchers.hasHostAccess`: without host access the icon never shows "active" (falls back to "idle"). `permissions.onAdded`/`onRemoved` trigger rebuilds.
- The popup renders `HostPermissionBanner` (top of `App.tsx`) when access is missing, with a "Grant access" button calling `browser.permissions.request` (must run in a user gesture handler). On Chrome the banner never appears.
- Firefox-only manifest keys (`browser_specific_settings.gecko`: AMO extension ID, `strict_min_version`, `data_collection_permissions`) live in `wxt.config.ts` behind a `browser === "firefox"` guard so they don't leak into Chrome builds.

### Toolbar icon (`entrypoints/background.ts`)

- The action icon reflects three states per tab: **active** (at least one rule attaches headers to the tab's URL), **idle** (extension on, but no rule matches this tab, no profile produces rules, or host access is missing — see "Host permissions" above), **disabled** (global kill switch off).
- Each state has its own PNG set: `public/icon/` (active — green→blue gradient dot), `public/icon-idle/` (purple→blue dot), `public/icon-disabled/` (gray dot) — same filenames (`16/32/48/96/128.png`, each 2x its nominal size) in each. The sets are resized from the source art `active.png` / `idle.png` / `disabled.png` in the repo root; replace the files to change the look (no code change needed).
- Matching mirrors rule building: it's derived from the just-built rules (`matchers`), using substring checks against the tab URL. Non-webby tabs (`chrome://`, `about:` …) always show idle since DNR doesn't rewrite their requests. This is a per-tab-URL approximation: a rule can still match a page's cross-origin subresources even when the tab URL itself doesn't match.
- Icons are applied to all tabs after every rebuild, and re-applied on `tabs.onUpdated` because the browser clears tab-specific icons on navigation. The global (no-`tabId`) icon serves as the fallback for new tabs. No extra permissions needed: `tabs.query` URLs are readable via the existing `<all_urls>` host permission.

### Persistence (`lib/store.ts`)

- Everything auto-saves immediately on every store change; there are no save buttons and no save indicator.
- First run seeds one empty "Profile 1" and selects it.
- Store subscription only persists after `hydrate()` completes (guarded by the `hydrated` flag).

### Profile export/import (`lib/profile-io.ts`)

- "Download profile" (SettingsTab) exports one profile as `{name}.json`; filename-invalid characters in the name are replaced with `-`. The popup sends a `DownloadProfileMessage` (`lib/types.ts`) and the **background** calls `browser.downloads.download({ saveAs: true })` so the user picks the location — a download started from the popup dies in Firefox because the Save As dialog steals focus and closes the popup. The URL scheme is feature-detected: Blob object URL where `URL.createObjectURL` exists (Firefox's event page; its downloads API mishandles data: URLs, bugzil.la/1638226), data: URL otherwise (Chrome's service worker has no `createObjectURL`), revoked after the download completes. Requires the `downloads` permission.
- The JSON contains `name`, `color`, `headers` (name/value/enabled), `sites` (url/enabled) — **no ids**. Import (`parseProfile`) regenerates all ids, so importing never collides with existing profiles.
- Import ("Import" button in the Sidebar) requires `name` (string), `headers` and `sites` (arrays) to be present; entry fields and `color` fall back to defaults. The imported profile is always enabled, appended to the end of the list (lowest priority), and selected.
- Import is browser-branched (`import.meta.env.FIREFOX` in `Sidebar`): Chrome uses the popup's inline hidden file input; Firefox opens `entrypoints/import/` in a tab, because the popup closes when the native file picker opens and the in-popup import dies with it. The import page writes straight to storage via `importProfileToStorage` (`lib/store.ts`, mirrors `actions.importProfile` semantics) and then closes its own tab.

## Conventions and gotchas

- **Never commit or push.** Leave staging, committing, tagging, and pushing to the user; only do so when explicitly instructed in the current request.

- **Never use the global `chrome` namespace.** Import `browser` (API) and `Browser` (types) from `#imports` — they work in both Chrome and Firefox. There is no `@types/chrome` dependency and no ambient `chrome` type.
- **Avoid UI that opens native OS dialogs from the popup** (e.g. `<input type="color">`, `<input type="file">`): Firefox closes the popup when the dialog steals focus. Profile colors use inline palette swatches (`PALETTE` from `lib/store.ts`) + a hex text field in `SettingsTab`; file import goes through a dedicated tab on Firefox; downloads run in the background script.
- All state mutations go through `actions` in `lib/store.ts`; components never call `useStore.setState` directly.
- Import WXT helpers from `#imports` (e.g. `defineBackground`, `browser`); project files via the `@/` alias.
- Manifest permissions are `storage` + `declarativeNetRequest` + `downloads` with `<all_urls>` host permissions — adding features that need more permissions means editing `wxt.config.ts`.
- Entity IDs are `crypto.randomUUID()`.
