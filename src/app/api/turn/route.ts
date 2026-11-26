import { structured, langLine, errorResponse, PERSONAS } from "@/lib/claude";
import { TurnSchema, type Lang, type Persona, type QA, type Topic } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      knowledgeBase: string;
      topics: Topic[];
      history: QA[];
      question: string;
      topicId: string;
      answer: string;
      persona: Persona;
      lang: Lang;
      totalQuestions: number;
      start?: boolean;
      previous?: QA[];
    };

    const asked = body.history.length + 1;
    const remaining = body.totalQuestions - asked;
    const coverage = body.topics.map((t) => {
      const n = body.history.filter((h) => h.topicId === t.id).length + (t.id === body.topicId ? 1 : 0);
      return `${t.id} (${t.name}): asked ${n}x`;
    });

    // Stable, cacheable prefix: persona + rules + knowledge base. Volatile state goes last.
    const system = [
      PERSONAS[body.persona] ?? PERSONAS.professor,
      "You are conducting a spoken oral exam. Grade strictly against the knowledge base below; do not accept answers that contradict it.",
      "Speech-to-text may garble words: be lenient on spelling and homophones, strict on meaning.",
      "Detect bluffing: an answer that is confident but generic, circular, or full of buzzwords without the actual mechanism is 'bluff'.",
      "Adaptive questioning rules:",
      "- If the answer was partial, wrong, or bluff, ask ONE follow-up that probes the exact missing piece (nextIsFollowUp=true). Never ask more than 2 follow-ups in a row on the same topic.",
      "- If the answer was nailed or solid, move to the least-covered topic, and make questions harder over time (why/how/what-if/compare/apply to a new example).",
      "- Never repeat a question already asked. Questions must be answerable from the knowledge base.",
      "- Keep questions to one spoken sentence.",
      langLine(body.lang),
      "",
      "<topics>",
      ...body.topics.map((t) => `- ${t.id}: ${t.name} — ${t.concepts.join("; ")}`),
      "</topics>",
      "<knowledge_base>",
      body.knowledgeBase,
      "</knowledge_base>",
    ].join("\n");

    const transcript = body.history
      .map((h, i) => `Q${i + 1} [${h.topicId}]: ${h.question}\nA${i + 1}: ${h.answer}\n→ ${h.verdict} (${h.score})`)
      .join("\n\n");

    // Re-grill mode: no question yet — just open on the weakest topics.
    if (body.start) {
      const prev = (body.previous ?? [])
        .map((h, i) => `Q${i + 1} [${h.topicId}]: ${h.question}\nA: ${h.answer}\n→ ${h.verdict} (${h.score}) missed: ${h.missedPoint}`)
        .join("\n\n");
      const opener = await structured({
        schema: TurnSchema,
        effort: "low",
        maxTokens: 4000,
        system,
        content: [
          {
            type: "text",
            text: [
              prev ? `<previous_session>\n${prev}\n</previous_session>` : "",
              "The student is re-taking the exam on ONLY the topics listed above, which they were weak on. There is no answer to grade yet: set verdict 'skipped', score 0, feedback to a one-sentence in-persona intro announcing the re-grill, missedPoint empty, topicId empty. Put a fresh opening question that targets what they got wrong before in nextQuestion/nextTopicId (never repeat an earlier question verbatim).",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      });
      return Response.json(opener);
    }

    const answer = body.answer.trim() || "(no answer — student said they don't know)";

    const turn = await structured({
      schema: TurnSchema,
      effort: "low",
      maxTokens: 4000,
      system,
      content: [
        {
          type: "text",
          text: [
            transcript ? `<previous_turns>\n${transcript}\n</previous_turns>` : "",
            `<coverage>\n${coverage.join("\n")}\n</coverage>`,
            `<current_question topic="${body.topicId}">${body.question}</current_question>`,
            `<student_answer>${answer}</student_answer>`,
            remaining <= 0
              ? "This was the LAST question. Grade it and set nextQuestion and nextTopicId to empty strings."
              : `Grade the answer and pick the next question. ${remaining} question(s) remain after this one.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    if (remaining <= 0) {
      turn.nextQuestion = "";
      turn.nextTopicId = "";
    }
    turn.score = Math.max(0, Math.min(100, Math.round(turn.score)));
    return Response.json(turn);
  } catch (e) {
    return errorResponse(e);
  }
}
