// Frontend mirror of backend DTOs (backend/src/types.ts). Kept in sync manually.

export type Role = "ADMIN" | "PLAYER";

export type Phase = "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";

export const PHASE_LABELS: Record<Phase, string> = {
  GROUP: "Faza grupowa",
  R32: "1/16 finału",
  R16: "1/8 finału",
  QF: "Ćwierćfinał",
  SF: "Półfinał",
  THIRD: "Mecz o 3. miejsce",
  FINAL: "Finał",
};

export const PHASE_ORDER: Phase[] = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"];

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface MatchDTO {
  id: string;
  tournament: string;
  phase: Phase;
  groupName: string | null;
  matchNo: number | null;
  homeTeam: string;
  awayTeam: string;
  homeCode: string | null;
  awayCode: string | null;
  kickoff: string;
  venue: string | null;
  city: string | null;
  homeScore: number | null;
  awayScore: number | null;
  lockOverride: boolean;
  finished: boolean;
  settled: boolean;
  settledAt: string | null;
  dataSource: string;
  locked: boolean;
}

export interface PredictionDTO {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
}

export interface RankRow {
  rank: number;
  userId: string;
  username: string;
  balance: number;
  hits: number;
  predictions: number;
  settledMatches: number;
}

export interface SettlementEntry {
  userId: string;
  username: string;
  homeScore: number;
  awayScore: number;
  hit: boolean;
  points: number;
}

export interface AdminPredictionRow {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
}
