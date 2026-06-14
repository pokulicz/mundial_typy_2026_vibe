import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  MatchDTO,
  PredictionDTO,
  RankRow,
  SettlementEntry,
  PublicUser,
  AdminPredictionRow,
  PredictionStats,
} from "./types";

// ---------- Matches ----------
export function useMatches() {
  return useQuery<MatchDTO[]>({
    queryKey: ["matches"],
    queryFn: () => api.get<MatchDTO[]>("/api/matches"),
  });
}

export function useMatch(id: string | undefined) {
  return useQuery<MatchDTO>({
    queryKey: ["match", id],
    queryFn: () => api.get<MatchDTO>(`/api/matches/${id}`),
    enabled: !!id,
  });
}

// ---------- Predictions ----------
export function useMyPredictions() {
  return useQuery<PredictionDTO[]>({
    queryKey: ["predictions", "mine"],
    queryFn: () => api.get<PredictionDTO[]>("/api/predictions/mine"),
  });
}

export function useMatchPredictions(matchId: string | undefined, enabled = true) {
  return useQuery<PredictionDTO[]>({
    queryKey: ["predictions", "match", matchId],
    queryFn: () => api.get<PredictionDTO[]>(`/api/predictions/match/${matchId}`),
    enabled: !!matchId && enabled,
  });
}

// Aggregate stats for one match (counts only — total typów, pula, ile graczy ma ten sam wynik).
export function useMatchStats(matchId: string | undefined, enabled = true) {
  return useQuery<PredictionStats>({
    queryKey: ["predictions", "stats", matchId],
    queryFn: () => api.get<PredictionStats>(`/api/predictions/match/${matchId}/stats`),
    enabled: !!matchId && enabled,
  });
}

export function useSubmitPrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { matchId: string; homeScore: number; awayScore: number }) =>
      api.put<PredictionDTO>(`/api/predictions/match/${vars.matchId}`, {
        homeScore: vars.homeScore,
        awayScore: vars.awayScore,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["predictions", "mine"] });
      qc.invalidateQueries({ queryKey: ["predictions", "match", vars.matchId] });
      qc.invalidateQueries({ queryKey: ["predictions", "stats", vars.matchId] });
    },
  });
}

// Cancel my own prediction for an open match.
export function useDeletePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.delete(`/api/predictions/match/${matchId}`),
    onSuccess: (_data, matchId) => {
      qc.invalidateQueries({ queryKey: ["predictions", "mine"] });
      qc.invalidateQueries({ queryKey: ["predictions", "match", matchId] });
      qc.invalidateQueries({ queryKey: ["predictions", "stats", matchId] });
    },
  });
}

// ---------- Ranking ----------
export function useRanking() {
  return useQuery<RankRow[]>({
    queryKey: ["ranking"],
    queryFn: () => api.get<RankRow[]>("/api/ranking"),
  });
}

export function useSettlement(matchId: string | undefined, enabled = true) {
  return useQuery<SettlementEntry[]>({
    queryKey: ["settlement", matchId],
    queryFn: () => api.get<SettlementEntry[]>(`/api/settle/match/${matchId}`),
    enabled: !!matchId && enabled,
  });
}

// ---------- Admin: users ----------
export function useUsers() {
  return useQuery<PublicUser[]>({
    queryKey: ["users"],
    queryFn: () => api.get<PublicUser[]>("/api/users"),
  });
}

// ---------- Admin: predictions browse ----------
export function useAdminPredictions(params: { matchId?: string; userId?: string }) {
  const qs = new URLSearchParams();
  if (params.matchId) qs.set("matchId", params.matchId);
  if (params.userId) qs.set("userId", params.userId);
  const q = qs.toString();
  return useQuery<AdminPredictionRow[]>({
    queryKey: ["admin-predictions", params.matchId ?? "", params.userId ?? ""],
    queryFn: () => api.get<AdminPredictionRow[]>(`/api/ranking/admin/predictions${q ? `?${q}` : ""}`),
  });
}

// Invalidate everything that depends on matches/points after admin actions.
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
    qc.invalidateQueries({ queryKey: ["match"] });
    qc.invalidateQueries({ queryKey: ["settlement"] });
    qc.invalidateQueries({ queryKey: ["admin-predictions"] });
  };
}
