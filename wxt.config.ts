import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Ghillie Up",
    description: "Modify HTTP request headers per profile, per site.",
    permissions: ["storage", "declarativeNetRequest", "downloads"],
    host_permissions: ["<all_urls>"],
  },
});
