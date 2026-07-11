import { browser } from "#imports";
import { serializeProfile } from "@/lib/profile-io";
import { actions } from "@/lib/store";
import type { Profile } from "@/lib/types";

function downloadProfile(profile: Profile) {
  const name = (profile.name || "Untitled").replace(/[\\/:*?"<>|]/g, "-");
  void browser.downloads.download({
    url:
      "data:application/json;charset=utf-8," +
      encodeURIComponent(serializeProfile(profile)),
    filename: `${name}.json`,
    saveAs: true,
  });
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

      <label className="flex w-fit cursor-pointer items-center gap-3">
        <input
          type="color"
          value={profile.color}
          onChange={(e) =>
            actions.updateProfile(profile.id, { color: e.target.value })
          }
          className="h-10 w-10 cursor-pointer rounded-md border border-neutral-700 bg-transparent p-1"
        />
        <span className="text-xs text-neutral-400">Color</span>
      </label>

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
