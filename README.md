# 🔥 GrillMe — the AI oral examiner that finds what you *don't* know

> Re-reading your notes feels like learning. It isn't.
> GrillMe turns any lecture into a **spoken oral exam**: an AI examiner questions you out loud, catches your bluffs, drills into the gaps, and hands you a map of exactly what to study next.

**Live demo:** _coming soon_ · **Built for:** Creators AI Winter Challenge 2026

---

## The problem

Students spend most of their study time on *passive* review: re-reading slides, highlighting, watching lectures at 2x. It creates an **illusion of competence**: everything looks familiar, so it feels understood. Then the exam asks *"why?"* and the knowledge isn't there.

The two study techniques with the strongest evidence behind them, **retrieval practice** (recalling instead of re-reading) and **self-explanation** (explaining it in your own words), both need someone to ask you questions and push back. A good tutor or an oral exam does that. Most students don't have either the night before an exam.

## The solution

GrillMe is that examiner, available 24/7, built from **your own** material.

1. **Drop in your lecture.** Upload slides or notes as a PDF, or paste text. Claude reads it (including diagrams and formulas in the PDF), extracts a faithful knowledge base and splits it into examinable topics.
2. **Get grilled out loud.** The examiner speaks each question and listens to your spoken answer (hands-free: it starts listening automatically).
3. **No bluffing.** Every answer is graded against *your* material as `nailed` / `solid` / `partial` / `wrong` / `skipped`, or 🕵️ **`bluff`** for confident buzzword answers that never explain the mechanism.
4. **Adaptive drilling.** A weak answer gets a follow-up question that targets the exact piece you missed. A strong answer moves you to the least-covered topic, and later questions get harder.
5. **Leave with a plan.** You get a grade, a per-topic **mastery heatmap**, your specific misconceptions with corrections, **flashcards generated from your mistakes**, a study plan, and a one-click **"Re-grill me on my weak topics"** loop.

Three examiner personas: 🧑‍🏫 **Mentor** (kind), 🎓 **Professor** (exam realism), 🔥 **Savage** (roasts your bluffs; surprisingly motivating). Works in **English and Russian**.

## How it works

```
 PDF / notes ──▶ /api/analyze ──▶ Claude (PDF vision + structured output)
                                   │  knowledge base · topics · opening question
                                   ▼
 🎙️ Web Speech API ──answer──▶ /api/turn ──▶ Claude (grader + question planner)
 🔊 speechSynthesis ◀─feedback + next question─┘   verdict · score · missed point · follow-up?
                                   │
                                   ▼  (after N questions)
                              /api/report ──▶ Claude → grade · gaps · flashcards · study plan
```

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, deployed on Vercel.
- **Claude Opus 5.5** through the official `@anthropic-ai/sdk`:
  - Native **PDF understanding**: slides with diagrams and formulas work, with no OCR step.
  - **Structured outputs** (`messages.parse` + Zod schemas), so every grade, verdict and flashcard is type-safe JSON.
  - **Effort control**: `low` effort for the real-time grading loop (fast enough for conversation), `medium` for analysis and the final report.
  - **Server-side refusal fallback** for robustness.
  - **Grounded grading**: the examiner only sees the knowledge base extracted from *your* material and is told never to accept answers that contradict it. That keeps it fair and stops it hallucinating "correct" answers.
- **Voice**: browser-native Web Speech API (recognition + synthesis). No audio leaves the browser except the transcript, and there are zero extra API costs. Auto-restarts after silence so long explanations aren't cut off; typing fallback in browsers without speech recognition.
- **Stateless backend**: the session lives in the browser. No accounts, no database, nothing stored.

## Run locally

```bash
git clone <this repo> && cd grillme
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev        # http://localhost:3000  (use Chrome or Edge for voice)
```

## What's next

- Spaced-repetition scheduling of flashcards across sessions
- Group "viva" mode: a study group takes turns, with a leaderboard
- LMS / Google Drive import, and Kazakh-language support
- An examiner voice with interruption ("wait, define that term first")

---
Built with ❤️ and Claude for the Creators AI Winter Challenge.
