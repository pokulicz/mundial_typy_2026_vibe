import { Trophy, Target, Crown, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useRanking } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { RankRow } from "@/lib/types";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function calculateStats(row: RankRow) {
  const mistakes = row.settledMatches - row.hits;
  const accuracy = row.settledMatches > 0 ? Math.round((row.hits / row.settledMatches) * 100) : 0;
  const avgPerMatch = row.settledMatches > 0 ? (row.balance / row.settledMatches).toFixed(1) : "0.0";
  return { mistakes, accuracy, avgPerMatch };
}

export default function Ranking() {
  const { data: rows, isPending } = useRanking();
  const { user } = useAuth();

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="font-display text-2xl tracking-tight md:text-3xl">Ranking ligi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liczy się tylko dokładny wynik. Poprawnie typujący dzielą pulę przegranych.
        </p>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="glass-card rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">
          Brak graczy w rankingu.
        </div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((row) => (
            <RankCard key={row.userId} row={row} isMe={row.userId === user?.id} />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Jak liczone są punkty?</p>
        Każdy mecz to pula po 2 pkt od typujących. Jeśli ktoś trafi dokładny wynik —
        przegrani tracą po 2 pkt, a poprawnie typujący dzielą się ich pulą. Jeśli nikt nie trafi,
        nikt nie zyskuje ani nie traci.
      </div>
    </Layout>
  );
}

function RankCard({ row, isMe }: { row: RankRow; isMe: boolean }) {
  const positive = row.balance > 0;
  const negative = row.balance < 0;
  const { mistakes, accuracy, avgPerMatch } = calculateStats(row);

  return (
    <div
      className={cn(
        "glass-card sheen rounded-xl p-3 transition-colors",
        isMe && "border-primary/50 bg-primary/5"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        <RankBadge rank={row.rank} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{row.username}</span>
            {isMe ? (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                Ty
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" /> {row.hits} / {row.predictions}
            </span>
            <span className="text-success">
              <TrendingUp className="inline h-3 w-3" /> {accuracy}%
            </span>
            <span>Ø {avgPerMatch} pkt</span>
          </div>
        </div>

        <div
          className={cn(
            "font-score shrink-0 text-right text-xl font-bold tabular-nums",
            positive && "text-success",
            negative && "text-destructive",
            !positive && !negative && "text-muted-foreground"
          )}
        >
          {formatPoints(row.balance)}
          <span className="ml-1 text-[10px] font-semibold uppercase text-muted-foreground">pkt</span>
        </div>
      </div>

      {/* Detailed stats row */}
      <div className="mt-2 flex gap-4 border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-success">✓ {row.hits}</span> poprawne
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-destructive">✕ {mistakes}</span> błędne
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-primary">◷ {row.openPredictions}</span> otwartych
        </div>
        <div className="ml-auto flex items-center gap-1">
          {row.settledMatches} rozliczonych
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medals: { [key: number]: string } = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };

  const medal = medals[rank];
  const bgColor =
    rank === 1
      ? "bg-gold/20 ring-gold/40"
      : rank === 2
      ? "bg-zinc-300/15 ring-zinc-300/30"
      : rank === 3
      ? "bg-amber-700/20 ring-amber-700/40"
      : "bg-secondary ring-transparent";

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ring-1",
        bgColor
      )}
    >
      {medal || <span className="font-score font-bold text-muted-foreground">{rank}</span>}
    </div>
  );
}
