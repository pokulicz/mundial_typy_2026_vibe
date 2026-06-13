import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useMatches, useUsers, useAdminPredictions } from "@/lib/queries";
import { PHASE_LABELS } from "@/lib/types";
import { formatDay } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPredictions() {
  const { data: matches } = useMatches();
  const { data: users } = useUsers();
  const [matchId, setMatchId] = useState<string>("ALL");
  const [userId, setUserId] = useState<string>("ALL");

  const { data: rows, isPending } = useAdminPredictions({
    matchId: matchId === "ALL" ? undefined : matchId,
    userId: userId === "ALL" ? undefined : userId,
  });

  return (
    <AdminLayout title="Typy graczy" description="Podgląd wszystkich typów z filtrowaniem.">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
            Mecz
          </label>
          <Select value={matchId} onValueChange={setMatchId}>
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie mecze" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">Wszystkie mecze</SelectItem>
              {(matches ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.homeTeam} – {m.awayTeam} ({formatDay(m.kickoff)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
            Gracz
          </label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Wszyscy gracze" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">Wszyscy gracze</SelectItem>
              {(users ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="glass-card rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
          Brak typów dla wybranych filtrów.
        </div>
      ) : (
        <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
          {(rows ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{r.username}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.homeTeam} – {r.awayTeam} · {formatDay(r.kickoff)}
                </div>
              </div>
              <div className="font-score shrink-0 text-lg font-bold">
                {r.homeScore}:{r.awayScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
