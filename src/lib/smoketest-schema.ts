import { z } from "zod";

export const RiskLevel = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const RecommendationType = z.enum(["APPLY", "CAUTION", "AVOID"]);

export const SmokeTestReportV1Schema = z.object({
  meta: z.object({
    version: z.literal("1.0"),
    language: z.string().default("es-AR"),
    analyzed_at: z.string(), // ISO
    analysis_id: z.string(),
    confidence: z.number().min(0).max(1),
  }),

  job: z.object({
    title: z.string().min(1).max(140),
    raw_text: z.string().min(20).max(20000),
    source: z.string().optional().default("unknown"),
    company: z.string().nullable().optional().default(null),
    location: z.string().nullable().optional().default(null),
    employment_type: z.string().nullable().optional().default(null),
  }),

  summary: z.object({
    smoke_index: z.number().int().min(0).max(100),
    risk_level: RiskLevel,
    verdict: z.string().min(10).max(240),
    recommended_action: z.string().min(10).max(240),
  }),

  score_breakdown: z
    .array(
      z.object({
        category: z.enum(["Scope", "Language", "Culture", "Compensation", "Process", "Seniority"]),
        points: z.number().int().min(0).max(100),
        reason: z.string().min(8).max(200),
        evidence: z.array(z.string().min(1).max(60)).max(12),
      })
    )
    .min(3)
    .max(8),

  red_flags: z
    .array(
      z.object({
        id: z.string().min(6).max(30),
        title: z.string().min(6).max(80),
        description: z.string().min(10).max(220),
        why_it_matters: z.string().min(10).max(220),
        severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
      })
    )
    .min(2)
    .max(6),

  translations: z
    .array(
      z.object({
        they_say: z.string().min(3).max(140),
        they_mean: z.string().min(3).max(160),
      })
    )
    .min(2)
    .max(6),

  recommendation: z.object({
    type: RecommendationType,
    message: z.string().min(10).max(260),
    questions_to_ask: z.array(z.string().min(8).max(160)).min(3).max(7),
  }),
});

export type SmokeTestReportV1 = z.infer<typeof SmokeTestReportV1Schema>;
