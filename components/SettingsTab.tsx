import { useEffect, useState } from "react";
import { browser } from "#imports";
import { serializeProfile } from "@/lib/profile-io";
import { actions, PALETTE } from "@/lib/store";
import type { DownloadProfileMessage, Profile } from "@/lib/types";

function downloadProfile(profile: Profile) {
  const name = (profile.name || "Untitled").replace(/[\\/:*?"<>|]/g, "-");
  // The background performs the actual download; anything started here dies
  // in Firefox when the Save As dialog closes the popup.
  void browser.runtime.sendMessage({
    type: "download-profile",
    filename: `${name}.json`,
    json: serializeProfile(profile),
  } satisfies DownloadProfileMessage);
}

// Free-form hex field next to the palette swatches. Edits are kept locally
// while typing and only committed to the store once they form a valid
// #rrggbb color; blur reverts an unfinished draft to the stored value.
function HexColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      type="text"
      value={draft}
      spellCheck={false}
      onChange={(e) => {
        const color = e.target.value;
        setDraft(color);
        if (/^#[0-9a-fA-F]{6}$/.test(color)) onChange(color);
      }}
      onBlur={() => setDraft(value)}
      className="ml-2 w-20 rounded-md border border-neutral-700 bg-transparent px-2 py-1 font-mono text-xs outline-none placeholder:text-neutral-600 focus:border-blue-500"
    />
  );
}

export function SettingsTab({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-6">
      <div>
        <input
          type="text"
          value={profile.name}
          placeholder="Untitled"
          onChange={(e) =>
            actions.updateProfile(profile.id, { name: e.target.value })
          }
          className="w-full rounded-md border border-neutral-700 bg-transparent px-3 py-2 outline-none placeholder:text-neutral-600 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-neutral-400">Profile Name</p>
      </div>

      <div>
        {/* No native <input type="color">: Firefox closes the popup (and the
            OS picker with it) when the picker dialog steals focus. */}
        <div className="flex items-center gap-1.5">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => actions.updateProfile(profile.id, { color })}
              title={color}
              style={{ backgroundColor: color }}
              className={`h-6 w-6 cursor-pointer rounded-md ${
                profile.color === color
                  ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-950"
                  : "ring-1 ring-white/10 hover:ring-white/40"
              }`}
            />
          ))}
          <HexColorInput
            value={profile.color}
            onChange={(color) => actions.updateProfile(profile.id, { color })}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-400">Color</p>
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold">Sites</h3>
        <p className="mb-3 text-xs text-neutral-500">
          Substring match against the request URL. No sites means the profile
          applies everywhere.
        </p>

        <div className="space-y-2">
          {profile.sites.map((site) => (
            <div
              key={site.id}
              className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-3"
            >
              <input
                type="checkbox"
                checked={site.enabled}
                onChange={(e) =>
                  actions.updateSite(profile.id, site.id, {
                    enabled: e.target.checked,
                  })
                }
                title="Enable/disable this site"
                className="h-4 w-4 accent-blue-500"
              />
              <input
                type="text"
                value={site.url}
                placeholder="foobar.test"
                spellCheck={false}
                onChange={(e) =>
                  actions.updateSite(profile.id, site.id, {
                    url: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-1.5 font-mono text-xs outline-none placeholder:text-neutral-600 focus:border-blue-500"
              />
              <button
                onClick={() => actions.deleteSite(profile.id, site.id)}
                title="Delete site"
                className="rounded-md py-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => actions.addSite(profile.id)}
          title="Add site"
          className="mt-3 rounded-md border border-neutral-700 px-6 py-1 text-neutral-300 hover:bg-neutral-800"
        >
          +
        </button>
      </div>

      <div className="flex gap-2 border-t border-neutral-800 pt-4">
        <button
          onClick={() => downloadProfile(profile)}
          title="Save this profile as a JSON file"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          Download profile
        </button>
        <button
          onClick={() => actions.deleteProfile(profile.id)}
          className="rounded-md border border-red-900/60 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40"
        >
          Delete profile
        </button>
      </div>
    </div>
  );
}
