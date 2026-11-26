import { structured, langLine, errorResponse, PERSONAS } from "@/lib/claude";
import { ReportSchema, type Lang, type Persona, type QA, type Topic } from "@/lib/schemas";

export const maxDuration = 90;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      knowledgeBase: string;
      topics: Topic[];
      history: QA[];
      persona: Persona;
      lang: Lang;
    };

    const transcript = body.history
      .map(
        (h, i) =>
          `Q${i + 1} [${h.topicId}]: ${h.question}\nA: ${h.answer || "(skipped)"}\nVerdict: ${h.verdict} (${h.score})${h.missedPoint ? `\nMissed: ${h.missedPoint}` : ""}`,
      )
      .join("\n\n");

    const report = await structured({
      schema: ReportSchema,
      effort: "medium",
      system: [
        PERSONAS[body.persona] ?? PERSONAS.professor,
        "The oral exam is over. Write the student's debrief. Base every claim on the transcript; ground every 'fix' and flashcard in the knowledge base.",
        "Flashcards and the study plan must target the actual gaps revealed, not generic advice.",
        langLine(body.lang),
        "<topics>",
        ...body.topics.map((t) => `- ${t.id}: ${t.name}`),
        "</topics>",
        "<knowledge_base>",
        body.knowledgeBase,
        "</knowledge_base>",
      ].join("\n"),
      content: [{ type: "text", text: `<exam_transcript>\n${transcript}\n</exam_transcript>` }],
    });

    return Response.json(report);
  } catch (e) {
    return errorResponse(e);
  }
}
