import { useState } from "react";
import { HeadersTab } from "./HeadersTab";
import { SettingsTab } from "./SettingsTab";
import { Switch } from "./Switch";
import { actions } from "@/lib/store";
import type { Profile } from "@/lib/types";

type Tab = "headers" | "settings";

export function ProfilePanel({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("headers");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-neutral-800 px-4">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: profile.color }}
        />
        <h1 className="min-w-0 flex-1 truncate font-medium">
          {profile.name || "Untitled"}
        </h1>
        <Switch
          checked={profile.enabled}
          onChange={(v) => actions.updateProfile(profile.id, { enabled: v })}
          title="Enable/disable this profile"
        />
      </div>

      <nav className="flex shrink-0 gap-6 border-b border-neutral-800 px-4">
        {(["headers", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 py-2.5 capitalize transition-colors ${
              tab === t
                ? "border-blue-500 text-neutral-100"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "headers" ? (
          <HeadersTab profile={profile} />
        ) : (
          <SettingsTab profile={profile} />
        )}
      </div>
    </div>
  );
}
