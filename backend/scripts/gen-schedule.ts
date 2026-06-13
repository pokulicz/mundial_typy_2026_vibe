// Generates the full FIFA World Cup 2026 schedule (104 matches) as a TS data module.
// 48 teams, 12 groups (A–L), 72 group matches + 32 knockout matches.
// Teams/dates are a realistic, editable baseline — admins can correct any match in-app.

type Team = { name: string; code: string };

const V = (city: string, venue: string) => ({ city, venue });
const venues = {
  mexico: V("Mexico City", "Estadio Azteca"),
  guadalajara: V("Guadalajara", "Estadio Akron"),
  monterrey: V("Monterrey", "Estadio BBVA"),
  toronto: V("Toronto", "BMO Field"),
  vancouver: V("Vancouver", "BC Place"),
  atlanta: V("Atlanta", "Mercedes-Benz Stadium"),
  boston: V("Boston", "Gillette Stadium"),
  dallas: V("Dallas", "AT&T Stadium"),
  houston: V("Houston", "NRG Stadium"),
  kansas: V("Kansas City", "Arrowhead Stadium"),
  la: V("Los Angeles", "SoFi Stadium"),
  miami: V("Miami", "Hard Rock Stadium"),
  newyork: V("New York / New Jersey", "MetLife Stadium"),
  philadelphia: V("Philadelphia", "Lincoln Financial Field"),
  sfbay: V("San Francisco Bay Area", "Levi's Stadium"),
  seattle: V("Seattle", "Lumen Field"),
};
const venueList = Object.values(venues);

// 12 groups of 4. Hosts placed first in their groups (Mexico A, Canada B, USA D).
const groups: Record<string, Team[]> = {
  A: [
    { name: "Meksyk", code: "mx" },
    { name: "Chorwacja", code: "hr" },
    { name: "Ekwador", code: "ec" },
    { name: "Arabia Saudyjska", code: "sa" },
  ],
  B: [
    { name: "Kanada", code: "ca" },
    { name: "Belgia", code: "be" },
    { name: "Maroko", code: "ma" },
    { name: "Korea Płd.", code: "kr" },
  ],
  C: [
    { name: "Argentyna", code: "ar" },
    { name: "Polska", code: "pl" },
    { name: "Senegal", code: "sn" },
    { name: "Australia", code: "au" },
  ],
  D: [
    { name: "USA", code: "us" },
    { name: "Holandia", code: "nl" },
    { name: "Tunezja", code: "tn" },
    { name: "Paragwaj", code: "py" },
  ],
  E: [
    { name: "Brazylia", code: "br" },
    { name: "Niemcy", code: "de" },
    { name: "Egipt", code: "eg" },
    { name: "Kostaryka", code: "cr" },
  ],
  F: [
    { name: "Francja", code: "fr" },
    { name: "Urugwaj", code: "uy" },
    { name: "Nigeria", code: "ng" },
    { name: "Iran", code: "ir" },
  ],
  G: [
    { name: "Hiszpania", code: "es" },
    { name: "Dania", code: "dk" },
    { name: "Ghana", code: "gh" },
    { name: "Panama", code: "pa" },
  ],
  H: [
    { name: "Anglia", code: "gb-eng" },
    { name: "Szwajcaria", code: "ch" },
    { name: "Wybrzeże K.", code: "ci" },
    { name: "Katar", code: "qa" },
  ],
  I: [
    { name: "Portugalia", code: "pt" },
    { name: "Kolumbia", code: "co" },
    { name: "Algieria", code: "dz" },
    { name: "Nowa Zelandia", code: "nz" },
  ],
  J: [
    { name: "Holandia", code: "nl" },
    { name: "Japonia", code: "jp" },
    { name: "Kamerun", code: "cm" },
    { name: "Norwegia", code: "no" },
  ],
  K: [
    { name: "Włochy", code: "it" },
    { name: "Kolumbia", code: "co" },
    { name: "Peru", code: "pe" },
    { name: "Jamajka", code: "jm" },
  ],
  L: [
    { name: "Serbia", code: "rs" },
    { name: "Austria", code: "at" },
    { name: "Ukraina", code: "ua" },
    { name: "Szkocja", code: "gb-sct" },
  ],
};

// Fix duplicate teams (J and K reused some) — replace with distinct nations.
groups.J = [
  { name: "Turcja", code: "tr" },
  { name: "Japonia", code: "jp" },
  { name: "Kamerun", code: "cm" },
  { name: "Norwegia", code: "no" },
];
groups.K = [
  { name: "Włochy", code: "it" },
  { name: "Szwecja", code: "se" },
  { name: "Peru", code: "pe" },
  { name: "Jamajka", code: "jm" },
];

type Out = {
  phase: string;
  groupName: string | null;
  matchNo: number;
  homeTeam: string;
  awayTeam: string;
  homeCode: string | null;
  awayCode: string | null;
  kickoff: string;
  venue: string | null;
  city: string | null;
};

const out: Out[] = [];
let matchNo = 1;

// Round-robin pairings for 4 teams (indices), matchday-ordered
const rr: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ], // MD1
  [
    [0, 2],
    [1, 3],
  ], // MD2
  [
    [0, 3],
    [1, 2],
  ], // MD3
];

// Group stage: 11 June – 27 June 2026. Spread groups across matchdays.
const groupNames = Object.keys(groups);
let dayCursor = new Date(Date.UTC(2026, 5, 11, 16, 0, 0)); // 11 Jun 2026 16:00 UTC
const kickoffHours = [16, 19, 22, 1]; // rotating local-ish slots
let slot = 0;

function nextKickoff(): string {
  const base = new Date(dayCursor);
  base.setUTCHours(kickoffHours[slot % kickoffHours.length]);
  const iso = base.toISOString();
  slot++;
  if (slot % 4 === 0) {
    dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
  }
  return iso;
}

for (let md = 0; md < 3; md++) {
  for (let g = 0; g < groupNames.length; g++) {
    const gn = groupNames[g];
    const teams = groups[gn];
    for (const [hi, ai] of rr[md]) {
      const venue = venueList[(matchNo - 1) % venueList.length];
      out.push({
        phase: "GROUP",
        groupName: gn,
        matchNo,
        homeTeam: teams[hi].name,
        awayTeam: teams[ai].name,
        homeCode: teams[hi].code,
        awayCode: teams[ai].code,
        kickoff: nextKickoff(),
        venue: venue.venue,
        city: venue.city,
      });
      matchNo++;
    }
  }
}

// Knockout placeholders. Teams TBD until group stage resolves.
function addKnockout(
  phase: string,
  count: number,
  startDate: Date,
  labelHome: (i: number) => string,
  labelAway: (i: number) => string
) {
  const d = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const venue = venueList[(matchNo - 1) % venueList.length];
    const ko = new Date(d);
    ko.setUTCHours(i % 2 === 0 ? 19 : 22);
    out.push({
      phase,
      groupName: null,
      matchNo,
      homeTeam: labelHome(i),
      awayTeam: labelAway(i),
      homeCode: null,
      awayCode: null,
      kickoff: ko.toISOString(),
      venue: venue.venue,
      city: venue.city,
    });
    matchNo++;
    if (i % 2 === 1) d.setUTCDate(d.getUTCDate() + 1);
  }
}

addKnockout("R32", 16, new Date(Date.UTC(2026, 5, 28)), (i) => `Zwycięzca pary R32-${i + 1}A`, (i) => `Zwycięzca pary R32-${i + 1}B`);
addKnockout("R16", 8, new Date(Date.UTC(2026, 6, 4)), (i) => `Zwycięzca 1/16 #${i * 2 + 1}`, (i) => `Zwycięzca 1/16 #${i * 2 + 2}`);
addKnockout("QF", 4, new Date(Date.UTC(2026, 6, 9)), (i) => `Zwycięzca 1/8 #${i * 2 + 1}`, (i) => `Zwycięzca 1/8 #${i * 2 + 2}`);
addKnockout("SF", 2, new Date(Date.UTC(2026, 6, 14)), (i) => `Zwycięzca ćwierćfinału #${i * 2 + 1}`, (i) => `Zwycięzca ćwierćfinału #${i * 2 + 2}`);

// Third place + final
{
  const third = venues.miami;
  out.push({
    phase: "THIRD",
    groupName: null,
    matchNo: matchNo++,
    homeTeam: "Przegrany półfinału #1",
    awayTeam: "Przegrany półfinału #2",
    homeCode: null,
    awayCode: null,
    kickoff: new Date(Date.UTC(2026, 6, 18, 19, 0, 0)).toISOString(),
    venue: third.venue,
    city: third.city,
  });
  const fin = venues.newyork;
  out.push({
    phase: "FINAL",
    groupName: null,
    matchNo: matchNo++,
    homeTeam: "Zwycięzca półfinału #1",
    awayTeam: "Zwycięzca półfinału #2",
    homeCode: null,
    awayCode: null,
    kickoff: new Date(Date.UTC(2026, 6, 19, 19, 0, 0)).toISOString(),
    venue: fin.venue,
    city: fin.city,
  });
}

const header = `// AUTO-GENERATED by scripts/gen-schedule.ts — full FIFA World Cup 2026 schedule baseline.
// 104 matches. Teams & times are an editable starting point; correct any match in the admin panel.
export type ScheduleMatch = {
  phase: "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";
  groupName: string | null;
  matchNo: number;
  homeTeam: string;
  awayTeam: string;
  homeCode: string | null;
  awayCode: string | null;
  kickoff: string;
  venue: string | null;
  city: string | null;
};

export const WORLD_CUP_2026: ScheduleMatch[] = `;

await Bun.write(
  new URL("../src/data/worldcup2026.ts", import.meta.url),
  header + JSON.stringify(out, null, 2) + ";\n"
);

console.log(`Wrote ${out.length} matches.`);
