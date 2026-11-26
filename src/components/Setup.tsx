"use client";

import { useRef, useState } from "react";
import type { Lang, Persona } from "@/lib/schemas";
import { SAMPLE_LECTURE, SAMPLE_TITLE } from "@/lib/sample";

export interface SetupConfig {
  pdfBase64?: string;
  text?: string;
  sourceName: string;
  persona: Persona;
  lang: Lang;
  totalQuestions: number;
}

const PERSONAS: { id: Persona; name: string; emoji: string; desc: string }[] = [
  { id: "mentor", name: "Mentor", emoji: "🧑‍🏫", desc: "Kind, encouraging, patient" },
  { id: "professor", name: "Professor", emoji: "🎓", desc: "Strict, precise, real-exam vibe" },
  { id: "savage", name: "Savage", emoji: "🔥", desc: "Roasts bluffs. Not for the weak." },
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Setup({ onStart, error }: { onStart: (c: SetupConfig) => void; error?: string }) {
  const [persona, setPersona] = useState<Persona>("professor");
  const [lang, setLang] = useState<Lang>("en");
  const [total, setTotal] = useState(6);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined | null) => {
    setLocalErr("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) {
        f.text().then((t) => { setText(t); setFile(null); });
        return;
      }
      setLocalErr("Please upload a PDF, .txt or .md file.");
      return;
    }
    if (f.size > 4_000_000) {
      setLocalErr("PDF is larger than 4 MB — export just the lecture you want to practice.");
      return;
    }
    setFile(f);
  };

  const start = async (useSample = false) => {
    const base = { persona, lang, totalQuestions: total };
    if (useSample) return onStart({ ...base, text: SAMPLE_LECTURE, sourceName: SAMPLE_TITLE });
    if (file) return onStart({ ...base, pdfBase64: await fileToBase64(file), sourceName: file.name });
    if (text.trim().length > 80) return onStart({ ...base, text, sourceName: "Your notes" });
    setLocalErr("Upload a PDF or paste your notes first — or try the demo lecture.");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20">
      <header className="pt-14 pb-10 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-300">
          🎙️ Voice-first AI oral exam · powered by Claude
        </div>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          Grill<span className="bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 bg-clip-text text-transparent">Me</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
          Re-reading your notes feels like learning. It isn&apos;t. Drop in your lecture and an AI examiner
          will <span className="text-zinc-100">question you out loud</span>, catch your bluffs, drill into
          what you don&apos;t actually understand — and hand you a map of your gaps.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Material */}
        <section className="lg:col-span-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">1 · Your material</h2>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
              drag ? "border-orange-400 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40"
            }`}
          >
            <span className="text-4xl">📄</span>
            <span className="mt-3 font-semibold">{file ? file.name : "Drop lecture slides / notes (PDF)"}</span>
            <span className="mt-1 text-sm text-zinc-500">
              {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to change` : "or click to browse · max 4 MB"}
            </span>
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf,.txt,.md" hidden onChange={(e) => pick(e.target.files?.[0])} />

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-zinc-600">
            <div className="h-px flex-1 bg-zinc-800" /> or paste notes <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (e.target.value) setFile(null); }}
            placeholder="Paste lecture notes, a textbook section, your summary…"
            className="h-32 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </section>

        {/* Settings */}
        <section className="lg:col-span-2 flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">2 · Your examiner</h2>
          <div className="space-y-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  persona === p.id ? "border-orange-400/70 bg-orange-500/10" : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-xs text-zinc-500">{p.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-500">
              Language
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Questions
              <select value={total} onChange={(e) => setTotal(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                <option value={4}>4 · quick</option>
                <option value={6}>6 · standard</option>
                <option value={10}>10 · full exam</option>
              </select>
            </label>
          </div>

          <div className="mt-auto pt-6 space-y-3">
            <button
              type="button"
              onClick={() => start(false)}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110 active:scale-[0.99]"
            >
              🔥 Start grilling
            </button>
            <button
              type="button"
              onClick={() => start(true)}
              className="w-full rounded-2xl border border-zinc-700 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              ⚡ Try the demo lecture <span className="text-zinc-500">(Neural networks)</span>
            </button>
          </div>
        </section>
      </div>

      {(localErr || error) && (
        <p className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-300">
          {localErr || error}
        </p>
      )}

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ["🎙️", "Speak, don't type", "Answer out loud like a real oral exam. Explaining is the fastest way to find out what you don't know."],
          ["🕵️", "Bluff detector", "Vague buzzword answers get caught — and followed up until you hit the real mechanism."],
          ["🗺️", "Gap map & flashcards", "Leave with a per-topic mastery heatmap, the exact misconceptions, and flashcards that target them."],
        ].map(([e, t, d]) => (
          <div key={t} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5">
            <div className="text-2xl">{e}</div>
            <div className="mt-2 font-semibold">{t}</div>
            <p className="mt-1 text-sm text-zinc-500">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
