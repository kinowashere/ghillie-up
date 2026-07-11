# Ghillie Up

Open-source browser extension (Chrome and Firefox) for modifying HTTP request headers, in the spirit of ModHeader.

Configure **Profiles**, each with a set of headers to inject and a set of sites (URL substrings) where they apply. Multiple profiles can be active at once; the profile order in the sidebar decides priority (first wins on conflicts). Header rewriting is done natively by the browser via `declarativeNetRequest` dynamic rules — no request interception code runs per request.

## Features

- Global on/off switch — when off, requests pass through untouched.
- Per-profile enable flag, name, and color; drag the color swatch to reorder profiles.
- Per-header and per-site enable flags.
- Sites are substring matches against the full request URL (`foobar.test` matches `https://foobar.test` and `http://lol.foobar.test`). A profile with no enabled sites applies everywhere.
- The toolbar icon shows at a glance what's happening on the current tab: green dot when headers are being attached, purple dot when the extension is on but nothing matches the tab, gray dot when the global switch is off. (Icon sets live in `public/icon`, `public/icon-idle`, `public/icon-disabled`.)
- Everything auto-saves immediately to extension storage (`storage.local`) — no save buttons.
- Copy a header's value to the clipboard with one click.
- Export a profile to a JSON file ("Download profile" in its settings) and import it on another machine ("Import" in the sidebar).

## Development

```sh
npm install
npm run dev            # launches Chrome with the extension loaded, hot-reloads
npm run dev:firefox    # same, but launches Firefox
```

### Firefox notes

Firefox (MV3) treats the `<all_urls>` host permission as optional: users can decline it at install or revoke it later, and header rules silently stop matching without it. The popup shows a banner with a "Grant access" button when access is missing, and the toolbar icon stays in the idle state. Chrome grants host permissions at install, so none of this appears there.

Firefox also closes the popup whenever a native dialog steals focus, so "Import" opens a small dedicated tab there (Chrome imports inline in the popup), and profile downloads are initiated by the background script.

### Testing against Brave (or another Chromium browser)

Create a `web-ext.config.ts` at the project root (gitignored, since paths are machine-specific) pointing the `chrome` target at your browser's binary:

```ts
import { defineWebExtConfig } from "wxt";

export default defineWebExtConfig({
  binaries: {
    chrome: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
  keepProfileChanges: true, // optional: reuse the same browser profile between runs
});
```

`npm run dev` will then open Brave instead of Chrome. By default WXT launches a fresh throwaway profile each run; `keepProfileChanges` persists it. (A `firefox` key works the same way for `npm run dev:firefox` if Firefox lives in a non-standard location.)

## Build

```sh
npm run build            # outputs .output/chrome-mv3/
npm run build:firefox    # outputs .output/firefox-mv3/
npm run zip              # distributable Chrome zip
npm run zip:firefox      # distributable Firefox zip + AMO sources zip
npm run compile          # typecheck
```

To load manually in Chrome: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `.output/chrome-mv3`.

To load manually in Firefox: `about:debugging` → "This Firefox" → "Load Temporary Add-on…" → select `.output/firefox-mv3/manifest.json` (temporary add-ons are removed when Firefox closes; permanent installs require the extension to be signed by AMO).

## Stack

WXT · React · TypeScript · Tailwind CSS v4 · Zustand · @dnd-kit
