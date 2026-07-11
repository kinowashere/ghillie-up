import { HostPermissionBanner } from "@/components/HostPermissionBanner";
import { Sidebar } from "@/components/Sidebar";
import { ProfilePanel } from "@/components/ProfilePanel";
import { actions, useStore } from "@/lib/store";

export default function App() {
  const profiles = useStore((s) => s.profiles);
  const selectedProfileId = useStore((s) => s.selectedProfileId);
  const selected =
    profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;

  return (
    <div className="flex h-full w-full flex-col bg-neutral-950 text-sm text-neutral-100">
      <HostPermissionBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <ProfilePanel key={selected.id} profile={selected} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-400">
              <p>No profiles yet.</p>
              <button
                onClick={() => actions.addProfile()}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:bg-neutral-800"
              >
                Create a profile
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
