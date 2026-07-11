interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}

export function Switch({ checked, onChange, title }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-blue-500" : "bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}
