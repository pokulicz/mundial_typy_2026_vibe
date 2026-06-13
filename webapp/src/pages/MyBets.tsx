import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ListChecks, CircleCheck, CircleX, Lock, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useMatches, useMyPredictions, useInvalidateAll, useSettlement } from "@/lib/queries";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MatchDTO, PredictionDTO } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";
import { formatDay } from "@/lib/format";
import { Flag } from "@/components/Flag";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function MyBets() {
  const { data: matches, isPending } = useMatches();
  const { data: preds } = useMyPredictions();
  const invalidate = useInvalidateAll();

  const deleteAll = useMutation({
    mutationFn: () => api.delete("/api/predictions/mine"),
    onSuccess: () => {
      toast.success("Wszystkie typy usunięte");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const matchMap = useMemo(() => {
    const m = new Map<string, MatchDTO>();
    (matches ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [matches]);

  const rows = useMemo(() => {
    return (preds ?? [])
      .map((p) => ({ pred: p, match: matchMap.get(p.matchId) }))
      .filter((r): r is { pred: PredictionDTO; match: MatchDTO } => !!r.match)
      .sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime());
  }, [preds, matchMap]);

  const stats = useMemo(() => {
    let hits = 0;
    let settled = 0;
    rows.forEach((r) => {
      if (r.match.finished && r.match.homeScore !== null) {
        if (r.pred.homeScore === r.match.homeScore && r.pred.awayScore === r.match.awayScore)
          hits++;
      }
      if (r.match.settled) settled++;
    });
    return { total: rows.length, hits, settled };
  }, [rows]);

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="font-display text-2xl tracking-tight md:text-3xl">Moje typy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historia Twoich typów i ich wyniki.</p>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <ListChecks className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-display text-lg">Nie masz jeszcze typów</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Przejdź do zakładki Mecze i wytypuj pierwszy wynik.
          </p>
          <Link to="/" className="mt-4 text-sm font-semibold text-primary">
            Wytypuj mecz →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatBox label="Typów" value={stats.total} />
            <StatBox label="Trafionych" value={stats.hits} accent="success" />
            <StatBox label="Rozliczonych" value={stats.settled} />
          </div>
          <div className="space-y-2">
            {rows.map((r) => (
              <BetRow key={r.pred.id} match={r.match} pred={r.pred} />
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Usuń wszystkie typy
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć wszystkie typy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta czynność nie może być cofnięta. Wszystkie {stats.total} typów zostanie
                    usunięte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteAll.mutate()}
                    disabled={deleteAll.isPending}
                  >
                    {deleteAll.isPending ? "Usuwanie..." : "Usuń wszystko"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </Layout>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success";
}) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <div
        className={cn(
          "font-score text-2xl font-bold",
          accent === "success" ? "text-success" : "text-foreground"
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function BetRow({ match, pred }: { match: MatchDTO; pred: PredictionDTO }) {
  const hasResult = match.finished && match.homeScore !== null && match.awayScore !== null;
  const hit =
    hasResult && pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;

  const { data: settlement } = useSettlement(match.id, match.settled ?? false);
  const myPoints = settlement?.find((e) => e.homeScore === pred.homeScore && e.awayScore === pred.awayScore)?.points ?? null;

  return (
    <Link
      to={`/mecz/${match.id}`}
      className="glass-card sheen flex items-center gap-3 rounded-xl p-3 transition-colors hover:border-border"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{PHASE_LABELS[match.phase]}</span>
          <span className="font-score">{formatDay(match.kickoff)}</span>
          {!match.locked ? (
            <span className="ml-auto text-primary">otwarte</span>
          ) : !hasResult ? (
            <Lock className="ml-auto h-3 w-3" />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Flag code={match.homeCode} name={match.homeTeam} className="h-4 w-6 shrink-0" />
          <span className="truncate text-sm font-semibold">{match.homeTeam}</span>
          <span className="mx-1 text-xs text-muted-foreground">vs</span>
          <Flag code={match.awayCode} name={match.awayTeam} className="h-4 w-6 shrink-0" />
          <span className="truncate text-sm font-semibold">{match.awayTeam}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-score text-lg font-bold">
          {pred.homeScore}:{pred.awayScore}
        </div>
        {hasResult ? (
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center justify-end gap-1 text-[11px] font-semibold",
                hit ? "text-success" : "text-destructive"
              )}
            >
              {hit ? <CircleCheck className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
              wynik {match.homeScore}:{match.awayScore}
            </div>
            {match.settled && myPoints !== null && (
              <div
                className={cn(
                  "font-score text-sm font-bold",
                  myPoints > 0 ? "text-success" : myPoints < 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {myPoints > 0 ? "+" : ""}{myPoints} pkt
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">Twój typ</div>
        )}
      </div>
    </Link>
  );
}
