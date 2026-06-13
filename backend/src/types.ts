import { z } from "zod";

// ---------- Shared enums ----------

export const PhaseSchema = z.enum([
  "GROUP",
  "R32",
  "R16",
  "QF",
  "SF",
  "THIRD",
  "FINAL",
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const PHASE_LABELS: Record<Phase, string> = {
  GROUP: "Faza grupowa",
  R32: "1/16 finału",
  R16: "1/8 finału",
  QF: "Ćwierćfinał",
  SF: "Półfinał",
  THIRD: "Mecz o 3. miejsce",
  FINAL: "Finał",
};

export const RoleSchema = z.enum(["ADMIN", "PLAYER"]);
export type Role = z.infer<typeof RoleSchema>;

// ---------- Auth ----------

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  pin: z.string().regex(/^\d{4,6}$/, "PIN musi mieć 4-6 cyfr"),
});

export const PublicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: RoleSchema,
  active: z.boolean(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ---------- Admin: users ----------

export const CreateUserSchema = z.object({
  username: z.string().trim().min(1).max(40),
  pin: z.string().regex(/^\d{4,6}$/, "PIN musi mieć 4-6 cyfr"),
  role: RoleSchema.default("PLAYER"),
});

export const UpdateUserSchema = z.object({
  username: z.string().trim().min(1).max(40).optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN musi mieć 4-6 cyfr").optional(),
  role: RoleSchema.optional(),
  active: z.boolean().optional(),
});

// ---------- Matches ----------

export const MatchSchema = z.object({
  id: z.string(),
  tournament: z.string(),
  phase: PhaseSchema,
  groupName: z.string().nullable(),
  matchNo: z.number().nullable(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeCode: z.string().nullable(),
  awayCode: z.string().nullable(),
  kickoff: z.string(), // ISO
  venue: z.string().nullable(),
  city: z.string().nullable(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  lockOverride: z.boolean(),
  finished: z.boolean(),
  settled: z.boolean(),
  settledAt: z.string().nullable(),
  dataSource: z.string(),
  // derived
  locked: z.boolean(), // typing closed (started / override / finished)
  status: z.enum(["UPCOMING", "LIVE", "AWAITING", "FINISHED"]),
});
export type MatchDTO = z.infer<typeof MatchSchema>;

export const ImportMatchSchema = z.object({
  phase: PhaseSchema,
  groupName: z.string().nullable().optional(),
  matchNo: z.number().nullable().optional(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeCode: z.string().nullable().optional(),
  awayCode: z.string().nullable().optional(),
  kickoff: z.string(), // ISO datetime
  venue: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});
export const ImportScheduleSchema = z.object({
  matches: z.array(ImportMatchSchema),
  replaceAll: z.boolean().default(false),
});

export const CreateMatchSchema = ImportMatchSchema.extend({
  tournament: z.string().optional(),
});

export const UpdateMatchSchema = z.object({
  phase: PhaseSchema.optional(),
  groupName: z.string().nullable().optional(),
  matchNo: z.number().nullable().optional(),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  homeCode: z.string().nullable().optional(),
  awayCode: z.string().nullable().optional(),
  kickoff: z.string().optional(),
  venue: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  lockOverride: z.boolean().optional(),
});

export const SetResultSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  finished: z.boolean().default(true),
});

// ---------- Predictions ----------

export const SubmitPredictionSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

export const PredictionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  userId: z.string(),
  username: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  updatedAt: z.string(),
});
export type PredictionDTO = z.infer<typeof PredictionSchema>;

// ---------- Ranking ----------

export const RankRowSchema = z.object({
  rank: z.number(),
  userId: z.string(),
  username: z.string(),
  balance: z.number(),
  hits: z.number(),
  predictions: z.number(),
  settledMatches: z.number(),
});
export type RankRow = z.infer<typeof RankRowSchema>;

// ---------- Settlement ----------

export const SettlementEntrySchema = z.object({
  userId: z.string(),
  username: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  hit: z.boolean(),
  points: z.number(),
});
export type SettlementEntry = z.infer<typeof SettlementEntrySchema>;
