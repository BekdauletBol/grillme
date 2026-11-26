"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang, Persona, QA, Topic, Turn } from "@/lib/schemas";
import { useSpeaker, useSpeechInput } from "@/lib/speech";
import { MasteryBars, Orb, VerdictBadge } from "./ui";

export interface ExamSetup {
  title: string;
  knowledgeBase: string;
  topics: Topic[];
  persona: Persona;
  lang: Lang;
  totalQuestions: number;
  /** Opening question; if absent we ask the server for one (re-grill mode). */
  first?: { question: string; topicId: string };
  previous?: QA[];
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "Bad server response" }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function Exam({
  setup,
  onFinish,
  onQuit,
}: {
  setup: ExamSetup;
  onFinish: (history: QA[]) => void;
  onQuit: () => void;
}) {
  const [history, setHistory] = useState<QA[]>([]);
  const [current, setCurrent] = useState<{ question: string; topicId: string; followUp: boolean } | null>(
    setup.first ? { ...setup.first, followUp: false } : null,
  );
  const [last, setLast] = useState<{ turn: Turn; answer: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(!setup.first);
  const [error, setError] = useState("");
  const [handsFree, setHandsFree] = useState(true);
  const mic = useSpeechInput(setup.lang);
  const tts = useSpeaker(setup.lang);
  const startedRef = useRef(false);

  const topicName = (id: string) => setup.topics.find((t) => t.id === id)?.name ?? "";

  const ask = useCallback(
    async (text: string) => {
      await tts.speak(text);
      if (handsFree && mic.supported) mic.start();
    },
    [tts, handsFree, mic],
  );

  // Kick-off: speak first question, or fetch an opener in re-grill mode.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (setup.first) {
      ask(setup.first.question);
      return;
    }
    postJSON<Turn>("/api/turn", {
      knowledgeBase: setup.knowledgeBase,
      topics: setup.topics,
      history: [],
      question: "",
      topicId: "",
      answer: "",
      persona: setup.persona,
      lang: setup.lang,
      totalQuestions: setup.totalQuestions,
      start: true,
      previous: setup.previous,
    })
      .then((t) => {
        setCurrent({ question: t.nextQuestion, topicId: t.nextTopicId, followUp: false });
        setBusy(false);
        ask(`${t.feedback} ${t.nextQuestion}`);
      })
      .catch((e: Error) => { setError(e.message); setBusy(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answerText = mic.listening ? mic.transcript : draft;

  const submit = async (skip = false) => {
    if (!current || busy) return;
    tts.cancel();
    const spoken = mic.listening ? mic.stop() || mic.transcript : "";
    const answer = skip ? "" : (spoken || draft).trim();
    if (!skip && !answer) {
      setError("Say or type an answer first — or hit “I don't know”.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const turn = await postJSON<Turn>("/api/turn", {
        knowledgeBase: setup.knowledgeBase,
        topics: setup.topics,
        history,
        question: current.question,
        topicId: current.topicId,
        answer,
        persona: setup.persona,
        lang: setup.lang,
        totalQuestions: setup.totalQuestions,
      });
      const qa: QA = {
        question: current.question,
        topicId: setup.topics.some((t) => t.id === turn.topicId) ? turn.topicId : current.topicId,
        answer: skip ? "(I don't know)" : answer,
        verdict: skip ? "skipped" : turn.verdict,
        score: skip ? 0 : turn.score,
        feedback: turn.feedback,
        missedPoint: turn.missedPoint,
      };
      const next = [...history, qa];
      setHistory(next);
      setLast({ turn: { ...turn, verdict: qa.verdict, score: qa.score }, answer: qa.answer });
      setDraft("");
      mic.setTranscript("");

      if (!turn.nextQuestion) {
        setCurrent(null);
        await tts.speak(turn.feedback);
        onFinish(next);
        return;
      }
      setCurrent({ question: turn.nextQuestion, topicId: turn.nextTopicId, followUp: turn.nextIsFollowUp });
      setBusy(false);
      ask(`${turn.feedback} ${turn.nextQuestion}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const orbState = busy ? "thinking" : mic.listening ? "listening" : tts.speaking ? "speaking" : "idle";
  const qNum = Math.min(history.length + 1, setup.totalQuestions);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-5">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <button onClick={() => { tts.cancel(); mic.stop(); onQuit(); }} className="hover:text-zinc-300">← Exit</button>
          <span className="truncate px-3">{setup.title}</span>
          <span className="tabular-nums">Q {qNum}/{setup.totalQuestions}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700" style={{ width: `${(history.length / setup.totalQuestions) * 100}%` }} />
        </div>

        {last && (
          <div key={history.length} className="fade-in rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={last.turn.verdict} score={last.turn.score} />
              <span className="text-xs text-zinc-500">on “{topicName(history[history.length - 1]?.topicId ?? "")}”</span>
            </div>
            <p className="mt-3 text-zinc-200">{last.turn.feedback}</p>
            {last.turn.missedPoint && (
              <p className="mt-2 text-sm text-amber-300/90">
                <span className="font-semibold">Missed:</span> {last.turn.missedPoint}
              </p>
            )}
          </div>
        )}

        <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-7 text-center">
          <Orb state={orbState} />
          {current ? (
            <>
              <div className="mt-5 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-orange-300/80">
                {current.followUp && <span className="rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-fuchsia-300">follow-up</span>}
                {topicName(current.topicId)}
              </div>
              <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl">{current.question}</h2>
              <button onClick={() => tts.speak(current.question)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300">🔊 repeat</button>
            </>
          ) : (
            <p className="mt-6 text-zinc-500">{busy ? "Your examiner is preparing…" : "Exam complete."}</p>
          )}
        </div>

        {current && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <textarea
              value={answerText}
              onChange={(e) => { if (mic.listening) mic.stop(); setDraft(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder={mic.supported ? "Tap the mic and explain out loud… (or type)" : "Type your answer… (voice works in Chrome/Edge)"}
              disabled={busy}
              className="h-28 w-full resize-none bg-transparent text-lg outline-none placeholder:text-zinc-600"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {mic.supported && (
                <button
                  onClick={() => (mic.listening ? (setDraft(mic.stop() || mic.transcript)) : (tts.cancel(), mic.start()))}
                  disabled={busy}
                  className={`flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition disabled:opacity-40 ${
                    mic.listening ? "bg-sky-500 text-white ring-4 ring-sky-500/30 animate-pulse" : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {mic.listening ? "⏺ Listening… tap to pause" : "🎙️ Speak"}
                </button>
              )}
              <button
                onClick={() => submit()}
                disabled={busy}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {busy ? "Grading…" : "Submit answer ⏎"}
              </button>
              <button onClick={() => submit(true)} disabled={busy} className="rounded-full px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
                I don&apos;t know
              </button>
              <div className="ml-auto flex items-center gap-4 text-xs text-zinc-500">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={tts.enabled} onChange={(e) => { tts.setEnabled(e.target.checked); if (!e.target.checked) tts.cancel(); }} className="accent-orange-500" />
                  Voice
                </label>
                {mic.supported && (
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="accent-orange-500" />
                    Auto-listen
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        {error && <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
      </section>

      <aside className="space-y-5">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Live mastery map</h3>
          <MasteryBars topics={setup.topics} history={history} activeId={current?.topicId} />
        </div>
        {history.length > 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Answers</h3>
            <ol className="space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-400">{i + 1}. {topicName(h.topicId)}</span>
                  <VerdictBadge verdict={h.verdict} />
                </li>
              ))}
            </ol>
            <button
              onClick={() => { tts.cancel(); mic.stop(); onFinish(history); }}
              disabled={busy}
              className="mt-4 w-full rounded-xl border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              End now & get report
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
