import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { SubmitPredictionSchema } from "../types";
import { requireUser, HttpError, type AppVariables } from "../auth";
import { isLocked, POOL_PER_MATCH } from "../helpers";

const predictionsRouter = new Hono<{ Variables: AppVariables }>();

// My predictions (all matches I typed)
predictionsRouter.get("/mine", async (c) => {
  const user = requireUser(c);
  const preds = await prisma.prediction.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return c.json({
    data: preds.map((p) => ({
      id: p.id,
      matchId: p.matchId,
      userId: p.userId,
      username: user.username,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

// Submit / update a prediction for a match. SERVER-SIDE LOCK ENFORCED.
predictionsRouter.put(
  "/match/:matchId",
  zValidator("json", SubmitPredictionSchema),
  async (c) => {
    const user = requireUser(c);
    const matchId = c.req.param("matchId");
    const { homeScore, awayScore } = c.req.valid("json");

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");

    // Server-side enforcement: cannot type once the match has started / is locked.
    if (isLocked(match)) {
      throw new HttpError(403, "Typowanie tego meczu jest już zamknięte", "MATCH_LOCKED");
    }

    const pred = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId } },
      create: { userId: user.id, matchId, homeScore, awayScore },
      update: { homeScore, awayScore },
    });

    return c.json({
      data: {
        id: pred.id,
        matchId: pred.matchId,
        userId: pred.userId,
        username: user.username,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        updatedAt: pred.updatedAt.toISOString(),
      },
    });
  }
);

// Aggregate stats for a match — counts only, never reveals individual picks,
// so it is safe to show before kickoff (informational, doesn't help copying).
predictionsRouter.get("/match/:matchId/stats", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");

  const total = await prisma.prediction.count({ where: { matchId } });

  // How many players (incl. me) picked the exact same score as my saved type.
  const mine = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: user.id, matchId } },
  });
  let sameScore: number | null = null;
  if (mine) {
    sameScore = await prisma.prediction.count({
      where: { matchId, homeScore: mine.homeScore, awayScore: mine.awayScore },
    });
  }

  return c.json({
    data: {
      matchId,
      total,
      pool: total * POOL_PER_MATCH,
      poolPerMatch: POOL_PER_MATCH,
      sameScore,
    },
  });
});

// All predictions for a match.
// Visibility rule (server-enforced):
//  - admins: always see all
//  - players: see all ONLY after the match is locked (started). Before that, only their own.
predictionsRouter.get("/match/:matchId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new HttpError(404, "Nie znaleziono meczu", "NOT_FOUND");

  const locked = isLocked(match);
  const isAdmin = user.role === "ADMIN";

  if (!locked && !isAdmin) {
    // only own prediction visible
    const mine = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: user.id, matchId } },
    });
    return c.json({
      data: mine
        ? [
            {
              id: mine.id,
              matchId: mine.matchId,
              userId: mine.userId,
              username: user.username,
              homeScore: mine.homeScore,
              awayScore: mine.awayScore,
              updatedAt: mine.updatedAt.toISOString(),
            },
          ]
        : [],
    });
  }

  const preds = await prisma.prediction.findMany({
    where: { matchId },
    include: { user: true },
    orderBy: { user: { username: "asc" } },
  });
  return c.json({
    data: preds.map((p) => ({
      id: p.id,
      matchId: p.matchId,
      userId: p.userId,
      username: p.user.username,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
});

// Delete all my predictions
predictionsRouter.delete("/mine", async (c) => {
  const user = requireUser(c);
  const result = await prisma.prediction.deleteMany({
    where: { userId: user.id },
  });
  return c.json({
    data: { deleted: result.count },
  });
});

export { predictionsRouter };
