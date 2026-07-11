import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // Both targets build as MV3 (WXT would otherwise default Firefox to MV2,
  // where the action API and this codebase don't work).
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: "Ghillie Up",
    description: "Modify HTTP request headers per profile, per site.",
    permissions: ["storage", "declarativeNetRequest", "downloads"],
    host_permissions: ["<all_urls>"],
    // Firefox-only keys; Chrome warns on unknown manifest keys, so keep them
    // out of Chrome builds.
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          // Must match the extension ID of the AMO listing.
          id: "ghillie-up@kinowashere.github.io",
          // Floor for `data_collection_permissions` (140 desktop / 142
          // Android); everything else used (DNR, MV3 action) needs far less.
          strict_min_version: "140.0",
          // AMO requires a data-collection declaration for new submissions.
          data_collection_permissions: { required: ["none"] },
        },
        gecko_android: {
          strict_min_version: "142.0",
        },
      },
    }),
  }),
});
