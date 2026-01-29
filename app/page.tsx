"use client";

import { useMemo, useState } from "react";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RecType = "APPLY" | "CAUTION" | "AVOID";

type ReportV1 = {
  meta: {
    version: "1.0";
    language: string;
    analyzed_at: string;
    analysis_id: string;
    confidence: number;
  };
  job: { title: string; raw_text: string; source?: string };
  summary: {
    smoke_index: number;
    risk_level: RiskLevel;
    verdict: string;
    recommended_action: string;
  };
  score_breakdown: {
    category: string;
    points: number;
    reason: string;
    evidence: string[];
  }[];
  red_flags: {
    id: string;
    title: string;
    description: string;
    why_it_matters: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }[];
  translations: { they_say: string; they_mean: string }[];
  recommendation: { type: RecType; message: string; questions_to_ask: string[] };
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function SmokeBrand({ subtle }: { subtle?: boolean }) {
  return (
    <span className={classNames("font-extrabold tracking-tight", subtle ? "text-slate-900" : "text-slate-900")}>
      smoketest<span className="text-[rgb(var(--accent))]">.</span>jobs
    </span>
  );
}

function riskLabel(risk: RiskLevel) {
  // pills para light UI
  switch (risk) {
    case "LOW":
      return { text: "Bajo", pill: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "MEDIUM":
      return { text: "Medio", pill: "bg-amber-50 text-amber-900 border-amber-200" };
    case "HIGH":
      return { text: "Alto", pill: "bg-red-50 text-red-800 border-red-200" };
    case "CRITICAL":
      return { text: "Crítico", pill: "bg-[rgba(var(--accent),0.12)] text-slate-900 border-[rgba(var(--accent),0.35)]" };
  }
}

function recLabel(t: RecType) {
  if (t === "APPLY") return { title: "Dale para adelante", sub: "Suena razonable. Igual preguntá lo importante." };
  if (t === "CAUTION") return { title: "Con cuidado", sub: "Hay señales mixtas. Andá con preguntas claras." };
  return { title: "Mejor evitá", sub: "Demasiadas banderas rojas para tu paz mental." };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ScoreGauge({ score }: { score: number }) {
  const pct = clamp(score, 0, 100);

  // fondo claro + progreso con acento
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-5xl font-extrabold tracking-tight text-slate-900">{score}</div>
        <div className="text-sm text-slate-500">/ 100</div>
      </div>

      <div className="h-3 w-full rounded-full bg-slate-200/80 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: score >= 56 ? "rgb(var(--accent))" : "rgba(15, 23, 42, 0.55)",
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--accent))" }} />
        No es la verdad absoluta. Es un detector de humo, no un oráculo.
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={classNames(
        // light premium card
        "rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.10)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {right}
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} right={right} />
      <div className="px-5 py-4">{children}</div>
    </Card>
  );
}

async function analyze(jobText: string, language: "es" | "en"): Promise<ReportV1> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobText, language }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Error analizando la oferta");
  }
  return res.json();
}

function SoftBg() {
  // fondo lindo sin tocar globals.css (si querés luego lo movemos)
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100" />
      <div
        className="absolute -top-24 left-[-120px] h-[480px] w-[480px] rounded-full blur-3xl opacity-25"
        style={{ background: "rgb(var(--accent))" }}
      />
      <div className="absolute top-[-140px] right-[-160px] h-[520px] w-[520px] rounded-full bg-sky-300/30 blur-3xl opacity-40" />
      <div className="absolute bottom-[-220px] left-[20%] h-[520px] w-[520px] rounded-full bg-indigo-200/25 blur-3xl opacity-50" />
    </div>
  );
}

export default function Page() {
  const [jobText, setJobText] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(() => jobText.trim().length >= 20, [jobText]);

  async function onAnalyze() {
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const r = await analyze(jobText, lang);
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const pill = report ? riskLabel(report.summary.risk_level) : null;

  return (
    <div className="min-h-screen text-slate-900">
      <SoftBg />

      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <div className="text-lg">
              <SmokeBrand />
            </div>
            <div className="text-xs text-slate-600">Pegá una oferta. Te decimos qué huele raro.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm">
            <button
              className={classNames(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                lang === "es"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
              onClick={() => setLang("es")}
            >
              Español
            </button>
            <button
              className={classNames(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                lang === "en"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
              onClick={() => setLang("en")}
            >
              English
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl px-5 pb-16">
        {/* Hero: Input + Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Input */}
          <Card className="lg:col-span-7 overflow-hidden">
            <div className="px-5 pt-5">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                ¿Oportunidad… o incendio con emojis?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Pegá el texto tal cual. Te devolvemos un reporte claro, con puntaje y señales concretas.
              </p>
            </div>

            <div className="px-5 pt-4">
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Pegá acá la oferta laboral…"
                className="min-h-[240px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[rgba(var(--accent),0.18)]"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span
                    className={classNames(
                      "inline-block h-2 w-2 rounded-full",
                      canAnalyze ? "bg-slate-700" : "bg-slate-300"
                    )}
                  />
                  {canAnalyze ? "Listo para analizar" : "Pegá al menos 20 caracteres"}
                </div>

                <div className="flex items-center gap-2">
                  <div className="sm:hidden flex items-center rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                    <button
                      className={classNames(
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        lang === "es" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      )}
                      onClick={() => setLang("es")}
                    >
                      ES
                    </button>
                    <button
                      className={classNames(
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        lang === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      )}
                      onClick={() => setLang("en")}
                    >
                      EN
                    </button>
                  </div>

                  <button
                    disabled={!canAnalyze || loading}
                    onClick={onAnalyze}
                    className={classNames(
                      "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                      "bg-slate-900 text-white hover:bg-slate-800",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "shadow-[0_14px_36px_rgba(0,0,0,0.12)]"
                    )}
                  >
                    {loading ? "Analizando…" : "Analizar oferta"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-[rgba(var(--accent),0.35)] bg-[rgba(var(--accent),0.08)] p-4 text-sm">
                  <div className="font-semibold text-slate-900">Ups. Algo falló.</div>
                  <div className="mt-1 text-slate-700 break-words">{error}</div>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200/70 px-5 py-4 text-xs text-slate-500">
              Tip: pegá ofertas con “excelente clima”, “mentalidad startup” y “alta autonomía”. Es combustible premium.
            </div>
          </Card>

          {/* Summary */}
          <div className="lg:col-span-5 space-y-6">
            <Section
              title="Resultado"
              right={
                report && (
                  <span className={classNames("rounded-full border px-3 py-1 text-xs font-semibold", pill!.pill)}>
                    Riesgo {pill!.text}
                  </span>
                )
              }
            >
              {!report ? (
                <div className="text-sm text-slate-600">
                  Cuando analices una oferta, acá vas a ver el puntaje y el veredicto.
                </div>
              ) : (
                <div className="space-y-4">
                  <ScoreGauge score={report.summary.smoke_index} />

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Título detectado</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{report.job.title}</div>

                    <div className="mt-3 text-xs text-slate-500">Veredicto</div>
                    <div className="mt-1 text-sm text-slate-700">{report.summary.verdict}</div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Qué haría yo</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{report.summary.recommended_action}</div>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {report && (
              <Section title="Recomendación" right={<span className="text-xs text-slate-500">ID {report.meta.analysis_id}</span>}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center shadow-sm">
                    <span className="text-sm font-black text-slate-900">
                      {report.recommendation.type === "APPLY"
                        ? "✓"
                        : report.recommendation.type === "CAUTION"
                        ? "!"
                        : "×"}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{recLabel(report.recommendation.type).title}</div>
                    <div className="text-xs text-slate-500">{recLabel(report.recommendation.type).sub}</div>
                    <div className="mt-2 text-sm text-slate-700">{report.recommendation.message}</div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-900">Preguntas para la entrevista</div>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {report.recommendation.questions_to_ask.map((q, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--accent))" }} />
                            <span className="flex-1">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Details */}
        {report && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Section title="Banderas rojas">
              <div className="space-y-3">
                {report.red_flags.map((rf) => {
                  const sev =
                    rf.severity === "HIGH"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : rf.severity === "MEDIUM"
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200";

                  return (
                    <div key={rf.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{rf.title}</div>
                          <div className="mt-1 text-sm text-slate-700">{rf.description}</div>
                        </div>

                        <span className={classNames("shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold", sev)}>
                          {rf.severity}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-900">Por qué importa</div>
                        <div className="mt-1 text-sm text-slate-700">{rf.why_it_matters}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Traducción corporativa → humano">
              <div className="space-y-3">
                {report.translations.map((t, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500">Ellos dicen</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{t.they_say}</div>

                    <div className="my-3 h-px bg-slate-100" />

                    <div className="text-xs font-semibold text-slate-500">En criollo</div>
                    <div className="mt-1 text-sm text-slate-700">{t.they_mean}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="De dónde sale el puntaje">
              <div className="space-y-3">
                {report.score_breakdown.map((b, i) => {
                  const pct = clamp(b.points * 10, 0, 100); // si tu "points" es 0..10
                  return (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">{b.category}</div>
                        <div className="text-sm font-extrabold text-slate-900">{b.points}</div>
                      </div>

                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "rgba(15,23,42,0.70)",
                          }}
                        />
                      </div>

                      <div className="mt-2 text-sm text-slate-700">{b.reason}</div>

                      {b.evidence?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {b.evidence.slice(0, 8).map((e, idx) => (
                            <span
                              key={idx}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                              title={e}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        <footer className="mt-10 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
          <div>
            <SmokeBrand subtle /> — detector de humo para ofertas laborales.
          </div>
          <div>Hecho para humanos. Los robots pueden seguir postulando a “ambiente dinámico”.</div>
        </footer>
      </main>
    </div>
  );
}
