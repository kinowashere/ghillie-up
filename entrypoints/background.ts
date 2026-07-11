import { browser, defineBackground, type Browser } from "#imports";
import { HOST_PERMISSION, STORAGE_KEY } from "@/lib/types";
import type {
  DownloadProfileMessage,
  PersistedState,
  Profile,
} from "@/lib/types";

const ALL_RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
] as Browser.declarativeNetRequest.ResourceType[];

function buildRules(profiles: Profile[]): Browser.declarativeNetRequest.Rule[] {
  const rules: Browser.declarativeNetRequest.Rule[] = [];
  let ruleId = 1;

  const active = profiles.filter((p) => p.enabled);
  active.forEach((profile, index) => {
    const headers = profile.headers.filter((h) => h.enabled && h.name.trim());
    if (headers.length === 0) return;

    const requestHeaders = headers.map((h) => ({
      header: h.name.trim(),
      operation: "set" as Browser.declarativeNetRequest.HeaderOperation,
      value: h.value,
    }));

    // Earlier profiles in the list win when several rules set the same header:
    // DNR only applies the modification from the highest-priority rule.
    const priority = active.length - index;

    // Sites are substring filters. A profile with no enabled sites applies everywhere.
    const sites = profile.sites.filter((s) => s.enabled && s.url.trim());
    const conditions: Browser.declarativeNetRequest.RuleCondition[] =
      sites.length
        ? sites.map((s) => ({
            urlFilter: s.url.trim(),
            resourceTypes: ALL_RESOURCE_TYPES,
          }))
        : [{ resourceTypes: ALL_RESOURCE_TYPES }];

    for (const condition of conditions) {
      rules.push({
        id: ruleId++,
        priority,
        action: {
          type: "modifyHeaders" as Browser.declarativeNetRequest.RuleActionType,
          requestHeaders,
        },
        condition,
      });
    }
  });

  return rules;
}

async function doRebuild() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] as PersistedState | undefined;
  // Firefox treats host permissions as optional: the user can decline
  // <all_urls> at install or revoke it later, and DNR modifyHeaders rules
  // silently stop matching without it. Chrome grants it unconditionally.
  const hasHostAccess = await browser.permissions.contains({
    origins: [HOST_PERMISSION],
  });

  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = state?.enabled ? buildRules(state.profiles) : [];

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  matchers = {
    enabled: state?.enabled ?? false,
    hasHostAccess,
    matchesAll: addRules.some((r) => !r.condition.urlFilter),
    sites: addRules.flatMap((r) => r.condition.urlFilter ?? []),
  };
  await applyIcons();
}

// --- Toolbar icon ---------------------------------------------------------
// Three states: "active" (headers are being attached on this tab), "idle"
// (extension is on but no rule matches this tab), "disabled" (kill switch
// off). Each state has its own icon set: public/icon/, public/icon-idle/,
// public/icon-disabled/ — swap the PNGs there to change the art.

type IconState = "active" | "idle" | "disabled";

// Mirror of the last built rules, used to answer "would any rule match this
// tab's URL?" without re-reading storage on every tab event.
let matchers = {
  enabled: false,
  hasHostAccess: false,
  matchesAll: false,
  sites: [] as string[],
};

function iconStateForUrl(url: string | undefined): IconState {
  if (!matchers.enabled) return "disabled";
  // Without host access no rule modifies anything, so never claim "active".
  if (!matchers.hasHostAccess) return "idle";
  // DNR never rewrites requests of chrome://, about: etc. pages.
  if (!url || !/^(https?|file):/.test(url)) return "idle";
  if (matchers.matchesAll) return "active";
  return matchers.sites.some((site) => url.includes(site)) ? "active" : "idle";
}

const ICON_SIZES = [16, 32, 48, 96, 128];
const ICON_DIRS: Record<IconState, string> = {
  active: "icon",
  idle: "icon-idle",
  disabled: "icon-disabled",
};

function iconPaths(state: IconState): Record<number, string> {
  return Object.fromEntries(
    ICON_SIZES.map((size) => [size, `/${ICON_DIRS[state]}/${size}.png`]),
  );
}

async function applyIcons() {
  // Global default: what new tabs (and tabs the browser hasn't told us
  // about) show. Per-tab icons set below override it where a URL is known.
  const fallback: IconState = !matchers.enabled
    ? "disabled"
    : matchers.hasHostAccess && matchers.matchesAll
      ? "active"
      : "idle";
  await browser.action.setIcon({ path: iconPaths(fallback) });

  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs.map((tab) =>
      tab.id === undefined
        ? undefined
        : browser.action
            .setIcon({
              tabId: tab.id,
              path: iconPaths(iconStateForUrl(tab.url)),
            })
            // The tab may have closed between query and setIcon.
            .catch(() => {}),
    ),
  );
}

async function updateTabIcon(tabId: number, url: string | undefined) {
  await browser.action
    .setIcon({ tabId, path: iconPaths(iconStateForUrl(url)) })
    .catch(() => {});
}

// --- Profile export -------------------------------------------------------

async function downloadJson(filename: string, json: string) {
  try {
    // Firefox's downloads API mishandles data: URLs (bugzil.la/1638226), but
    // its background is an event page where Blob object URLs are available.
    // Chrome's service worker lacks URL.createObjectURL but handles data:
    // URLs fine.
    if (typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const id = await browser.downloads.download({
        url,
        filename,
        saveAs: true,
      });
      revokeWhenDone(id, url);
    } else {
      await browser.downloads.download({
        url: "data:application/json;charset=utf-8," + encodeURIComponent(json),
        filename,
        saveAs: true,
      });
    }
  } catch (err) {
    console.error("[ghillie-up] failed to download profile", err);
  }
}

// An object URL must outlive the download that reads it, so only revoke once
// the download leaves the in_progress state.
function revokeWhenDone(downloadId: number, url: string) {
  const listener = (delta: Browser.downloads.DownloadDelta) => {
    if (delta.id !== downloadId) return;
    const state = delta.state?.current;
    if (state === "complete" || state === "interrupted") {
      URL.revokeObjectURL(url);
      browser.downloads.onChanged.removeListener(listener);
    }
  };
  browser.downloads.onChanged.addListener(listener);
}

// Serialize rebuilds so overlapping storage events can't interleave rule updates.
let queue: Promise<void> = Promise.resolve();
function rebuild() {
  queue = queue
    .then(doRebuild)
    .catch((err) => console.error("[ghillie-up] failed to update rules", err));
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(rebuild);
  browser.runtime.onStartup.addListener(rebuild);
  // Profile exports are downloaded from here rather than the popup: see
  // DownloadProfileMessage in lib/types.ts.
  browser.runtime.onMessage.addListener((message) => {
    const msg = message as DownloadProfileMessage;
    if (msg?.type !== "download-profile") return;
    void downloadJson(msg.filename, msg.json);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) rebuild();
  });
  // Host access can be granted (popup banner) or revoked (browser settings)
  // at any time; either way the icon state must be recomputed.
  browser.permissions.onAdded.addListener(rebuild);
  browser.permissions.onRemoved.addListener(rebuild);
  // The browser clears tab-specific icons on navigation, so re-apply whenever
  // a tab starts loading a page (covers navigations and reloads).
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" || changeInfo.url) {
      void updateTabIcon(tabId, tab.url);
    }
  });
  rebuild();
});
