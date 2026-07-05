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
import { useRef, type ChangeEvent } from "react";
import { Switch } from "./Switch";
import { parseProfile } from "@/lib/profile-io";
import { actions, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

function ProfileItem({
  profile,
  selected,
}: {
  profile: Profile;
  selected: boolean;
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
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
        isDragging ? "z-10 opacity-70" : ""
      } ${selected ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="h-4 w-4 shrink-0 cursor-grab rounded-sm ring-1 ring-white/10 active:cursor-grabbing"
        style={{ backgroundColor: profile.color }}
      />
      <button
        onClick={() => actions.selectProfile(profile.id)}
        className={`min-w-0 flex-1 truncate text-left ${
          profile.enabled ? "text-neutral-100" : "text-neutral-500"
        }`}
      >
        {profile.name || "Untitled"}
      </button>
    </li>
  );
}

export function Sidebar() {
  const profiles = useStore((s) => s.profiles);
  const selectedProfileId = useStore((s) => s.selectedProfileId);
  const enabled = useStore((s) => s.enabled);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/60">
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
          onClick={() => fileInputRef.current?.click()}
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
      </div>
    </aside>
  );
}
