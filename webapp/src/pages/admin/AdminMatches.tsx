import { useMemo, useState, useEffect } from "react";
import {
  Download,
  Upload,
  Trophy,
  Lock,
  Unlock,
  Trash2,
  Pencil,
  Calculator,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { useMatches, useInvalidateAll } from "@/lib/queries";
import { api } from "@/lib/api";
import type { MatchDTO, Phase } from "@/lib/types";
import { PHASE_LABELS, PHASE_ORDER } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/format";
import { Flag } from "@/components/Flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminMatches() {
  const { data: matches, isPending } = useMatches();
  const [filter, setFilter] = useState<"ALL" | Phase>("ALL");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<1 | 5 | 10 | 15>(() => {
    const saved = localStorage.getItem("autoRefreshInterval");
    return saved ? (Number(saved) as 1 | 5 | 10 | 15) : 1;
  });
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    return localStorage.getItem("autoRefreshEnabled") === "true";
  });
  const invalidate = useInvalidateAll();

  const refresh = useMutation({
    mutationFn: () => api.post("/api/matches/refresh-results", {}),
    onSuccess: (data: unknown) => {
      const d = data as { fetched: number; updated: number; settled: number };
      if (d.updated > 0) {
        toast.success(`Zaktualizowano ${d.updated} wyników i rozliczono ${d.settled} meczów`);
      } else {
        toast.success(`Brak nowych wyników (sprawdzono ${d.fetched}).`);
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Save auto-refresh settings to localStorage
  useEffect(() => {
    localStorage.setItem("autoRefreshEnabled", String(autoRefreshEnabled));
  }, [autoRefreshEnabled]);

  useEffect(() => {
    localStorage.setItem("autoRefreshInterval", String(autoRefreshInterval));
  }, [autoRefreshInterval]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const intervalMs = autoRefreshInterval * 60 * 1000;
    const timer = setInterval(() => {
      refresh.mutate();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, autoRefreshInterval, refresh]);

  const phases = useMemo(() => {
    const set = new Set<Phase>();
    (matches ?? []).forEach((m) => set.add(m.phase));
    return PHASE_ORDER.filter((p) => set.has(p));
  }, [matches]);

  const filtered = (matches ?? []).filter((m) => filter === "ALL" || m.phase === filter);

  return (
    <AdminLayout title="Mecze" description="Import terminarza, wyniki i rozliczenia.">
      <ImportBar hasMatches={(matches ?? []).length > 0} />

      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold">Automatyczne wyniki</div>
            <div className="text-xs text-muted-foreground">
              Pobiera wyniki rozegranych meczów grupowych z internetu i rozlicza je automatycznie.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refresh.isPending && "animate-spin")} />
            {refresh.isPending ? "Pobieranie..." : "Pobierz teraz"}
          </Button>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="h-4 w-4 accent-success rounded"
              />
              <span className="font-semibold">Automatycznie co</span>
            </label>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value) as 1 | 5 | 10 | 15)}
              disabled={!autoRefreshEnabled}
              className="rounded border border-border bg-card px-2 py-1 text-sm font-semibold disabled:opacity-50"
            >
              <option value={1}>1 min</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>
          {autoRefreshEnabled ? (
            <span className="text-xs font-semibold text-success">● Włączony</span>
          ) : null}
        </div>
      </div>

      {(matches ?? []).length > 0 ? (
        <div className="no-scrollbar -mx-4 mb-4 mt-5 flex gap-2 overflow-x-auto px-4">
          <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            Wszystkie ({matches?.length})
          </FilterChip>
          {phases.map((p) => (
            <FilterChip key={p} active={filter === p} onClick={() => setFilter(p)}>
              {PHASE_LABELS[p]}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (matches ?? []).length === 0 ? (
        <div className="glass-card mt-4 rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
          Brak meczów. Zaimportuj terminarz Mundialu 2026 powyżej.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <AdminMatchRow key={m.id} match={m} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function FilterChip({
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
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ImportBar({ hasMatches }: { hasMatches: boolean }) {
  const invalidate = useInvalidateAll();

  const importWC = useMutation({
    mutationFn: (replaceAll: boolean) =>
      api.post(`/api/matches/import-worldcup-2026?replaceAll=${replaceAll}`, {}),
    onSuccess: (data: unknown) => {
      const d = data as { created: number };
      toast.success(`Zaimportowano ${d.created} meczów`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-card sheen flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold">Terminarz Mundialu 2026</div>
          <div className="text-xs text-muted-foreground">
            104 mecze: faza grupowa + pełna drabinka pucharowa.
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <CsvJsonImport />
        {hasMatches ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary">
                <Download className="mr-2 h-4 w-4" /> Importuj ponownie
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Nadpisać cały terminarz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Usunie to obecne mecze (wraz z typami i punktami) i wczyta terminarz od nowa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={() => importWC.mutate(true)}>
                  Nadpisz
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={() => importWC.mutate(false)} disabled={importWC.isPending}>
            <Download className="mr-2 h-4 w-4" />
            {importWC.isPending ? "Importowanie..." : "Importuj terminarz"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CsvJsonImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);
  const invalidate = useInvalidateAll();

  const doImport = useMutation({
    mutationFn: (matches: unknown[]) => api.post("/api/matches/import", { matches, replaceAll }),
    onSuccess: (data: unknown) => {
      const d = data as { created: number };
      toast.success(`Zaimportowano ${d.created} meczów`);
      invalidate();
      setOpen(false);
      setText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = () => {
    try {
      const matches = parseImport(text);
      if (matches.length === 0) {
        toast.error("Nie znaleziono meczów do importu");
        return;
      }
      doImport.mutate(matches);
    } catch (e) {
      toast.error((e as Error).message || "Błąd parsowania danych");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="mr-2 h-4 w-4" /> CSV / JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import z CSV lub JSON</DialogTitle>
          <DialogDescription className="text-xs">
            CSV z nagłówkami: phase,groupName,homeTeam,awayTeam,homeCode,awayCode,kickoff,venue,city.
            Lub tablica JSON o tych samych polach. kickoff w formacie ISO (2026-06-11T16:00:00Z).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={`phase,homeTeam,awayTeam,kickoff\nGROUP,Polska,Niemcy,2026-06-15T16:00:00Z`}
          className="font-mono text-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Zastąp wszystkie istniejące mecze
        </label>
        <DialogFooter>
          <Button onClick={handleImport} disabled={doImport.isPending || !text.trim()}>
            {doImport.isPending ? "Importowanie..." : "Importuj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseImport(text: string): unknown[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  // CSV
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const val = (cells[i] ?? "").trim();
      if (val !== "") obj[h] = val;
    });
    if (!obj.phase) obj.phase = "GROUP";
    return obj;
  });
}

function AdminMatchRow({ match }: { match: MatchDTO }) {
  const invalidate = useInvalidateAll();
  const [home, setHome] = useState<string>(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState<string>(match.awayScore?.toString() ?? "");

  const saveResult = useMutation({
    mutationFn: () =>
      api.put(`/api/matches/${match.id}/result`, {
        homeScore: Number(home),
        awayScore: Number(away),
        finished: true,
      }),
    onSuccess: () => {
      toast.success("Wynik zapisany");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settle = useMutation({
    mutationFn: () => api.post(`/api/settle/match/${match.id}`, {}),
    onSuccess: (data: unknown) => {
      const d = data as { entries: { hit: boolean }[] };
      const hits = d.entries.filter((e) => e.hit).length;
      toast.success(`Rozliczono mecz — ${hits} trafień`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unsettle = useMutation({
    mutationFn: () => api.post(`/api/settle/match/${match.id}/unsettle`, {}),
    onSuccess: () => {
      toast.success("Cofnięto rozliczenie");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLock = useMutation({
    mutationFn: () => api.patch(`/api/matches/${match.id}`, { lockOverride: !match.lockOverride }),
    onSuccess: () => {
      toast.success(match.lockOverride ? "Odblokowano typowanie" : "Zablokowano typowanie");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/matches/${match.id}`),
    onSuccess: () => {
      toast.success("Usunięto mecz");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resultDirty =
    home !== (match.homeScore?.toString() ?? "") || away !== (match.awayScore?.toString() ?? "");
  const canSaveResult = home !== "" && away !== "" && resultDirty;

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground/80">
          {PHASE_LABELS[match.phase]}
          {match.groupName ? ` · Gr. ${match.groupName}` : ""}
        </span>
        <span className="font-score">
          {formatDay(match.kickoff)} {formatTime(match.kickoff)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Flag code={match.homeCode} name={match.homeTeam} className="h-5 w-7 shrink-0" />
          <span className="truncate text-sm font-bold">{match.homeTeam}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Input
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            inputMode="numeric"
            className="h-9 w-11 px-0 text-center font-score text-base"
            placeholder="-"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            inputMode="numeric"
            className="h-9 w-11 px-0 text-center font-score text-base"
            placeholder="-"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
          <Flag code={match.awayCode} name={match.awayTeam} className="h-5 w-7 shrink-0" />
          <span className="truncate text-sm font-bold">{match.awayTeam}</span>
        </div>
      </div>

      {/* status + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        {match.settled ? (
          <span className="rounded bg-success/15 px-2 py-0.5 text-[11px] font-bold uppercase text-success">
            Rozliczony
          </span>
        ) : match.finished ? (
          <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase text-warning">
            Zakończony
          </span>
        ) : match.locked ? (
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">
            Zamknięty
          </span>
        ) : (
          <span className="rounded bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase text-primary">
            Otwarty
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {canSaveResult ? (
            <Button size="sm" className="h-8" onClick={() => saveResult.mutate()} disabled={saveResult.isPending}>
              Zapisz wynik
            </Button>
          ) : null}

          {match.homeScore !== null && !match.settled ? (
            <Button size="sm" className="h-8" variant="secondary" onClick={() => settle.mutate()} disabled={settle.isPending}>
              <Calculator className="mr-1 h-3.5 w-3.5" /> Rozlicz
            </Button>
          ) : null}

          {match.settled ? (
            <Button size="sm" className="h-8" variant="secondary" onClick={() => settle.mutate()} disabled={settle.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Przelicz
            </Button>
          ) : null}

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={match.lockOverride ? "Odblokuj typowanie" : "Zablokuj typowanie"}
            onClick={() => toggleLock.mutate()}
          >
            {match.lockOverride ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>

          <EditMatchDialog match={match} />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć mecz?</AlertDialogTitle>
                <AlertDialogDescription>
                  {match.homeTeam} vs {match.awayTeam}. Usunie też powiązane typy i punkty.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remove.mutate()}
                >
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {match.settled ? (
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => unsettle.mutate()}>
              Cofnij rozlicz.
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EditMatchDialog({ match }: { match: MatchDTO }) {
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateAll();
  const [homeTeam, setHomeTeam] = useState(match.homeTeam);
  const [awayTeam, setAwayTeam] = useState(match.awayTeam);
  const [homeCode, setHomeCode] = useState(match.homeCode ?? "");
  const [awayCode, setAwayCode] = useState(match.awayCode ?? "");
  const [kickoff, setKickoff] = useState(toLocalInput(match.kickoff));
  const [venue, setVenue] = useState(match.venue ?? "");
  const [city, setCity] = useState(match.city ?? "");

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/matches/${match.id}`, {
        homeTeam,
        awayTeam,
        homeCode: homeCode || null,
        awayCode: awayCode || null,
        kickoff: new Date(kickoff).toISOString(),
        venue: venue || null,
        city: city || null,
      }),
    onSuccess: () => {
      toast.success("Zapisano zmiany");
      invalidate();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edytuj mecz">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj mecz</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Gospodarz"><Input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} /></Field>
          <Field label="Gość"><Input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} /></Field>
          <Field label="Kod flagi gosp. (np. pl)"><Input value={homeCode} onChange={(e) => setHomeCode(e.target.value)} /></Field>
          <Field label="Kod flagi gościa"><Input value={awayCode} onChange={(e) => setAwayCode(e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Data i godzina">
              <Input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
            </Field>
          </div>
          <Field label="Stadion"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
          <Field label="Miasto"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ISO -> value for <input type="datetime-local"> in local time
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
