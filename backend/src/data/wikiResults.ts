// Fetches current group-stage results from Wikipedia (no API key needed) and
// returns them keyed by group + ISO team codes, so we can match DB matches.

const FIFA_TO_ISO: Record<string, string> = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba", BRA: "br",
  CAN: "ca", CIV: "ci", COD: "cd", COL: "co", CPV: "cv", CRO: "hr", CUW: "cw",
  CZE: "cz", ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de",
  GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq", JOR: "jo", JPN: "jp", KOR: "kr",
  KSA: "sa", MAR: "ma", MEX: "mx", NED: "nl", NOR: "no", NZL: "nz", PAN: "pa",
  PAR: "py", POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct", SEN: "sn", SUI: "ch",
  SWE: "se", TUN: "tn", TUR: "tr", URU: "uy", USA: "us", UZB: "uz",
};

export type WikiResult = {
  groupName: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
};

function lineField(lines: string[], name: string): string | null {
  const pref = `|${name}=`;
  const l = lines.find((x) => x.startsWith(pref));
  return l ? l.slice(pref.length).trim() : null;
}

function teamIso(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/fb(?:-rt)?\|([A-Z]{3})/);
  const code = m?.[1];
  return code && FIFA_TO_ISO[code] ? FIFA_TO_ISO[code] : null;
}

function parseScore(v: string | null): [number, number] | null {
  if (!v) return null;
  // ignore "Match N" placeholders; require digit–digit
  const m = v.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export async function fetchGroupResults(): Promise<WikiResult[]> {
  const out: WikiResult[] = [];
  for (const g of GROUPS) {
    const url = `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_${g}?action=raw`;
    let text: string;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "MundialTypy/1.0" } });
      if (!res.ok) continue;
      text = await res.text();
    } catch {
      continue;
    }
    const blocks = text.split(/\{\{#invoke:football box\|main/i).slice(1);
    for (const raw of blocks) {
      const block = raw.split(/<section end|\n----/i)[0] ?? "";
      const lines = block.split("\n").map((l) => l.trim());
      const date = lineField(lines, "date");
      if (!date || !/Start date/.test(date)) continue;
      const home = teamIso(lineField(lines, "team1"));
      const away = teamIso(lineField(lines, "team2"));
      const score = parseScore(lineField(lines, "score"));
      if (!home || !away || !score) continue;
      out.push({ groupName: g, homeCode: home, awayCode: away, homeScore: score[0], awayScore: score[1] });
    }
  }
  return out;
}
