import { useEffect, useState } from "react";
import { browser } from "#imports";
import { HOST_PERMISSION } from "@/lib/types";

const HOST_ORIGINS = { origins: [HOST_PERMISSION] };

// Chrome grants <all_urls> at install, so this never renders there. Firefox
// (MV3) treats host permissions as optional: the user can decline them at
// install or revoke them later, and DNR rules silently stop matching without
// them. Surface that state and offer a one-click grant.
export function HostPermissionBanner() {
  const [granted, setGranted] = useState(true);

  useEffect(() => {
    void browser.permissions.contains(HOST_ORIGINS).then(setGranted);
  }, []);

  if (granted) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-900/60 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">
      <span className="flex-1">
        Ghillie Up has no access to sites, so no headers are being modified.
      </span>
      <button
        onClick={() =>
          // permissions.request must be called from a user gesture handler.
          void browser.permissions.request(HOST_ORIGINS).then(setGranted)
        }
        className="shrink-0 rounded-md border border-amber-700 px-2.5 py-1 text-amber-100 hover:bg-amber-900/40"
      >
        Grant access
      </button>
    </div>
  );
}
