// Import runs in a regular extension tab instead of the popup on Firefox:
// the popup closes when the native file picker opens, killing an in-popup
// import before the chosen file is delivered. This tab survives the picker.
import { parseProfile } from "@/lib/profile-io";
import { importProfileToStorage } from "@/lib/store";
import "./style.css";

const input = document.getElementById("file") as HTMLInputElement;
const status = document.getElementById("status") as HTMLParagraphElement;

input.addEventListener("change", async () => {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const profile = parseProfile(await file.text());
    await importProfileToStorage(profile);
    status.textContent = `Imported “${profile.name || "Untitled"}”.`;
    status.className = "min-h-5 text-green-400";
  } catch {
    status.textContent = `${file.name} is not a valid profile JSON file.`;
    status.className = "min-h-5 text-red-400";
  }
});
