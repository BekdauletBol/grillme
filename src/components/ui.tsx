"use client";

import type { QA, Topic, Turn } from "@/lib/schemas";

export const VERDICT: Record<Turn["verdict"], { label: string; cls: string; emoji: string }> = {
  nailed: { label: "Nailed it", emoji: "🎯", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40" },
  solid: { label: "Solid", emoji: "✅", cls: "bg-lime-500/15 text-lime-300 ring-lime-400/40" },
  partial: { label: "Partial", emoji: "🟡", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/40" },
  wrong: { label: "Wrong", emoji: "❌", cls: "bg-rose-500/15 text-rose-300 ring-rose-400/40" },
  bluff: { label: "Bluff detected", emoji: "🕵️", cls: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40" },
  skipped: { label: "Skipped", emoji: "🤷", cls: "bg-zinc-500/15 text-zinc-300 ring-zinc-400/40" },
};

export function VerdictBadge({ verdict, score }: { verdict: Turn["verdict"]; score?: number }) {
  const v = VERDICT[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${v.cls}`}>
      <span>{v.emoji}</span>
      {v.label}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}

export function topicMastery(topics: Topic[], history: QA[]) {
  return topics.map((t) => {
    const qs = history.filter((h) => h.topicId === t.id);
    const avg = qs.length ? Math.round(qs.reduce((s, q) => s + q.score, 0) / qs.length) : null;
    return { topic: t, avg, count: qs.length };
  });
}

function heat(avg: number | null) {
  if (avg === null) return "bg-zinc-700";
  if (avg >= 80) return "bg-emerald-400";
  if (avg >= 60) return "bg-lime-400";
  if (avg >= 40) return "bg-amber-400";
  return "bg-rose-500";
}

export function MasteryBars({ topics, history, activeId }: { topics: Topic[]; history: QA[]; activeId?: string }) {
  return (
    <ul className="space-y-3">
      {topicMastery(topics, history).map(({ topic, avg, count }) => (
        <li key={topic.id}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className={`truncate ${activeId === topic.id ? "text-orange-300 font-semibold" : "text-zinc-300"}`}>
              {activeId === topic.id && "▸ "}
              {topic.name}
            </span>
            <span className="ml-2 shrink-0 tabular-nums text-zinc-500">
              {avg === null ? "—" : `${avg}%`}
              {count > 0 && <span className="ml-1 text-zinc-600">({count})</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${heat(avg)}`}
              style={{ width: avg === null ? "4%" : `${Math.max(avg, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Orb({ state }: { state: "idle" | "speaking" | "listening" | "thinking" }) {
  const color =
    state === "listening"
      ? "from-sky-400 via-cyan-300 to-blue-500"
      : state === "thinking"
        ? "from-fuchsia-500 via-purple-400 to-indigo-500"
        : "from-orange-500 via-amber-400 to-red-500";
  return (
    <div className="relative mx-auto h-28 w-28">
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${color} blur-2xl opacity-60 ${
          state === "idle" ? "" : "animate-pulse"
        }`}
      />
      <div
        className={`relative h-full w-full rounded-full bg-gradient-to-br ${color} shadow-2xl transition-transform duration-300 ${
          state === "speaking" ? "orb-speak" : state === "thinking" ? "animate-spin [animation-duration:3s]" : ""
        }`}
      >
        <div className="absolute inset-3 rounded-full bg-black/30 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          {state === "listening" ? "👂" : state === "thinking" ? "🧠" : "🔥"}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-zinc-400">
      <Orb state="thinking" />
      <p className="animate-pulse text-sm">{label}</p>
    </div>
  );
}
