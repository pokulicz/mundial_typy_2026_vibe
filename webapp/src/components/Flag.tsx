import { cn } from "@/lib/utils";

interface FlagProps {
  code: string | null;
  name: string;
  className?: string;
}

// Renders a country flag from flagcdn.com, with a graceful fallback for TBD teams.
export function Flag({ code, name, className }: FlagProps) {
  if (!code) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded bg-muted text-muted-foreground text-[10px] font-bold",
          className
        )}
        aria-label={name}
      >
        ?
      </div>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={name}
      loading="lazy"
      className={cn("rounded object-cover shadow-sm ring-1 ring-black/30", className)}
    />
  );
}
