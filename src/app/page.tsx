"use client";

import { useState } from "react";
import Setup, { type SetupConfig } from "@/components/Setup";
import Exam, { type ExamSetup } from "@/components/Exam";
import Report from "@/components/Report";
import { Spinner } from "@/components/ui";
import type { Analysis, QA, Report as ReportT, Topic } from "@/lib/schemas";

type Stage =
  | { name: "setup"; error?: string }
  | { name: "analyzing"; source: string }
  | { name: "exam"; setup: ExamSetup; runId: number }
  | { name: "grading" }
  | { name: "report"; report: ReportT; history: QA[] };

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "Bad server response" }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>({ name: "setup" });
  const [base, setBase] = useState<(Analysis & { cfg: SetupConfig }) | null>(null);
  const [examSetup, setExamSetup] = useState<ExamSetup | null>(null);

  const start = async (cfg: SetupConfig) => {
    setStage({ name: "analyzing", source: cfg.sourceName });
    try {
      const analysis = await postJSON<Analysis>("/api/analyze", { pdfBase64: cfg.pdfBase64, text: cfg.text, lang: cfg.lang });
      setBase({ ...analysis, cfg });
      const setup: ExamSetup = {
        title: analysis.title,
        knowledgeBase: analysis.knowledgeBase,
        topics: analysis.topics,
        persona: cfg.persona,
        lang: cfg.lang,
        totalQuestions: cfg.totalQuestions,
        first: { question: analysis.firstQuestion, topicId: analysis.firstTopicId },
      };
      setExamSetup(setup);
      setStage({ name: "exam", setup, runId: Date.now() });
    } catch (e) {
      setStage({ name: "setup", error: (e as Error).message });
    }
  };

  const finish = async (history: QA[]) => {
    if (!examSetup || history.length === 0) {
      setStage({ name: "setup" });
      return;
    }
    setStage({ name: "grading" });
    try {
      const report = await postJSON<ReportT>("/api/report", {
        knowledgeBase: examSetup.knowledgeBase,
        topics: examSetup.topics,
        history,
        persona: examSetup.persona,
        lang: examSetup.lang,
      });
      setStage({ name: "report", report, history });
    } catch (e) {
      setStage({ name: "setup", error: `Report failed: ${(e as Error).message}` });
    }
  };

  const regrill = (weak: Topic[], previous: QA[]) => {
    if (!base) return;
    const setup: ExamSetup = {
      title: `${base.title} — re-grill`,
      knowledgeBase: base.knowledgeBase,
      topics: weak,
      persona: base.cfg.persona,
      lang: base.cfg.lang,
      totalQuestions: Math.max(3, Math.min(6, weak.length * 2)),
      previous: previous.filter((p) => weak.some((w) => w.id === p.topicId)),
    };
    setExamSetup(setup);
    setStage({ name: "exam", setup, runId: Date.now() });
  };

  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between px-6 py-4">
        <button onClick={() => setStage({ name: "setup" })} className="text-lg font-black tracking-tight">
          🔥 Grill<span className="text-orange-400">Me</span>
        </button>
        <span className="hidden text-xs text-zinc-600 sm:block">Explain it out loud — or you don&apos;t really know it.</span>
      </nav>

      {stage.name === "setup" && <Setup onStart={start} error={stage.error} />}
      {stage.name === "analyzing" && (
        <Spinner label={`Reading “${stage.source}”, mapping topics and sharpening questions…`} />
      )}
      {stage.name === "exam" && (
        <Exam key={stage.runId} setup={stage.setup} onFinish={finish} onQuit={() => setStage({ name: "setup" })} />
      )}
      {stage.name === "grading" && <Spinner label="Grading your exam and writing flashcards from your mistakes…" />}
      {stage.name === "report" && examSetup && (
        <Report
          title={examSetup.title}
          report={stage.report}
          history={stage.history}
          topics={examSetup.topics}
          onRegrill={(weak) => regrill(weak, stage.history)}
          onRestart={() => setStage({ name: "setup" })}
        />
      )}

      <footer className="mt-auto px-6 py-6 text-center text-xs text-zinc-600">
        Built for the Creators AI Winter Challenge · Powered by Claude
      </footer>
    </main>
  );
}
