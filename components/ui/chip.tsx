import { Plus } from "lucide-react";

type ChipProps = {
  label: string;
  onClick?: () => void;
};

export function Chip({ label, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-panel px-2.5 text-[13px] font-medium leading-none text-ink"
    >
      {label}
      <Plus className="size-3" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
