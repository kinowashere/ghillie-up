# AGENTS.md

Guidance for AI agents working on Ghillie Up.

> **Keep documentation in sync:** whenever you change business logic that is documented here or in `README.md` (rule building, priority semantics, site matching, persistence behavior, etc.), update this file and the README in the same change. Likewise, when you add new business logic, document it here (and in the README where user-facing) as part of the same change.

## What this project is

Ghillie Up is an open-source Chrome extension (ModHeader-style) for modifying HTTP request headers. Users configure **Profiles** — each with a list of headers to inject and a list of sites where they apply — through a popup UI. Header rewriting is done natively by Chrome via `declarativeNetRequest` (DNR) dynamic rules; no code runs per request.

## Stack

- **WXT** (`wxt.config.ts`) — extension framework; entrypoints live in `entrypoints/`
- **React 19** + **TypeScript 6** — popup UI
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin (no tailwind.config file)
- **Zustand** — popup state (`lib/store.ts`)
- **@dnd-kit** — drag-to-reorder profiles

## Commands

```sh
npm run dev        # launch Chrome with the extension loaded, hot-reload
npm run build      # outputs .output/chrome-mv3/
npm run zip        # distributable zip
npm run compile    # typecheck (tsc --noEmit) — run this to verify changes
```

There are no tests; `npm run compile` is the verification gate.

## Layout

| Path                        | Role                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/types.ts`              | Data model (`Profile`, `HeaderEntry`, `SiteEntry`, `PersistedState`) and `STORAGE_KEY`         |
| `lib/store.ts`              | Zustand store, all mutations in `actions`, hydration + immediate persistence                   |
| `lib/profile-io.ts`         | Profile export/import JSON (de)serialization                                                   |
| `entrypoints/background.ts` | Rebuilds DNR dynamic rules from persisted state                                                |
| `entrypoints/popup/`        | Popup entry (`App.tsx`, `main.tsx`, `index.html`, `style.css`)                                 |
| `components/`               | `Sidebar` (profile list, global switch), `ProfilePanel`, `HeadersTab`, `SettingsTab`, `Switch` |

## Business logic (keep this section accurate)

### Data flow

Popup mutates the Zustand store → store immediately auto-persists to `chrome.storage.local` under key `ghillie-up` → background's `chrome.storage.onChanged` listener rebuilds DNR rules. The popup never talks to the background directly; storage is the only channel.

### Rule building (`entrypoints/background.ts`)

- Global `enabled` flag is a kill switch: when off, all dynamic rules are removed.
- Only enabled profiles with at least one enabled, non-empty header produce rules.
- **Priority = profile order in the sidebar.** Earlier profiles get higher DNR priority, so when multiple profiles set the same header, the first one in the list wins (DNR applies only the highest-priority modification per header).
- **Sites are substring filters** (`urlFilter`) against the full request URL — `foobar.test` matches `https://foobar.test` and `http://lol.foobar.test`. One rule per enabled site.
- **A profile with no enabled sites applies to all URLs** (a single condition-less rule).
- Headers use the `set` operation and apply to all resource types.
- Rebuilds are serialized through a promise queue so overlapping storage events can't interleave `updateDynamicRules` calls.
- Rules are rebuilt from scratch each time (remove all existing IDs, add new); rule IDs are sequential from 1 and not stable across rebuilds.

### Toolbar icon (`entrypoints/background.ts`)

- The action icon reflects three states per tab: **active** (at least one rule attaches headers to the tab's URL), **idle** (extension on, but no rule matches this tab, or no profile produces rules), **disabled** (global kill switch off).
- Each state has its own PNG set: `public/icon/` (active — green→blue gradient dot), `public/icon-idle/` (purple→blue dot), `public/icon-disabled/` (gray dot) — same filenames (`16/32/48/96/128.png`, each 2x its nominal size) in each. The sets are resized from the source art `active.png` / `idle.png` / `disabled.png` in the repo root; replace the files to change the look (no code change needed).
- Matching mirrors rule building: it's derived from the just-built rules (`matchers`), using substring checks against the tab URL. Non-webby tabs (`chrome://`, `about:` …) always show idle since DNR doesn't rewrite their requests. This is a per-tab-URL approximation: a rule can still match a page's cross-origin subresources even when the tab URL itself doesn't match.
- Icons are applied to all tabs after every rebuild, and re-applied on `tabs.onUpdated` because Chrome clears tab-specific icons on navigation. The global (no-`tabId`) icon serves as the fallback for new tabs. No extra permissions needed: `tabs.query` URLs are readable via the existing `<all_urls>` host permission.

### Persistence (`lib/store.ts`)

- Everything auto-saves immediately on every store change; there are no save buttons and no save indicator.
- First run seeds one empty "Profile 1" and selects it.
- Store subscription only persists after `hydrate()` completes (guarded by the `hydrated` flag).

### Profile export/import (`lib/profile-io.ts`)

- "Download profile" (SettingsTab) exports one profile as `{name}.json` via `chrome.downloads.download({ saveAs: true })` so the user picks the location; filename-invalid characters in the name are replaced with `-`. Requires the `downloads` permission.
- The JSON contains `name`, `color`, `headers` (name/value/enabled), `sites` (url/enabled) — **no ids**. Import (`parseProfile`) regenerates all ids, so importing never collides with existing profiles.
- Import ("Import" button in the Sidebar) requires `name` (string), `headers` and `sites` (arrays) to be present; entry fields and `color` fall back to defaults. The imported profile is always enabled, appended to the end of the list (lowest priority), and selected.

## Conventions and gotchas

- TypeScript 6 requires the explicit `@types/chrome` dev dependency — `chrome.*` types are not ambient without it.
- All state mutations go through `actions` in `lib/store.ts`; components never call `useStore.setState` directly.
- Import WXT helpers from `#imports` (e.g. `defineBackground`); project files via the `@/` alias.
- Manifest permissions are `storage` + `declarativeNetRequest` + `downloads` with `<all_urls>` host permissions — adding features that need more permissions means editing `wxt.config.ts`.
- Entity IDs are `crypto.randomUUID()`.
