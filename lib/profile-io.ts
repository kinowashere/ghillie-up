import type { HeaderEntry, Profile, SiteEntry } from "./types";

/**
 * Profile export/import JSON. IDs are internal and excluded from the file;
 * import regenerates them so an imported profile never collides with an
 * existing one.
 */

export function serializeProfile(profile: Profile): string {
  return JSON.stringify(
    {
      name: profile.name,
      color: profile.color,
      headers: profile.headers.map(({ name, value, enabled }) => ({
        name,
        value,
        enabled,
      })),
      sites: profile.sites.map(({ url, enabled }) => ({ url, enabled })),
    },
    null,
    2,
  );
}

function parseHeader(value: unknown): HeaderEntry {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid header entry");
  }
  const h = value as Record<string, unknown>;
  return {
    id: crypto.randomUUID(),
    name: typeof h.name === "string" ? h.name : "",
    value: typeof h.value === "string" ? h.value : "",
    enabled: typeof h.enabled === "boolean" ? h.enabled : true,
  };
}

function parseSite(value: unknown): SiteEntry {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid site entry");
  }
  const s = value as Record<string, unknown>;
  return {
    id: crypto.randomUUID(),
    url: typeof s.url === "string" ? s.url : "",
    enabled: typeof s.enabled === "boolean" ? s.enabled : true,
  };
}

/** Parses exported profile JSON. Throws if the shape is not a profile. */
export function parseProfile(text: string): Profile {
  const data: unknown = JSON.parse(text);
  if (typeof data !== "object" || data === null) {
    throw new Error("Not a profile");
  }
  const raw = data as Record<string, unknown>;
  if (
    typeof raw.name !== "string" ||
    !Array.isArray(raw.headers) ||
    !Array.isArray(raw.sites)
  ) {
    throw new Error("Not a profile");
  }
  return {
    id: crypto.randomUUID(),
    name: raw.name,
    enabled: true,
    color: typeof raw.color === "string" ? raw.color : "#3b82f6",
    headers: raw.headers.map(parseHeader),
    sites: raw.sites.map(parseSite),
  };
}
