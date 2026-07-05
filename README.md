# Ghillie Up

Open-source Chrome extension for modifying HTTP request headers, in the spirit of ModHeader.

Configure **Profiles**, each with a set of headers to inject and a set of sites (URL substrings) where they apply. Multiple profiles can be active at once; the profile order in the sidebar decides priority (first wins on conflicts). Header rewriting is done natively by Chrome via `declarativeNetRequest` dynamic rules — no request interception code runs per request.

## Features

- Global on/off switch — when off, requests pass through untouched.
- Per-profile enable flag, name, and color; drag the color swatch to reorder profiles.
- Per-header and per-site enable flags.
- Sites are substring matches against the full request URL (`foobar.test` matches `https://foobar.test` and `http://lol.foobar.test`). A profile with no enabled sites applies everywhere.
- The toolbar icon shows at a glance what's happening on the current tab: green dot when headers are being attached, purple dot when the extension is on but nothing matches the tab, gray dot when the global switch is off. (Icon sets live in `public/icon`, `public/icon-idle`, `public/icon-disabled`.)
- Everything auto-saves immediately to `chrome.storage.local` — no save buttons.
- Copy a header's value to the clipboard with one click.
- Export a profile to a JSON file ("Download profile" in its settings) and import it on another machine ("Import" in the sidebar).

## Development

```sh
npm install
npm run dev        # launches Chrome with the extension loaded, hot-reloads
```

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

`npm run dev` will then open Brave instead of Chrome. By default WXT launches a fresh throwaway profile each run; `keepProfileChanges` persists it.

## Build

```sh
npm run build      # outputs .output/chrome-mv3/
npm run zip        # distributable zip
npm run compile    # typecheck
```

To load manually: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `.output/chrome-mv3`.

## Stack

WXT · React · TypeScript · Tailwind CSS v4 · Zustand · @dnd-kit
