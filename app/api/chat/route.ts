import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { embedText } from "@/lib/embeddings/gemini";
import { queryTopK } from "@/lib/vectorstore/pinecone";

const BodySchema = z.object({
  token: z.string().min(10),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .max(20)
    .optional(),
});

const CONFIDENCE_THRESHOLD = 0.68
;

function extractAnswer(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  // If text contains both Q and A, extract only the answer
  const qaMatch = trimmed.match(/(?:Q:|Question:)\s*.*?(?:A:|Answer:)\s*(.*)/is);
  if (qaMatch && qaMatch[1]) {
    return qaMatch[1].trim();
  }

  // Remove Q: or Question: prefix if present at the start
  const questionOnly = trimmed.match(/^(?:Q:|Question:)\s*/i);
  if (questionOnly) {
    const after = trimmed.slice(questionOnly[0].length).trim();
    if (after) return after;
  }

  // Remove A: or Answer: prefix if present at the start
  const answerOnly = trimmed.match(/^(?:A:|Answer:)\s*/i);
  if (answerOnly) {
    const after = trimmed.slice(answerOnly[0].length).trim();
    if (after) return after;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    console.log(parsed);

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({ token: parsed.data.token })
      .select("name description instructionText settings")
      .lean();

    if (!chatbot) return jsonError("Unknown token", 404);

    const query = parsed.data.message.trim();
    const queryVec = await embedText(query);

    // Log query vector
    console.log("Query Vector:", queryVec);

    // Retrieve context from instructionText and uploaded document chunks stored as Pinecone vectors.
    const chatbotId = chatbot._id.toString();

    // Log the chatbot ID for context retrieval
    console.log("Retrieving context for chatbot ID:", chatbotId);

    const matches = await queryTopK({
      vector: queryVec,
      topK: 8,
      includeMetadata: true,
      filter: {
        chatbotId,
      },
    });

    // Log the matches from Pinecone
    console.log("Pinecone matches retrieved:", matches);

    const sources = matches
      .map((m) => {
        const text =
          typeof m.metadata?.text === "string"
            ? m.metadata.text
            : "";
        return {
          id: m.id,
          score: m.score ?? null,
          filename:
            typeof m.metadata?.filename === "string"
              ? m.metadata.filename
              : null,
          kind:
            typeof m.metadata?.kind === "string"
              ? m.metadata.kind
              : null,
          text,
        };
      })
      .filter((s) => s.text);

    // Dedupe identical text snippets; keep best score.
    const dedupedByText = new Map<string, (typeof sources)[number]>();
    for (const s of sources) {
      const key = s.text.trim();
      if (!key) continue;
      const prev = dedupedByText.get(key);
      if (!prev) {
        dedupedByText.set(key, s);
        continue;
      }
      const prevScore = prev.score ?? -Infinity;
      const nextScore = s.score ?? -Infinity;
      if (nextScore > prevScore) dedupedByText.set(key, s);
    }

    const finalSources = Array.from(dedupedByText.values())
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 8);

    // Log the final sources
    console.log("Final sources for context:", finalSources);

    const best = finalSources[0];
    const bestScore = best?.score ?? 0;

    const reply = best && bestScore >= CONFIDENCE_THRESHOLD
      ? extractAnswer(best.text)
      : "Someone will contact you shortly.";

    return jsonOk({
      token: parsed.data.token,
      reply,
      sources: finalSources.map((s) => ({
        id: s.id,
        score: s.score,
        filename: s.filename,
        kind: s.kind,
      })),
      usedContext: finalSources.length,
    });
  } catch (e) {
    console.log("Server issue:", e);
    return jsonError("Server error", 500);
  }
}
