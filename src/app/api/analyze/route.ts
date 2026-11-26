import type Anthropic from "@anthropic-ai/sdk";
import { structured, langLine, errorResponse } from "@/lib/claude";
import { AnalysisSchema, type Lang } from "@/lib/schemas";

export const maxDuration = 120;

const MAX_PDF_BYTES = 4_000_000;

export async function POST(req: Request) {
  try {
    const { pdfBase64, text, lang } = (await req.json()) as {
      pdfBase64?: string;
      text?: string;
      lang: Lang;
    };

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (pdfBase64) {
      if (pdfBase64.length * 0.75 > MAX_PDF_BYTES) {
        return Response.json({ error: "PDF is too large (max ~4 MB)." }, { status: 413 });
      }
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      });
    } else if (text && text.trim().length > 80) {
      content.push({ type: "text", text: `<material>\n${text.slice(0, 120_000)}\n</material>` });
    } else {
      return Response.json(
        { error: "Upload a PDF or paste at least a paragraph of notes." },
        { status: 400 },
      );
    }

    content.push({
      type: "text",
      text: "Analyse this study material and prepare an oral exam on it.",
    });

    const analysis = await structured({
      schema: AnalysisSchema,
      effort: "medium",
      system: [
        "You prepare oral exams from a student's own study material (lecture slides, notes, textbook pages).",
        "Extract the examinable knowledge faithfully. Never invent facts that are not supported by the material; if the material is thin, keep topics narrow.",
        "Topic ids must be short kebab-case and unique.",
        "The opening question will be read aloud: ONE short spoken sentence (max ~25 words), open-ended, testing understanding (why/how), not trivia recall.",
        "Write the knowledgeBase in the material's own language. Topic names, concepts, title, summary and the question are student-facing.",
        langLine(lang),
      ].join("\n"),
      content,
    });

    return Response.json(analysis);
  } catch (e) {
    return errorResponse(e);
  }
}
