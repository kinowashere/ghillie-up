import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { browser } from "#imports";
import { Switch } from "./Switch";
import { parseProfile } from "@/lib/profile-io";
import { actions, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

// Mirrors buildRules() + iconStateForUrl() in entrypoints/background.ts: a
// profile is "active" when it attaches headers to requests on the given tab.
function profileActiveOnTab(profile: Profile, url: string | undefined) {
  if (!profile.enabled) return false;
  if (!profile.headers.some((h) => h.enabled && h.name.trim())) return false;
  // DNR never rewrites requests of chrome://, about: etc. pages.
  if (!url || !/^(https?|file):/.test(url)) return false;
  const sites = profile.sites.filter((s) => s.enabled && s.url.trim());
  return sites.length === 0 || sites.some((s) => url.includes(s.url.trim()));
}

function ProfileItem({
  profile,
  selected,
  active,
}: {
  profile: Profile;
  selected: boolean;
  active: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: profile.id,
  });

  return (
    <li
      ref={setNodeRef}
      onClick={() => actions.selectProfile(profile.id)}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${
        isDragging ? "z-10 opacity-70" : ""
      } ${selected ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="relative h-4 w-4 shrink-0 cursor-grab rounded-sm ring-1 ring-white/10 active:cursor-grabbing"
        style={{ backgroundColor: profile.color }}
      >
        {active && (
          <span
            aria-hidden
            className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-green-500 ring-2 ring-neutral-900"
          />
        )}
      </button>
      <button
        className={`min-w-0 flex-1 truncate text-left cursor-pointer ${
          profile.enabled ? "text-neutral-100" : "text-neutral-500"
        }`}
      >
        {profile.name || "Untitled"}
      </button>
      <span
        className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          checked={profile.enabled}
          onChange={(v) => actions.updateProfile(profile.id, { enabled: v })}
          title="Enable/disable this profile"
        />
      </span>
    </li>
  );
}

export function Sidebar() {
  const profiles = useStore((s) => s.profiles);
  const selectedProfileId = useStore((s) => s.selectedProfileId);
  const enabled = useStore((s) => s.enabled);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tabUrl, setTabUrl] = useState<string>();
  useEffect(() => {
    void browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setTabUrl(tab?.url));
  }, []);

  function handleImportClick() {
    // Firefox closes the popup when the native file picker opens, killing an
    // in-popup import before the file is delivered. Hand off to a regular
    // extension tab (entrypoints/import) there; Chrome keeps the popup open,
    // so it uses the inline file input.
    if (import.meta.env.FIREFOX) {
      void browser.tabs.create({ url: browser.runtime.getURL("/import.html") });
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      actions.importProfile(parseProfile(await file.text()));
    } catch {
      alert(`${file.name} is not a valid profile JSON file.`);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      actions.moveProfile(String(active.id), String(over.id));
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/60">
      <h2 className="px-4 pt-4 pb-2 text-base font-semibold">Profiles</h2>

      <div className="flex gap-1.5 px-2 pb-2">
        <button
          onClick={() => actions.addProfile()}
          title="Create profile"
          className="flex-1 rounded-md border border-neutral-700 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          + New
        </button>
        <button
          onClick={handleImportClick}
          title="Import profile from a JSON file"
          className="flex-1 rounded-md border border-neutral-700 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={profiles.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-0.5">
              {profiles.map((profile) => (
                <ProfileItem
                  key={profile.id}
                  profile={profile}
                  selected={profile.id === selectedProfileId}
                  active={enabled && profileActiveOnTab(profile, tabUrl)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-800 px-4 py-3">
        <Switch
          checked={enabled}
          onChange={(v) => actions.setEnabled(v)}
          title="Enable/disable the extension"
        />
        <span
          className={`text-xs ${enabled ? "text-neutral-300" : "text-neutral-500"}`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
        <a
          href="https://github.com/kinowashere/ghillie-up"
          target="_blank"
          rel="noreferrer"
          title="View on GitHub"
          className="ml-auto text-neutral-500 hover:text-neutral-300"
        >
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="currentColor"
            aria-label="GitHub"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
