"use client";

import { useState } from "react";
import type { QA, Report as ReportT, Topic } from "@/lib/schemas";
import { MasteryBars, VerdictBadge, topicMastery } from "./ui";

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button onClick={() => setFlipped((f) => !f)} className="group h-40 w-full [perspective:1000px]" aria-label="Flip card">
      <div className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-center text-sm font-medium [backface-visibility:hidden]">
          {front}
          <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-zinc-600">tap to flip</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center overflow-auto rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 text-center text-sm text-orange-100 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </button>
  );
}

function toMarkdown(title: string, r: ReportT, history: QA[], topics: Topic[]) {
  const name = (id: string) => topics.find((t) => t.id === id)?.name ?? id;
  return [
    `# GrillMe study pack — ${title}`,
    `**Grade:** ${r.grade} — ${r.headline}`,
    "",
    "## Knowledge gaps",
    ...r.gaps.map((g) => `- **${g.topic}:** ${g.issue}\n  - ✅ ${g.fix}`),
    "",
    "## Flashcards",
    ...r.flashcards.map((f) => `- **Q:** ${f.front}\n  **A:** ${f.back}`),
    "",
    "## Study plan",
    ...r.studyPlan.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Exam transcript",
    ...history.map((h, i) => `**Q${i + 1} (${name(h.topicId)}):** ${h.question}\n\n> ${h.answer}\n\n_${h.verdict} · ${h.score}/100_ — ${h.feedback}\n`),
  ].join("\n");
}

export default function Report({
  title,
  report,
  history,
  topics,
  onRegrill,
  onRestart,
}: {
  title: string;
  report: ReportT;
  history: QA[];
  topics: Topic[];
  onRegrill: (weak: Topic[]) => void;
  onRestart: () => void;
}) {
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : 0;
  const bluffs = history.filter((h) => h.verdict === "bluff").length;
  const weak = topicMastery(topics, history)
    .filter((m) => m.avg !== null && m.avg < 70)
    .map((m) => m.topic);
  const untested = topicMastery(topics, history).filter((m) => m.avg === null).map((m) => m.topic);
  const regrillTopics = weak.length ? weak : untested;
  const topicName = (id: string) => topics.find((t) => t.id === id)?.name ?? "";

  const download = () => {
    const blob = new Blob([toMarkdown(title, report, history, topics)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "grillme-study-pack.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-10 fade-in">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-8 text-center">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Final grade</div>
          <div className="mt-2 bg-gradient-to-br from-orange-300 to-red-500 bg-clip-text text-8xl font-black text-transparent">{report.grade}</div>
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-bold tabular-nums">{avg}</div><div className="text-[11px] text-zinc-500">avg score</div></div>
            <div><div className="text-2xl font-bold tabular-nums">{history.length}</div><div className="text-[11px] text-zinc-500">questions</div></div>
            <div><div className="text-2xl font-bold tabular-nums text-fuchsia-300">{bluffs}</div><div className="text-[11px] text-zinc-500">bluffs caught</div></div>
          </div>
        </div>
        <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7">
          <p className="text-xl font-semibold leading-snug">“{report.headline}”</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Mastery map</h3>
              <MasteryBars topics={topics} history={history} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-400/80">You clearly get</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {report.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {report.gaps.length > 0 && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-400/80">Your knowledge gaps</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {report.gaps.map((g, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="text-xs uppercase tracking-wider text-orange-300/80">{g.topic}</div>
                <p className="mt-1 text-sm text-rose-200/90">✗ {g.issue}</p>
                <p className="mt-2 text-sm text-zinc-300">✓ {g.fix}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Flashcards made from your mistakes</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {report.flashcards.map((f, i) => <Flashcard key={i} {...f} />)}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Study plan</h3>
          <ol className="space-y-3 text-sm text-zinc-300">
            {report.studyPlan.map((s, i) => (
              <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-300">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </section>
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Transcript</h3>
          <div className="max-h-80 space-y-4 overflow-auto pr-2">
            {history.map((h, i) => (
              <details key={i} className="rounded-xl bg-zinc-950/50 p-3 text-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="truncate text-zinc-300">Q{i + 1}. {topicName(h.topicId)}</span>
                  <VerdictBadge verdict={h.verdict} score={h.score} />
                </summary>
                <p className="mt-3 text-zinc-400"><b className="text-zinc-300">Q:</b> {h.question}</p>
                <p className="mt-1 text-zinc-400"><b className="text-zinc-300">You:</b> {h.answer}</p>
                <p className="mt-1 text-zinc-400"><b className="text-zinc-300">Examiner:</b> {h.feedback}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {regrillTopics.length > 0 && (
          <button onClick={() => onRegrill(regrillTopics)} className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-bold text-white hover:brightness-110">
            🔥 Re-grill me on {weak.length ? "my weak topics" : "untested topics"} ({regrillTopics.length})
          </button>
        )}
        <button onClick={download} className="rounded-2xl border border-zinc-700 px-6 py-3 font-medium text-zinc-200 hover:bg-zinc-800">⬇ Download study pack</button>
        <button onClick={onRestart} className="rounded-2xl px-6 py-3 text-zinc-400 hover:text-zinc-200">New material</button>
      </div>
    </div>
  );
}
