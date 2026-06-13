import { Hono } from "hono";
import { prisma } from "../prisma";
import { requireUser, requireAdmin, HttpError, type AppVariables } from "../auth";
import { computeSettlement } from "../helpers";

const settleRouter = new Hono<{ Variables: AppVariables }>();

// ---------- Settle a single match (admin, idempotent) ----------
settleRouter.post("/match/:matchId", async (c) => {
  requireAdmin(c);
  const matchId = c.req.param("matchId");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");
  if (match.homeScore == null || match.awayScore == null) {
    throw new HttpError(400, "Najpierw wpisz wynik meczu", "NO_RESULT");
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: true },
  });

  const scored = computeSettlement(match.homeScore, match.awayScore, predictions);

  // Idempotent: wipe prior entries for this match, then recreate.
  await prisma.$transaction([
    prisma.pointEntry.deleteMany({ where: { matchId } }),
    ...scored.map((s) =>
      prisma.pointEntry.create({
        data: { matchId, userId: s.userId, hit: s.hit, points: s.points },
      })
    ),
    prisma.match.update({
      where: { id: matchId },
      data: { settled: true, settledAt: new Date(), finished: true },
    }),
  ]);

  return c.json({
    data: {
      matchId,
      result: { homeScore: match.homeScore, awayScore: match.awayScore },
      entries: scored,
    },
  });
});

// Un-settle (admin) — removes point entries, keeps the result.
settleRouter.post("/match/:matchId/unsettle", async (c) => {
  requireAdmin(c);
  const matchId = c.req.param("matchId");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");
  await prisma.pointEntry.deleteMany({ where: { matchId } });
  await prisma.match.update({
    where: { id: matchId },
    data: { settled: false, settledAt: null },
  });
  return c.json({ data: { ok: true } });
});

// Re-settle every match that has a result (admin) — recomputes ranking fully.
settleRouter.post("/recompute", async (c) => {
  requireAdmin(c);
  const matches = await prisma.match.findMany({
    where: { homeScore: { not: null }, awayScore: { not: null } },
  });
  let settled = 0;
  for (const match of matches) {
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      include: { user: true },
    });
    const scored = computeSettlement(match.homeScore!, match.awayScore!, predictions);
    await prisma.$transaction([
      prisma.pointEntry.deleteMany({ where: { matchId: match.id } }),
      ...scored.map((s) =>
        prisma.pointEntry.create({
          data: { matchId: match.id, userId: s.userId, hit: s.hit, points: s.points },
        })
      ),
      prisma.match.update({
        where: { id: match.id },
        data: { settled: true, settledAt: new Date(), finished: true },
      }),
    ]);
    settled++;
  }
  return c.json({ data: { settled } });
});

// Settlement detail for a match (any logged-in user; shown after settle)
settleRouter.get("/match/:matchId", async (c) => {
  requireUser(c);
  const matchId = c.req.param("matchId");
  const entries = await prisma.pointEntry.findMany({
    where: { matchId },
    include: { user: true },
    orderBy: { points: "desc" },
  });
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  const predMap = new Map(preds.map((p) => [p.userId, p]));
  return c.json({
    data: entries.map((e) => {
      const p = predMap.get(e.userId);
      return {
        userId: e.userId,
        username: e.user.username,
        homeScore: p?.homeScore ?? 0,
        awayScore: p?.awayScore ?? 0,
        hit: e.hit,
        points: e.points,
      };
    }),
  });
});

export { settleRouter };
