import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import { browser } from "#imports";
import {
  STORAGE_KEY,
  type HeaderEntry,
  type PersistedState,
  type Profile,
  type SiteEntry,
} from "./types";

export const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#14b8a6",
  "#ec4899",
];

function newProfile(index: number): Profile {
  return {
    id: crypto.randomUUID(),
    name: `Profile ${index}`,
    enabled: true,
    color: PALETTE[(index - 1) % PALETTE.length],
    headers: [],
    sites: [],
  };
}

export const useStore = create<PersistedState>(() => ({
  enabled: true,
  profiles: [],
  selectedProfileId: null,
}));

let hydrated = false;

function snapshot(): PersistedState {
  const { enabled, profiles, selectedProfileId } = useStore.getState();
  return { enabled, profiles, selectedProfileId };
}

function persist() {
  void browser.storage.local.set({ [STORAGE_KEY]: snapshot() });
}

export async function hydrate() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const saved = stored[STORAGE_KEY] as PersistedState | undefined;
  if (saved) {
    useStore.setState(saved);
  } else {
    const profile = newProfile(1);
    useStore.setState({
      enabled: true,
      profiles: [profile],
      selectedProfileId: profile.id,
    });
    await browser.storage.local.set({ [STORAGE_KEY]: snapshot() });
  }
  hydrated = true;
}

useStore.subscribe(() => {
  if (hydrated) persist();
});

/**
 * Appends an imported profile straight to persisted storage, bypassing the
 * in-memory store. Used by the import page (entrypoints/import), which runs
 * in its own document where the popup store isn't hydrated. Mirrors
 * actions.importProfile semantics: appended last (lowest priority), selected.
 */
export async function importProfileToStorage(profile: Profile) {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] as PersistedState | undefined;
  const next: PersistedState = {
    enabled: state?.enabled ?? true,
    profiles: [...(state?.profiles ?? []), profile],
    selectedProfileId: profile.id,
  };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
}

function patchProfile(id: string, patch: (p: Profile) => Partial<Profile>) {
  useStore.setState((s) => ({
    profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch(p) } : p)),
  }));
}

export const actions = {
  setEnabled(enabled: boolean) {
    useStore.setState({ enabled });
  },

  selectProfile(id: string) {
    useStore.setState({ selectedProfileId: id });
  },

  addProfile() {
    useStore.setState((s) => {
      const profile = newProfile(s.profiles.length + 1);
      return {
        profiles: [...s.profiles, profile],
        selectedProfileId: profile.id,
      };
    });
  },

  importProfile(profile: Profile) {
    useStore.setState((s) => ({
      profiles: [...s.profiles, profile],
      selectedProfileId: profile.id,
    }));
  },

  deleteProfile(id: string) {
    useStore.setState((s) => {
      const profiles = s.profiles.filter((p) => p.id !== id);
      const selectedProfileId =
        s.selectedProfileId === id
          ? (profiles[0]?.id ?? null)
          : s.selectedProfileId;
      return { profiles, selectedProfileId };
    });
  },

  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, "name" | "enabled" | "color">>,
  ) {
    patchProfile(id, () => patch);
  },

  moveProfile(activeId: string, overId: string) {
    useStore.setState((s) => {
      const from = s.profiles.findIndex((p) => p.id === activeId);
      const to = s.profiles.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return s;
      return { profiles: arrayMove(s.profiles, from, to) };
    });
  },

  addHeader(profileId: string) {
    const header: HeaderEntry = {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      enabled: true,
    };
    patchProfile(profileId, (p) => ({ headers: [...p.headers, header] }));
  },

  updateHeader(
    profileId: string,
    headerId: string,
    patch: Partial<HeaderEntry>,
  ) {
    patchProfile(profileId, (p) => ({
      headers: p.headers.map((h) =>
        h.id === headerId ? { ...h, ...patch } : h,
      ),
    }));
  },

  deleteHeader(profileId: string, headerId: string) {
    patchProfile(profileId, (p) => ({
      headers: p.headers.filter((h) => h.id !== headerId),
    }));
  },

  addSite(profileId: string) {
    const site: SiteEntry = { id: crypto.randomUUID(), url: "", enabled: true };
    patchProfile(profileId, (p) => ({ sites: [...p.sites, site] }));
  },

  updateSite(profileId: string, siteId: string, patch: Partial<SiteEntry>) {
    patchProfile(profileId, (p) => ({
      sites: p.sites.map((s) => (s.id === siteId ? { ...s, ...patch } : s)),
    }));
  },

  deleteSite(profileId: string, siteId: string) {
    patchProfile(profileId, (p) => ({
      sites: p.sites.filter((s) => s.id !== siteId),
    }));
  },
};
