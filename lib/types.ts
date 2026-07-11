export interface HeaderEntry {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

export interface SiteEntry {
  id: string;
  url: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  headers: HeaderEntry[];
  sites: SiteEntry[];
}

export interface PersistedState {
  /** Global kill switch. When off, no profile is applied at all. */
  enabled: boolean;
  /** Ordered list; the first profile has the highest priority. */
  profiles: Profile[];
  selectedProfileId: string | null;
}

export const STORAGE_KEY = "ghillie-up";

/**
 * The host permission DNR needs to modify request headers. Chrome grants it
 * at install; Firefox treats it as optional, so the popup checks/requests it
 * (HostPermissionBanner) and the background folds it into the icon state.
 */
export const HOST_PERMISSION = "<all_urls>";
