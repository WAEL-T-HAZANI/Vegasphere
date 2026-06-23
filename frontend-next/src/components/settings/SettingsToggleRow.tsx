"use client";

import PrivacyToggle from "@/components/privacy/PrivacyToggle";

type SettingsToggleRowProps = {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export default function SettingsToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: SettingsToggleRowProps) {
  return (
    <div className="vs-list-row justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs font-medium leading-relaxed text-muted">
            {hint}
          </span>
        ) : null}
      </span>
      <PrivacyToggle
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
