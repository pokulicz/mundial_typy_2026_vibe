import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import {
  CreateMatchSchema,
  UpdateMatchSchema,
  SetResultSchema,
  ImportScheduleSchema,
} from "../types";
import { requireUser, requireAdmin, HttpError, type AppVariables } from "../auth";
import { toMatchDTO, computeSettlement } from "../helpers";
import { WORLD_CUP_2026 } from "../data/worldcup2026";
import { fetchGroupResults } from "../data/wikiResults";

const matchesRouter = new Hono<{ Variables: AppVariables }>();

// List matches (any logged-in user)
matchesRouter.get("/", async (c) => {
  requireUser(c);
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });
  const now = new Date();
  return c.json({ data: matches.map((m) => toMatchDTO(m, now)) });
});

// Single match
matchesRouter.get("/:id", async (c) => {
  requireUser(c);
  const match = await prisma.match.findUnique({ where: { id: c.req.param("id") } });
  if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");
  return c.json({ data: toMatchDTO(match) });
});

// ---------- Admin ----------

// Create single match
matchesRouter.post("/", zValidator("json", CreateMatchSchema), async (c) => {
  requireAdmin(c);
  const b = c.req.valid("json");
  const match = await prisma.match.create({
    data: {
      tournament: b.tournament ?? "FIFA World Cup 2026",
      phase: b.phase,
      groupName: b.groupName ?? null,
      matchNo: b.matchNo ?? null,
      homeTeam: b.homeTeam,
      awayTeam: b.awayTeam,
      homeCode: b.homeCode ?? null,
      awayCode: b.awayCode ?? null,
      kickoff: new Date(b.kickoff),
      venue: b.venue ?? null,
      city: b.city ?? null,
      dataSource: "manual",
    },
  });
  return c.json({ data: toMatchDTO(match) });
});

// Update match
matchesRouter.patch("/:id", zValidator("json", UpdateMatchSchema), async (c) => {
  requireAdmin(c);
  const id = c.req.param("id");
  const b = c.req.valid("json");
  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");

  const data: Record<string, unknown> = {};
  if (b.phase !== undefined) data.phase = b.phase;
  if (b.groupName !== undefined) data.groupName = b.groupName;
  if (b.matchNo !== undefined) data.matchNo = b.matchNo;
  if (b.homeTeam !== undefined) data.homeTeam = b.homeTeam;
  if (b.awayTeam !== undefined) data.awayTeam = b.awayTeam;
  if (b.homeCode !== undefined) data.homeCode = b.homeCode;
  if (b.awayCode !== undefined) data.awayCode = b.awayCode;
  if (b.kickoff !== undefined) data.kickoff = new Date(b.kickoff);
  if (b.venue !== undefined) data.venue = b.venue;
  if (b.city !== undefined) data.city = b.city;
  if (b.lockOverride !== undefined) data.lockOverride = b.lockOverride;

  const match = await prisma.match.update({ where: { id }, data });
  return c.json({ data: toMatchDTO(match) });
});

// Delete match
matchesRouter.delete("/:id", async (c) => {
  requireAdmin(c);
  const id = c.req.param("id");
  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");
  await prisma.match.delete({ where: { id } });
  return c.json({ data: { ok: true } });
});

// Set result (manual / fallback). Re-settles automatically if already settled.
matchesRouter.put("/:id/result", zValidator("json", SetResultSchema), async (c) => {
  requireAdmin(c);
  const id = c.req.param("id");
  const b = c.req.valid("json");
  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");

  const match = await prisma.match.update({
    where: { id },
    data: { homeScore: b.homeScore, awayScore: b.awayScore, finished: b.finished },
  });
  return c.json({ data: toMatchDTO(match) });
});

// Clear result
matchesRouter.delete("/:id/result", async (c) => {
  requireAdmin(c);
  const id = c.req.param("id");
  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");
  // remove settlement entries too
  await prisma.pointEntry.deleteMany({ where: { matchId: id } });
  const match = await prisma.match.update({
    where: { id },
    data: { homeScore: null, awayScore: null, finished: false, settled: false, settledAt: null },
  });
  return c.json({ data: toMatchDTO(match) });
});

// Import schedule (JSON body). replaceAll => wipe existing matches first.
matchesRouter.post("/import", zValidator("json", ImportScheduleSchema), async (c) => {
  requireAdmin(c);
  const { matches, replaceAll } = c.req.valid("json");
  if (replaceAll) {
    await prisma.match.deleteMany({});
  }
  let created = 0;
  for (const m of matches) {
    await prisma.match.create({
      data: {
        tournament: "FIFA World Cup 2026",
        phase: m.phase,
        groupName: m.groupName ?? null,
        matchNo: m.matchNo ?? null,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeCode: m.homeCode ?? null,
        awayCode: m.awayCode ?? null,
        kickoff: new Date(m.kickoff),
        venue: m.venue ?? null,
        city: m.city ?? null,
        dataSource: "import",
      },
    });
    created++;
  }
  return c.json({ data: { created, replaced: replaceAll } });
});

// One-click import of the bundled official-style World Cup 2026 schedule.
matchesRouter.post("/import-worldcup-2026", async (c) => {
  requireAdmin(c);
  const url = new URL(c.req.url);
  const replaceAll = url.searchParams.get("replaceAll") === "true";
  const count = await prisma.match.count();
  if (count > 0 && !replaceAll) {
    throw new HttpError(
      409,
      "Terminarz już istnieje. Użyj 'Zastąp wszystko', aby nadpisać.",
      "ALREADY_IMPORTED"
    );
  }
  if (replaceAll) await prisma.match.deleteMany({});
  for (const m of WORLD_CUP_2026) {
    const hasResult = m.homeScore != null && m.awayScore != null;
    await prisma.match.create({
      data: {
        tournament: "FIFA World Cup 2026",
        phase: m.phase,
        groupName: m.groupName ?? null,
        matchNo: m.matchNo ?? null,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeCode: m.homeCode ?? null,
        awayCode: m.awayCode ?? null,
        kickoff: new Date(m.kickoff),
        venue: m.venue ?? null,
        city: m.city ?? null,
        homeScore: hasResult ? m.homeScore : null,
        awayScore: hasResult ? m.awayScore : null,
        finished: hasResult,
        dataSource: "import",
      },
    });
  }
  return c.json({ data: { created: WORLD_CUP_2026.length, replaced: replaceAll } });
});

// Auto-fetch group-stage results from Wikipedia and apply them.
// For each newly-resulted match: save score, mark finished, and settle (idempotent).
matchesRouter.post("/refresh-results", async (c) => {
  requireAdmin(c);
  let results;
  try {
    results = await fetchGroupResults();
  } catch (e) {
    throw new HttpError(502, "Nie udało się pobrać wyników z internetu", "FETCH_FAILED");
  }

  const matches = await prisma.match.findMany({ where: { phase: "GROUP" } });
  // index by group|home|away (ISO codes)
  const key = (g: string | null, h: string | null, a: string | null) =>
    `${g ?? ""}|${h ?? ""}|${a ?? ""}`;
  const byKey = new Map(matches.map((m) => [key(m.groupName, m.homeCode, m.awayCode), m]));

  let updated = 0;
  let settled = 0;
  for (const r of results) {
    const match = byKey.get(key(r.groupName, r.homeCode, r.awayCode));
    if (!match) continue;
    const changed =
      match.homeScore !== r.homeScore || match.awayScore !== r.awayScore || !match.finished;
    if (!changed) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: r.homeScore, awayScore: r.awayScore, finished: true, dataSource: "wikipedia" },
    });
    updated++;

    // settle (idempotent) so ranking updates immediately
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      include: { user: true },
    });
    const scored = computeSettlement(r.homeScore, r.awayScore, predictions);
    await prisma.$transaction([
      prisma.pointEntry.deleteMany({ where: { matchId: match.id } }),
      ...scored.map((s) =>
        prisma.pointEntry.create({
          data: { matchId: match.id, userId: s.userId, hit: s.hit, points: s.points },
        })
      ),
      prisma.match.update({
        where: { id: match.id },
        data: { settled: true, settledAt: new Date() },
      }),
    ]);
    settled++;
  }

  return c.json({ data: { fetched: results.length, updated, settled } });
});

export { matchesRouter };
