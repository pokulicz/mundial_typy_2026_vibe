import { RefreshCw, Crown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { useRanking, useInvalidateAll } from "@/lib/queries";
import { api } from "@/lib/api";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminRanking() {
  const { data: rows, isPending } = useRanking();
  const invalidate = useInvalidateAll();

  const recompute = useMutation({
    mutationFn: () => api.post("/api/settle/recompute", {}),
    onSuccess: (data: unknown) => {
      const d = data as { settled: number };
      toast.success(`Przeliczono ranking (${d.settled} meczów)`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout title="Ranking" description="Pełny ranking i przeliczenie punktów.">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={cn("mr-2 h-4 w-4", recompute.isPending && "animate-spin")} />
          Przelicz cały ranking
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
          {(rows ?? []).map((row) => (
            <div key={row.userId} className="flex items-center gap-3 px-4 py-3">
              <div
                className={cn(
                  "font-score flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                  row.rank === 1 ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"
                )}
              >
                {row.rank === 1 ? <Crown className="h-4 w-4" /> : row.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{row.username}</div>
                <div className="text-[11px] text-muted-foreground">
                  {row.hits} trafień · {row.predictions} typów · {row.settledMatches} rozlicz.
                </div>
              </div>
              <div
                className={cn(
                  "font-score text-lg font-bold tabular-nums",
                  row.balance > 0 ? "text-success" : row.balance < 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {formatPoints(row.balance)}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
