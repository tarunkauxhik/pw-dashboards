"use client";

import { Switch } from "@/components/ui/switch";

export function IncludeAdminToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      label="Include ADMIN & PW_PLAN"
    />
  );
}
