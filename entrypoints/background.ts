import { defineBackground } from "#imports";
import { STORAGE_KEY, type PersistedState, type Profile } from "@/lib/types";

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
] as chrome.declarativeNetRequest.ResourceType[];

function buildRules(profiles: Profile[]): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let ruleId = 1;

  const active = profiles.filter((p) => p.enabled);
  active.forEach((profile, index) => {
    const headers = profile.headers.filter((h) => h.enabled && h.name.trim());
    if (headers.length === 0) return;

    const requestHeaders = headers.map((h) => ({
      header: h.name.trim(),
      operation: "set" as chrome.declarativeNetRequest.HeaderOperation,
      value: h.value,
    }));

    // Earlier profiles in the list win when several rules set the same header:
    // DNR only applies the modification from the highest-priority rule.
    const priority = active.length - index;

    // Sites are substring filters. A profile with no enabled sites applies everywhere.
    const sites = profile.sites.filter((s) => s.enabled && s.url.trim());
    const conditions: chrome.declarativeNetRequest.RuleCondition[] =
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
          type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
          requestHeaders,
        },
        condition,
      });
    }
  });

  return rules;
}

async function doRebuild() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] as PersistedState | undefined;

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = state?.enabled ? buildRules(state.profiles) : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  matchers = {
    enabled: state?.enabled ?? false,
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
let matchers = { enabled: false, matchesAll: false, sites: [] as string[] };

function iconStateForUrl(url: string | undefined): IconState {
  if (!matchers.enabled) return "disabled";
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
  // Global default: what new tabs (and tabs Chrome hasn't told us about)
  // show. Per-tab icons set below override it where a URL is known.
  const fallback: IconState = !matchers.enabled
    ? "disabled"
    : matchers.matchesAll
      ? "active"
      : "idle";
  await chrome.action.setIcon({ path: iconPaths(fallback) });

  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) =>
      tab.id === undefined
        ? undefined
        : chrome.action
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
  await chrome.action
    .setIcon({ tabId, path: iconPaths(iconStateForUrl(url)) })
    .catch(() => {});
}

// Serialize rebuilds so overlapping storage events can't interleave rule updates.
let queue: Promise<void> = Promise.resolve();
function rebuild() {
  queue = queue
    .then(doRebuild)
    .catch((err) => console.error("[ghillie-up] failed to update rules", err));
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(rebuild);
  chrome.runtime.onStartup.addListener(rebuild);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) rebuild();
  });
  // Chrome clears tab-specific icons on navigation, so re-apply whenever a
  // tab starts loading a page (covers navigations and reloads).
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" || changeInfo.url) {
      void updateTabIcon(tabId, tab.url);
    }
  });
  rebuild();
});
