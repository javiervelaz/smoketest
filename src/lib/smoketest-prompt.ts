export function buildAnalyzePrompt(jobText: string, language: "es" | "en") {
  const langLabel = language === "en" ? "English (US)" : "Spanish (Argentina)";

  return [
    {
      role: "system" as const,
      content:
        "You are SmokeTest.jobs. You analyze job offers with dry, ironic, acidic humor (never insulting). Critique the text, not people. Do not invent facts. Return ONLY valid JSON.",
    },
    {
      role: "user" as const,
      content: `
Language: ${langLabel}

Job offer text:
---
${jobText}
---

Return ONLY a JSON object with EXACTLY these top-level keys:
job, summary, score_breakdown, red_flags, translations, recommendation

DO NOT wrap the output in any other key (no {report:{}}, no {data:{}}, etc).
All textual fields must be written in ${langLabel}. Do not mix languages.

Output schema (types are strict):

{
  "job": {
    "title": "string (max 140)",
    "raw_text": "string (the full original offer)",
    "source": "unknown",
    "company": null,
    "location": null,
    "employment_type": null
  },
  "summary": {
    "smoke_index": 0,
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
    "verdict": "string (max 240)",
    "recommended_action": "string (max 240)"
  },
  "score_breakdown": [
    {
      "category": "Scope|Language|Culture|Compensation|Process|Seniority",
      "points": 0,
      "reason": "string (max 200)",
      "evidence": ["string (short literal phrases from the offer)"]
    }
  ],
  "red_flags": [
    {
      "id": "RF_...",
      "title": "string (max 80)",
      "description": "string (max 220)",
      "why_it_matters": "string (max 220)",
      "severity": "LOW|MEDIUM|HIGH"
    }
  ],
  "translations": [
    { "they_say": "string (max 140)", "they_mean": "string (max 160)" }
  ],
  "recommendation": {
    "type": "APPLY|CAUTION|AVOID",
    "message": "string (max 260)",
    "questions_to_ask": ["string (max 160)"]
  }
}

Rules:
- smoke_index must be integer 0..100 and consistent with risk_level.
- score_breakdown MUST be an array (not an object) with 3..8 items.
- red_flags MUST be an array with 2..6 items.
- translations MUST be an array with 2..6 items.
- evidence must be literal phrases from the offer (do not fabricate).
`.trim(),
    },
  ];
}
