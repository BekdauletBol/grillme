import { z } from "zod";

export const TopicSchema = z.object({
  id: z.string().describe("short kebab-case id, e.g. 'gradient-descent'"),
  name: z.string().describe("2-5 word human-readable topic name"),
  concepts: z
    .array(z.string())
    .describe("3-6 key concepts a student must understand for this topic"),
});

export const AnalysisSchema = z.object({
  title: z.string().describe("title of the material"),
  subject: z.string().describe("academic subject, e.g. 'Machine Learning'"),
  summary: z.string().describe("one sentence describing what the material covers"),
  knowledgeBase: z
    .string()
    .describe(
      "Dense, faithful study notes of everything examinable in the material: definitions, formulas, mechanisms, cause-effect chains, examples, edge cases. 600-1800 words. This is the ONLY source the examiner will see later, so do not omit important facts.",
    ),
  topics: z.array(TopicSchema).describe("4-7 examinable topics, ordered as in the material"),
  firstQuestion: z.string().describe("an opening question on the first topic: one short spoken sentence, max ~25 words"),
  firstTopicId: z.string(),
});

export const TurnSchema = z.object({
  verdict: z
    .enum(["nailed", "solid", "partial", "wrong", "bluff", "skipped"])
    .describe(
      "nailed = complete and precise; solid = correct with minor gaps; partial = some correct ideas but key parts missing; wrong = incorrect; bluff = sounds confident but vague, uses buzzwords without substance or dodges the question; skipped = student said they don't know",
    ),
  score: z.number().describe("0-100 quality of the answer"),
  feedback: z
    .string()
    .describe(
      "1-3 short spoken sentences reacting to the answer in persona. If anything was missing or wrong, state the correct fact briefly. No markdown.",
    ),
  missedPoint: z
    .string()
    .describe("the single most important thing the student missed or got wrong; empty string if nothing"),
  topicId: z.string().describe("id of the topic the answered question belonged to"),
  nextQuestion: z
    .string()
    .describe("the next question to ask: one short spoken sentence (max ~25 words). Empty string if the exam is over."),
  nextTopicId: z.string().describe("topic id of nextQuestion, empty if exam is over"),
  nextIsFollowUp: z
    .boolean()
    .describe("true if nextQuestion drills deeper into the same topic because the answer was weak or bluffing"),
});

export const ReportSchema = z.object({
  grade: z.string().describe("letter grade like A, B+, C-"),
  headline: z.string().describe("one punchy sentence summarising the performance, in persona"),
  strengths: z.array(z.string()).describe("2-4 things the student clearly understands"),
  gaps: z
    .array(
      z.object({
        topic: z.string(),
        issue: z.string().describe("what exactly the student doesn't understand"),
        fix: z.string().describe("the correct explanation in 1-3 sentences"),
      }),
    )
    .describe("knowledge gaps, most serious first"),
  flashcards: z
    .array(z.object({ front: z.string(), back: z.string() }))
    .describe("5-8 flashcards targeting the gaps"),
  studyPlan: z.array(z.string()).describe("3-5 concrete next steps, ordered"),
});

export type Topic = z.infer<typeof TopicSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type Report = z.infer<typeof ReportSchema>;

export type Persona = "mentor" | "professor" | "savage";
export type Lang = "en" | "ru";

export interface QA {
  question: string;
  topicId: string;
  answer: string;
  verdict: Turn["verdict"];
  score: number;
  feedback: string;
  missedPoint: string;
}
