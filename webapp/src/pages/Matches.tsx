import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, Inbox } from "lucide-react";
import { Layout } from "@/components/Layout";
import { MatchCard } from "@/components/MatchCard";
import { useMatches, useMyPredictions } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { MatchDTO, Phase, PredictionDTO } from "@/lib/types";
import { PHASE_LABELS, PHASE_ORDER } from "@/lib/types";
import { formatDay, dayKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type FilterKey = "OPEN" | "LIVE" | "RESULTS" | "ALL" | Phase;

export default function Matches() {
  const { data: matches, isPending } = useMatches();
  const { data: myPreds } = useMyPredictions();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("OPEN");

  const predMap = useMemo(() => {
    const m = new Map<string, PredictionDTO>();
    (myPreds ?? []).forEach((p) => m.set(p.matchId, p));
    return m;
  }, [myPreds]);

  const availablePhases = useMemo(() => {
    const set = new Set<Phase>();
    (matches ?? []).forEach((m) => set.add(m.phase));
    return PHASE_ORDER.filter((p) => set.has(p));
  }, [matches]);

  const liveCount = useMemo(
    () => (matches ?? []).filter((m) => m.status === "LIVE").length,
    [matches]
  );

  const filtered = useMemo(() => {
    let list = matches ?? [];
    if (filter === "OPEN") list = list.filter((m) => !m.locked);
    else if (filter === "LIVE") list = list.filter((m) => m.status === "LIVE");
    else if (filter === "RESULTS")
      list = [...list]
        .filter((m) => m.status === "FINISHED")
        .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());
    else if (filter !== "ALL") list = list.filter((m) => m.phase === filter);
    return list;
  }, [matches, filter]);

  // group by day
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; iso: string; items: MatchDTO[] }>();
    for (const m of filtered) {
      const k = dayKey(m.kickoff);
      if (!map.has(k)) map.set(k, { label: formatDay(m.kickoff), iso: m.kickoff, items: [] });
      map.get(k)!.items.push(m);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <Layout>
      <PageHeader />

      {/* Filter rail */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={filter === "OPEN"} onClick={() => setFilter("OPEN")}>
          Otwarte
        </Chip>
        {liveCount > 0 ? (
          <Chip active={filter === "LIVE"} onClick={() => setFilter("LIVE")}>
            <span className="relative mr-1.5 inline-flex h-2 w-2 align-middle">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Na żywo ({liveCount})
          </Chip>
        ) : null}
        <Chip active={filter === "RESULTS"} onClick={() => setFilter("RESULTS")}>
          Wyniki
        </Chip>
        <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          Wszystkie
        </Chip>
        {availablePhases.map((p) => (
          <Chip key={p} active={filter === p} onClick={() => setFilter(p)}>
            {PHASE_LABELS[p]}
          </Chip>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : (matches ?? []).length === 0 ? (
        <EmptyState isAdmin={isAdmin} />
      ) : groups.length === 0 ? (
        <NoMatchesForFilter />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.iso}>
              <h2 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {g.label}
              </h2>
              <div className="space-y-3">
                {g.items.map((m) => (
                  <MatchCard key={m.id} match={m} myPrediction={predMap.get(m.id) ?? null} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  );
}

function PageHeader() {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl tracking-tight md:text-3xl">Terminarz i typy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Wytypuj dokładny wynik. Po gwizdku sędziego typowanie się zamyka.
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="glass-card mt-4 flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-lg">Brak meczów w terminarzu</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {isAdmin
          ? "Zaimportuj pełny terminarz Mundialu 2026 w panelu administratora."
          : "Administrator nie dodał jeszcze meczów. Wróć później."}
      </p>
      {isAdmin ? (
        <Link to="/admin/mecze" className="mt-4">
          <Button>Przejdź do importu terminarza</Button>
        </Link>
      ) : null}
    </div>
  );
}

function NoMatchesForFilter() {
  return (
    <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <CalendarX2 className="mb-3 h-9 w-9 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Brak meczów dla wybranego filtra.</p>
    </div>
  );
}
