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
