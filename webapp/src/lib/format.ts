// Polish date/time + points formatting helpers.

const DAY_FMT = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
});

const FULL_FMT = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDay(iso: string): string {
  return DAY_FMT.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

export function formatFull(iso: string): string {
  return FULL_FMT.format(new Date(iso));
}

// e.g. "śr, 13 cze" — used as a group header key
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Signed points like +25, -5, +2.5
export function formatPoints(p: number): string {
  const rounded = Math.round(p * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

// Relative countdown until kickoff, short Polish.
export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `za ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `za ${hours} h`;
  const days = Math.floor(hours / 24);
  return `za ${days} dn.`;
}
