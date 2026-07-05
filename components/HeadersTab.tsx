import { useRef, useState } from "react";
import { actions } from "@/lib/store";
import type { HeaderEntry, Profile } from "@/lib/types";

export function HeadersTab({ profile }: { profile: Profile }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copyHeader(header: HeaderEntry) {
    await navigator.clipboard.writeText(header.value);
    setCopiedId(header.id);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <div className="space-y-1">
      {profile.headers.length > 0 && (
        <div className="grid grid-cols-[1.5rem_1fr_1.5fr_2rem_2rem] items-center gap-3 px-1 pb-1">
          <span />
          <span className="text-xs font-medium text-neutral-400">Header</span>
          <span className="text-xs font-medium text-neutral-400">Value</span>
          <span />
          <span />
        </div>
      )}

      {profile.headers.map((header) => (
        <div
          key={header.id}
          className="grid grid-cols-[1.5rem_1fr_1.5fr_2rem_2rem] items-center gap-3 px-1"
        >
          <input
            type="checkbox"
            checked={header.enabled}
            onChange={(e) =>
              actions.updateHeader(profile.id, header.id, {
                enabled: e.target.checked,
              })
            }
            title="Enable/disable this header"
            className="h-4 w-4 accent-blue-500"
          />
          <input
            type="text"
            value={header.name}
            placeholder="header-name"
            spellCheck={false}
            onChange={(e) =>
              actions.updateHeader(profile.id, header.id, {
                name: e.target.value,
              })
            }
            className="border-b border-neutral-700 bg-transparent px-1 py-1.5 font-mono text-xs outline-none placeholder:text-neutral-600 focus:border-blue-500"
          />
          <input
            type="text"
            value={header.value}
            placeholder="value"
            spellCheck={false}
            onChange={(e) =>
              actions.updateHeader(profile.id, header.id, {
                value: e.target.value,
              })
            }
            className="border-b border-neutral-700 bg-transparent px-1 py-1.5 font-mono text-xs outline-none placeholder:text-neutral-600 focus:border-blue-500"
          />
          <button
            onClick={() => void copyHeader(header)}
            title="Copy value to clipboard"
            className={`rounded-md py-1 ${
              copiedId === header.id
                ? "text-green-400"
                : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            {copiedId === header.id ? "✓" : "⧉"}
          </button>
          <button
            onClick={() => actions.deleteHeader(profile.id, header.id)}
            title="Delete header"
            className="rounded-md py-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={() => actions.addHeader(profile.id)}
        title="Add header"
        className="mt-3 rounded-md border border-neutral-700 px-6 py-1 text-neutral-300 hover:bg-neutral-800"
      >
        +
      </button>
    </div>
  );
}
