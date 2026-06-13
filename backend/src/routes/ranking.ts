import { Hono } from "hono";
import { prisma } from "../prisma";
import { requireUser, requireAdmin, type AppVariables } from "../auth";
import type { RankRow } from "../types";

const rankingRouter = new Hono<{ Variables: AppVariables }>();

// Full ranking (any logged-in user).
rankingRouter.get("/", async (c) => {
  requireUser(c);

  const users = await prisma.user.findMany();
  const points = await prisma.pointEntry.findMany();
  const predCounts = await prisma.prediction.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });

  const predMap = new Map(predCounts.map((p) => [p.userId, p._count._all]));

  const rows: Omit<RankRow, "rank">[] = users.map((u) => {
    const mine = points.filter((p) => p.userId === u.id);
    const balance = mine.reduce((sum, p) => sum + p.points, 0);
    const hits = mine.filter((p) => p.hit).length;
    return {
      userId: u.id,
      username: u.username,
      balance: Math.round(balance * 100) / 100,
      hits,
      predictions: predMap.get(u.id) ?? 0,
      settledMatches: mine.length,
    };
  });

  rows.sort(
    (a, b) =>
      b.balance - a.balance ||
      b.hits - a.hits ||
      b.predictions - a.predictions ||
      a.username.localeCompare(b.username)
  );

  const ranked: RankRow[] = rows.map((r, i) => ({ rank: i + 1, ...r }));
  return c.json({ data: ranked });
});

// Admin: browse predictions filtered by match and/or user
rankingRouter.get("/admin/predictions", async (c) => {
  requireAdmin(c);
  const url = new URL(c.req.url);
  const matchId = url.searchParams.get("matchId") || undefined;
  const userId = url.searchParams.get("userId") || undefined;

  const preds = await prisma.prediction.findMany({
    where: { matchId, userId },
    include: { user: true, match: true },
    orderBy: { updatedAt: "desc" },
  });
  return c.json({
    data: preds.map((p) => ({
      id: p.id,
      matchId: p.matchId,
      userId: p.userId,
      username: p.user.username,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      kickoff: p.match.kickoff.toISOString(),
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

export { rankingRouter };
