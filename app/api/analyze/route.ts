import { NextResponse } from "next/server";
import { SmokeTestReportV1Schema } from "@/src/lib/smoketest-schema";
import { buildAnalyzePrompt } from "@/src/lib/smoketest-prompt";
import { nanoid } from "nanoid";

export const runtime = "nodejs"; // recomendado para SDKs y estabilidad

type ReqBody = {
  jobText: string;
  language : string;
};



function clampStr(s: unknown, max = 60) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  // dejamos 1 char para el …
  return t.slice(0, max - 1).trimEnd() + "…";
}

function sanitizeReport(report: any) {
  if (Array.isArray(report?.score_breakdown)) {
    report.score_breakdown = report.score_breakdown.map((b: any) => ({
      ...b,
      evidence: Array.isArray(b?.evidence)
        ? b.evidence.map((e: any) => clampStr(e, 60))
        : [],
    }));
  }
  return report;
}


function normalizeJobText(input: string) {
  let s = String(input ?? "");

  // 1) Normalizar Unicode (reduce variantes raras)
  // NFKC es buena para “texto de copy/paste”
  try {
    s = s.normalize("NFKC");
  } catch {}

  // 2) Unificar saltos de línea
  s = s.replace(/\r\n?/g, "\n");

  // 3) Sacar caracteres invisibles comunes (ZWSP, BOM, etc.)
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 4) Convertir NBSP a espacio normal
  s = s.replace(/\u00A0/g, " ");

  // 5) Normalizar bullets raros a "-"
  s = s.replace(/[•·∙●◦]/g, "-");

  // 6) Quitar espacios a la izquierda/derecha por línea, colapsar espacios múltiples
  s = s
    .split("\n")
    .map((line) => line.trim().replace(/\s{2,}/g, " "))
    .join("\n");

  // 7) Colapsar muchas líneas vacías
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  // 8) Límite duro para evitar prompts gigantes
  const MAX = 18000;
  if (s.length > MAX) s = s.slice(0, MAX);

  return s;
}


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const jobText = normalizeJobText(body?.jobText);
    const language = body?.language === "en" ? "en" : "es";

    if (!jobText || jobText.length < 20) {
      return NextResponse.json(
        { error: "jobText demasiado corto" },
        { status: 400 }
      );
    }

    const messages = buildAnalyzePrompt(jobText,language);

    // Llamada simple a OpenAI vía fetch (sin SDK para evitar líos de versión)
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "OpenAI error", detail: txt },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Respuesta vacía del modelo" },
        { status: 502 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);

    } catch {
      return NextResponse.json(
        { error: "El modelo devolvió JSON inválido", raw: content },
        { status: 502 }
      );
    }

    const candidate = parsed?.job ? parsed
    : parsed?.report?.job ? parsed.report
    : parsed?.result?.job ? parsed.result
    : parsed?.data?.job ? parsed.data
    : parsed;

    const reportWithMeta = {
    meta: {
        version: "1.0",
        language: language === "en" ? "en-US" : "es-AR",
        analyzed_at: new Date().toISOString(),
        analysis_id: `st_${nanoid(10)}`,
        confidence: Number(candidate?.meta?.confidence ?? 0.85),
    },
    ...candidate,
    };

    // Validación estricta
    const sanitized = sanitizeReport(reportWithMeta);
    const validated = SmokeTestReportV1Schema.parse(sanitized);

    return NextResponse.json(validated, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
