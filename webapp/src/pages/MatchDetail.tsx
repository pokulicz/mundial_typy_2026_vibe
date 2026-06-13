import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Lock, Eye, EyeOff, CircleCheck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Flag } from "@/components/Flag";
import { MatchCard } from "@/components/MatchCard";
import {
  useMatch,
  useMatchPredictions,
  useSettlement,
  useMyPredictions,
} from "@/lib/queries";
import { PHASE_LABELS } from "@/lib/types";
import { formatFull, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: match, isPending } = useMatch(id);
  const { data: myPreds } = useMyPredictions();
  const myPred = useMemo(
    () => (myPreds ?? []).find((p) => p.matchId === id) ?? null,
    [myPreds, id]
  );

  const locked = match?.locked ?? false;
  const { data: allPredictions } = useMatchPredictions(id, locked);
  const { data: settlement } = useSettlement(id, match?.settled ?? false);

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć
      </button>

      {isPending || !match ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="space-y-5">
          {/* Hero */}
          <div className="glass-card sheen overflow-hidden rounded-2xl">
            <div className="border-b border-border/60 bg-secondary/30 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {PHASE_LABELS[match.phase]}
              {match.groupName ? ` · Grupa ${match.groupName}` : ""}
            </div>
            <div className="grid grid-cols-3 items-center gap-2 px-4 py-6">
              <TeamBig code={match.homeCode} name={match.homeTeam} />
              <div className="flex flex-col items-center">
                {match.homeScore !== null && match.awayScore !== null ? (
                  <div className="font-score text-4xl font-bold md:text-5xl">
                    {match.homeScore}:{match.awayScore}
                  </div>
                ) : (
                  <div className="font-score text-3xl font-bold text-muted-foreground">vs</div>
                )}
                <div className="mt-2 text-center text-[11px] text-muted-foreground">
                  {formatFull(match.kickoff)}
                </div>
              </div>
              <TeamBig code={match.awayCode} name={match.awayTeam} />
            </div>
            {match.venue ? (
              <div className="flex items-center justify-center gap-1.5 border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {match.venue}
                {match.city ? `, ${match.city}` : ""}
              </div>
            ) : null}
          </div>

          {/* Prediction box (only when open) */}
          {!locked ? (
            <div>
              <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Twój typ
              </h2>
              <MatchCard match={match} myPrediction={myPred} />
            </div>
          ) : null}

          {/* Settlement (if settled) */}
          {match.settled && settlement && settlement.length > 0 ? (
            <SettlementTable settlement={settlement} />
          ) : null}

          {/* Everyone's predictions */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {locked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Typy pozostałych graczy
              {locked && (allPredictions ?? []).length > 0 ? (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-foreground">
                  {(allPredictions ?? []).length}
                </span>
              ) : null}
            </h2>
            {!locked ? (
              <div className="glass-card flex items-center gap-3 rounded-xl p-4 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                Typy innych graczy zobaczysz dopiero po rozpoczęciu meczu.
              </div>
            ) : (allPredictions ?? []).length === 0 ? (
              <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground">
                Nikt nie wytypował tego meczu.
              </div>
            ) : (
              <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
                {(allPredictions ?? []).map((p) => {
                  const isHit =
                    match.homeScore !== null &&
                    p.homeScore === match.homeScore &&
                    p.awayScore === match.awayScore;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 transition-colors",
                        isHit && "bg-success/10"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.username}
                        {isHit ? (
                          <span className="flex items-center gap-1 rounded bg-success/20 px-1.5 py-0.5 text-[11px] font-bold text-success">
                            <CircleCheck className="h-3 w-3" /> Trafiony
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "font-score text-base font-bold",
                          isHit ? "text-success" : "text-foreground"
                        )}
                      >
                        {p.homeScore}:{p.awayScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}

function TeamBig({ code, name }: { code: string | null; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Flag code={code} name={name} className="h-12 w-16" />
      <span className="text-sm font-bold leading-tight md:text-base">{name}</span>
    </div>
  );
}

function SettlementTable({
  settlement,
}: {
  settlement: { userId: string; username: string; homeScore: number; awayScore: number; hit: boolean; points: number }[];
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Rozliczenie meczu
      </h2>
      <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
        {settlement.map((e) => (
          <div key={e.userId} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {e.username}
              {e.hit ? <CircleCheck className="h-4 w-4 text-success" /> : null}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-score text-sm text-muted-foreground">
                {e.homeScore}:{e.awayScore}
              </span>
              <span
                className={cn(
                  "font-score w-14 text-right text-base font-bold",
                  e.points > 0 ? "text-success" : e.points < 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {formatPoints(e.points)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
