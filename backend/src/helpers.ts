import type { Match, Prediction, User } from "@prisma/client";
import type { MatchDTO } from "./types";

// A match is locked for typing once it has started, or admin locked it, or it finished.
export function isLocked(match: Match, now: Date = new Date()): boolean {
  if (match.lockOverride) return true;
  if (match.finished) return true;
  return now.getTime() >= match.kickoff.getTime();
}

const LIVE_WINDOW_MS = 150 * 60 * 1000; // ~2.5h: assume a match is "live" within this window
const POOL_PER_MATCH = 2; // punkty za każdego typującego

// Derived match status for display.
export type MatchStatus = "UPCOMING" | "LIVE" | "AWAITING" | "FINISHED";
export function matchStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.finished) return "FINISHED";
  const start = match.kickoff.getTime();
  const t = now.getTime();
  if (t < start) return "UPCOMING";
  if (t - start < LIVE_WINDOW_MS) return "LIVE";
  return "AWAITING"; // started long ago but no result entered yet
}

export function toMatchDTO(match: Match, now: Date = new Date()): MatchDTO {
  return {
    id: match.id,
    tournament: match.tournament,
    phase: match.phase as MatchDTO["phase"],
    groupName: match.groupName,
    matchNo: match.matchNo,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeCode: match.homeCode,
    awayCode: match.awayCode,
    kickoff: match.kickoff.toISOString(),
    venue: match.venue,
    city: match.city,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    lockOverride: match.lockOverride,
    finished: match.finished,
    settled: match.settled,
    settledAt: match.settledAt ? match.settledAt.toISOString() : null,
    dataSource: match.dataSource,
    locked: isLocked(match, now),
    status: matchStatus(match, now),
  };
}

export type ScoredEntry = {
  userId: string;
  username: string;
  homeScore: number;
  awayScore: number;
  hit: boolean;
  points: number;
};

/**
 * Pool scoring: only an EXACT score counts as a hit.
 * - If nobody hits: everyone gets 0.
 * - If some hit: each non-hitter loses POOL_PER_MATCH, hitters split the losers' pool.
 *   win = ((nPlayers - nHits) * POOL_PER_MATCH) / nHits
 * Only players who submitted a prediction for this match participate.
 */
export function computeSettlement(
  resultHome: number,
  resultAway: number,
  predictions: (Prediction & { user: User })[]
): ScoredEntry[] {
  const nPlayers = predictions.length;
  const hitters = predictions.filter(
    (p) => p.homeScore === resultHome && p.awayScore === resultAway
  );
  const nHits = hitters.length;

  return predictions.map((p) => {
    const hit = p.homeScore === resultHome && p.awayScore === resultAway;
    let points = 0;
    if (nHits > 0) {
      points = hit ? ((nPlayers - nHits) * POOL_PER_MATCH) / nHits : -POOL_PER_MATCH;
    }
    return {
      userId: p.userId,
      username: p.user.username,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      hit,
      points,
    };
  });
}
