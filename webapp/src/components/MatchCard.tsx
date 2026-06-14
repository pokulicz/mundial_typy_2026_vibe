import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Check, Clock, MapPin, ChevronRight, CircleCheck, Users, Coins, X } from "lucide-react";
import type { MatchDTO, PredictionDTO, PredictionStats } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";
import { formatTime, formatDay, timeUntil } from "@/lib/format";
import { Flag } from "./Flag";
import { ScoreStepper } from "./ScoreStepper";
import { Button } from "@/components/ui/button";
import { useSubmitPrediction, useDeletePrediction, useMatchStats } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MatchCardProps {
  match: MatchDTO;
  myPrediction?: PredictionDTO | null;
}

export function MatchCard({ match, myPrediction }: MatchCardProps) {
  const [home, setHome] = useState<number | null>(myPrediction?.homeScore ?? null);
  const [away, setAway] = useState<number | null>(myPrediction?.awayScore ?? null);
  const submit = useSubmitPrediction();
  const remove = useDeletePrediction();
  // Stats only matter while the match is open for typing.
  const { data: stats } = useMatchStats(match.id, !match.locked);

  useEffect(() => {
    setHome(myPrediction?.homeScore ?? null);
    setAway(myPrediction?.awayScore ?? null);
  }, [myPrediction?.homeScore, myPrediction?.awayScore]);

  const locked = match.locked;
  const dirty =
    home !== (myPrediction?.homeScore ?? null) || away !== (myPrediction?.awayScore ?? null);
  const canSave = home !== null && away !== null && dirty && !locked;

  const hit =
    match.finished &&
    myPrediction &&
    myPrediction.homeScore === match.homeScore &&
    myPrediction.awayScore === match.awayScore;

  const handleSave = () => {
    if (home === null || away === null) return;
    submit.mutate(
      { matchId: match.id, homeScore: home, awayScore: away },
      {
        onSuccess: () => toast.success("Typ zapisany!"),
        onError: (e: Error) => toast.error(e.message || "Nie udało się zapisać"),
      }
    );
  };

  const handleCancel = () => {
    remove.mutate(match.id, {
      onSuccess: () => {
        setHome(null);
        setAway(null);
        toast.success("Typ anulowany");
      },
      onError: (e: Error) => toast.error(e.message || "Nie udało się anulować"),
    });
  };

  const cardBg =
    match.status === "LIVE"
      ? "bg-red-950/20 border-red-500/30"
      : match.status === "FINISHED"
        ? "bg-green-950/20 border-green-500/30"
        : match.locked
          ? "bg-gray-800/20 border-gray-600/30"
          : "bg-blue-950/20 border-blue-500/30";

  return (
    <div className={cn("glass-card sheen rounded-2xl p-4 transition-colors hover:border-border border", cardBg)}>
      {/* header row */}
      <div className="mb-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded-md bg-secondary px-2 py-0.5 font-semibold text-foreground/90">
            {PHASE_LABELS[match.phase]}
            {match.groupName ? ` · Gr. ${match.groupName}` : ""}
          </span>
          <span className="font-score">{formatDay(match.kickoff)}</span>
        </div>
        <StatusPill match={match} />
      </div>

      {/* teams + scores */}
      <div className="flex items-start justify-between gap-2">
        {/* Home */}
        <TeamSide code={match.homeCode} name={match.homeTeam} />

        {/* Center: score inputs or result */}
        <div className="flex shrink-0 flex-col items-center px-1 pt-1">
          {locked ? (
            <LockedScore match={match} myPrediction={myPrediction ?? null} />
          ) : (
            <div className="flex items-center gap-2">
              <ScoreStepper value={home} onChange={setHome} ariaLabel={match.homeTeam} />
              <span className="font-score pb-0 text-2xl text-muted-foreground">:</span>
              <ScoreStepper value={away} onChange={setAway} ariaLabel={match.awayTeam} />
            </div>
          )}
        </div>

        {/* Away */}
        <TeamSide code={match.awayCode} name={match.awayTeam} />
      </div>

      {/* footer */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{match.city ?? "—"}</span>
          {!locked && match.kickoff ? (
            <span className="ml-1 shrink-0 text-primary/80">· {timeUntil(match.kickoff)}</span>
          ) : null}
        </div>

        {locked ? (
          <div className="flex items-center gap-2">
            {match.finished && myPrediction ? (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold",
                  hit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}
              >
                {hit ? <CircleCheck className="h-3.5 w-3.5" /> : null}
                {hit ? "Trafiony!" : "Pudło"}
              </span>
            ) : null}
            <Link to={`/mecz/${match.id}`}>
              <Button variant="secondary" size="sm" className="h-8">
                Szczegóły <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {myPrediction ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                disabled={remove.isPending || submit.isPending}
                onClick={handleCancel}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Anuluj
              </Button>
            ) : null}
            <Button
              size="sm"
              className={cn(
                "h-8 font-semibold",
                myPrediction && !dirty && "bg-success text-success-foreground hover:bg-success/90"
              )}
              disabled={!canSave || submit.isPending}
              onClick={handleSave}
            >
              {myPrediction && !dirty ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" /> Zapisano
                </>
              ) : (
                "Zapisz typ"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* open-match stats: ile typów + pula, and how many share your score */}
      {!locked && stats ? <StatsBar stats={stats} hasPrediction={!!myPrediction} /> : null}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function StatsBar({ stats, hasPrediction }: { stats: PredictionStats; hasPrediction: boolean }) {
  const same = stats.sameScore;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3 shrink-0" />
        {stats.total > 0
          ? `${stats.total} ${plural(stats.total, "typ", "typy", "typów")}`
          : "Brak typów — bądź pierwszy!"}
      </span>
      <span className="flex items-center gap-1">
        <Coins className="h-3 w-3 shrink-0" />
        Pula {stats.pool} pkt
      </span>
      {hasPrediction && same !== null ? (
        same > 1 ? (
          <span className="flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
            Ten wynik został już postawiony przez {same} graczy (razem z Tobą)
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 font-semibold text-foreground/80">
            Na razie nikt inny tego wyniku nie postawił
          </span>
        )
      ) : null}
    </div>
  );
}

function TeamSide({ code, name }: { code: string | null; name: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <Flag code={code} name={name} className="h-8 w-11 shrink-0" />
      <span className="text-xs font-bold leading-tight md:text-sm">{name}</span>
    </div>
  );
}

function StatusPill({ match }: { match: MatchDTO }) {
  if (match.status === "LIVE") {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-destructive/15 px-2 py-0.5 font-bold text-destructive">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
        </span>
        NA ŻYWO
      </span>
    );
  }
  if (match.settled) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 font-semibold text-success">
        <Check className="h-3 w-3" /> Rozliczony
      </span>
    );
  }
  if (match.status === "FINISHED") {
    return (
      <span className="rounded-md bg-warning/15 px-2 py-0.5 font-semibold text-warning">
        Zakończony
      </span>
    );
  }
  if (match.status === "AWAITING") {
    return (
      <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
        <Lock className="h-3 w-3" /> Czeka na wynik
      </span>
    );
  }
  if (match.locked) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
        <Lock className="h-3 w-3" /> Zamknięte
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 font-semibold text-primary">
      <Clock className="h-3 w-3" /> {formatTime(match.kickoff)}
    </span>
  );
}

function LockedScore({
  match,
  myPrediction,
}: {
  match: MatchDTO;
  myPrediction: PredictionDTO | null;
}) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const isLive = match.status === "LIVE";

  return (
    <div className="flex flex-col items-center">
      <div className="font-score text-3xl font-bold">
        {hasResult ? (
          `${match.homeScore} : ${match.awayScore}`
        ) : isLive ? (
          <span className="text-lg animate-pulse">● ● ●</span>
        ) : (
          "– : –"
        )}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {hasResult ? (
          myPrediction ? `Twój typ ${myPrediction.homeScore}:${myPrediction.awayScore}` : "Brak typu"
        ) : isLive ? (
          "Mecz w trakcie"
        ) : (
          myPrediction ? `Twój typ ${myPrediction.homeScore}:${myPrediction.awayScore}` : "Brak typu"
        )}
      </div>
    </div>
  );
}
