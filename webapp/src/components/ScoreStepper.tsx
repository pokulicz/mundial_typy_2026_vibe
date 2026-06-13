import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreStepperProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

// Compact, touch-friendly number stepper for goals (0–99).
export function ScoreStepper({ value, onChange, disabled, ariaLabel }: ScoreStepperProps) {
  const v = value ?? 0;
  const set = (n: number) => onChange(Math.max(0, Math.min(99, n)));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => set(v + 1)}
        className={cn(
          "flex h-8 w-10 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-30",
        )}
        aria-label={`${ariaLabel} +1`}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </button>
      <div
        className={cn(
          "font-score flex h-14 w-14 items-center justify-center rounded-xl border text-3xl font-bold tabular-nums",
          value === null
            ? "border-dashed border-border text-muted-foreground"
            : "border-primary/40 bg-primary/10 text-foreground"
        )}
      >
        {value === null ? "–" : v}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => set(v - 1)}
        className="flex h-8 w-10 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-30"
        aria-label={`${ariaLabel} -1`}
      >
        <Minus className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}
