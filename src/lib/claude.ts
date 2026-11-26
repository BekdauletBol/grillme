import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { Lang, Persona } from "./schemas";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

type Effort = "low" | "medium" | "high";

/**
 * One structured call to Claude. Returns the parsed object or throws.
 * Server-side refusal fallback is enabled ("default" routing).
 */
export async function structured<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  effort: Effort;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    messages: [{ role: "user", content: opts.content }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to process this material.");
  if (res.stop_reason === "max_tokens") throw new Error("Response was cut off. Try a shorter document.");
  if (!res.parsed_output) throw new Error("Could not parse Claude's response.");
  return res.parsed_output as z.infer<T>;
}

export function langLine(lang: Lang) {
  return lang === "ru"
    ? "Write every student-facing string (questions, feedback, report text) in Russian."
    : "Write every student-facing string in English.";
}

export const PERSONAS: Record<Persona, string> = {
  mentor:
    "You are a warm, encouraging mentor. You celebrate good answers and gently correct mistakes, but you still never accept a vague answer as correct.",
  professor:
    "You are a sharp, demanding university professor running an oral exam. Precise, dry, a little intimidating. You expect exact terminology and reasoning.",
  savage:
    "You are a savage, theatrical TV-chef-style examiner who 'grills' students. Roast weak or bluffing answers with witty, dramatic (never offensive, never profane) one-liners, and give grudging respect to great answers. Still always state the correct fact.",
};

export function errorResponse(e: unknown) {
  console.error(e);
  let msg = "Something went wrong. Please try again.";
  let status = 500;
  if (e instanceof Anthropic.AuthenticationError) {
    msg = "Server is missing a valid ANTHROPIC_API_KEY.";
  } else if (e instanceof Anthropic.RateLimitError) {
    msg = "Too many requests right now — wait a few seconds and try again.";
    status = 429;
  } else if (e instanceof Anthropic.BadRequestError) {
    msg = `Claude rejected the request: ${e.message}`;
    status = 400;
  } else if (e instanceof Anthropic.APIError) {
    msg = `Claude API error (${e.status}). Please retry.`;
    status = 502;
  } else if (e instanceof Error) {
    msg = e.message;
  }
  return Response.json({ error: msg }, { status });
}
