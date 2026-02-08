import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { CHATBOT_LIMITS, CHATBOT_OPTIONS } from "@/lib/chatbot/config";
import { chunkText } from "@/lib/uploads/chunkText";
import { embedTexts } from "@/lib/embeddings/gemini";
import { deleteVectorsByIds, upsertVectors } from "@/lib/vectorstore/pinecone";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

const BodySchema = z.object({
  instructionText: z
    .string()
    .max(CHATBOT_LIMITS.instructionTextMaxChars)
    .optional()
    .nullable(),
  settings: z
    .object({
      tone: z.enum(CHATBOT_OPTIONS.tone).optional(),
      humor: z.enum(CHATBOT_OPTIONS.humor).optional(),
      theme: z.enum(CHATBOT_OPTIONS.theme).optional(),
      allowEmojis: z.boolean().optional(),

      // Widget appearance
      widgetThemeMode: z.enum(["light", "dark", "system"]).optional(),
      widgetPrimaryColor: z.string().min(1).max(32).optional(),
      widgetUserBubbleColor: z.string().min(1).max(32).optional(),
      widgetBotBubbleColor: z.string().min(1).max(32).optional(),
      widgetUserTextColor: z.string().min(1).max(32).optional(),
      widgetBotTextColor: z.string().min(1).max(32).optional(),

      // Widget behavior
      widgetWelcomeMessage: z.string().max(500).optional(),
      starterQuestions: z.array(z.string().min(1).max(200)).optional(),
    })
    .partial()
    .optional(),

  faqs: z
    .array(
      z.object({
        question: z.string().min(1).max(2000),
        answer: z.string().min(1).max(8000),
      })
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const params = await context.params;

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return jsonError("Invalid request", 400, {
        issues: parsedParams.error.issues,
      });
    }

    console.log(parsedParams);

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    console.log("parsed data", parsed.data);

    await connectToDatabase();

    // Load chatbot so we can manage instructionText vectors lifecycle.
    const chatbot = await Chatbot.findOne({
      _id: parsedParams.data.id,
      ownerId: user.id,
    }).select("instructionText settings instructionTextChunkCount faqs");

    if (!chatbot) return jsonError("Not found", 404);

    // Apply updates
    if (parsed.data.instructionText != null) {
      chatbot.instructionText = parsed.data.instructionText;
    }
    if (parsed.data.settings) {
      // Persist starterQuestions separately to ensure they are saved
      const starterQuestions = Array.isArray(parsed.data.settings.starterQuestions)
        ? parsed.data.settings.starterQuestions.filter(q => typeof q === "string" && q.trim().length > 0)
        : undefined;
      chatbot.settings = {
        ...(chatbot.settings ?? {}),
        ...parsed.data.settings,
        ...(starterQuestions ? { starterQuestions } : {}),
      };
      chatbot.markModified("settings");
    }

    // FAQs
    // We store these as an array of {question, answer}. For now we fully replace.
    // (No practical limit as requested; we do cap vector upserts for cost.)
    const prevFaqCount = chatbot.faqs?.length ?? 0;
    if (parsed.data.faqs) {
      chatbot.faqs = parsed.data.faqs.map((f) => ({
        question: f.question,
        answer: f.answer,
        createdAt: new Date(),
      }));
    }

    // If instructionText was provided, (re)embed it and upsert to Pinecone.
    if (parsed.data.instructionText != null) {
      const text = chatbot.instructionText ?? "";
      const chunks = chunkText(text);
      const prevChunkCount = chatbot.instructionTextChunkCount ?? 0;

      chatbot.instructionTextChars = text.length;
      chatbot.instructionTextChunkCount = chunks.length;
      await chatbot.save();

      if (chunks.length > 0) {
        const embeddings = await embedTexts(chunks);
        await upsertVectors(
          embeddings.map((values, idx) => ({
            id: `chatbot:${chatbot._id.toString()}:instructionText:chunk:${idx}`,
            values,
            metadata: {
              chatbotId: chatbot._id.toString(),
              kind: "instructionText",
              source: "instructionText",
              chunkIndex: idx,
              chunkCount: chunks.length,
              text: chunks[idx] ?? "",
            },
          }))
        );
      }

      // If new text produced fewer chunks, delete leftover old vectors.
      if (prevChunkCount > chunks.length) {
        const ids = Array.from({ length: prevChunkCount - chunks.length }).map(
          (_v, offset) =>
            `chatbot:${chatbot._id.toString()}:instructionText:chunk:${
              chunks.length + offset
            }`
        );
        await deleteVectorsByIds(ids);
      }
    } else {
      await chatbot.save();
    }

    // If FAQs were provided, upsert FAQ embeddings.
    // We embed each pair as: "Q: ...\nA: ...".
    if (parsed.data.faqs) {
      const faqPairs = (chatbot.faqs ?? []).map((f) => {
        const q = (f.question ?? "").trim();
        const a = (f.answer ?? "").trim();
        return `Q: ${q}\nA: ${a}`;
      });

      // Soft cap to avoid extreme costs for very large FAQ sets.
      const maxFaqVectors = 200;
      const toEmbed = faqPairs.slice(0, maxFaqVectors);

      if (toEmbed.length > 0) {
        const embeddings = await embedTexts(toEmbed);
        await upsertVectors(
          embeddings.map((values, idx) => ({
            id: `chatbot:${chatbot._id.toString()}:faq:pair:${idx}`,
            values,
            metadata: {
              chatbotId: chatbot._id.toString(),
              kind: "faq",
              pairIndex: idx,
              pairCount: toEmbed.length,
              text: toEmbed[idx] ?? "",
            },
          }))
        );
      }

      // Best-effort cleanup of old faq vectors when count shrinks.
      // (If FAQ content changes but length stays same, we overwrite deterministically.)
      if (prevFaqCount > toEmbed.length) {
        const ids = Array.from({ length: prevFaqCount - toEmbed.length }).map(
          (_v, offset) =>
            `chatbot:${chatbot._id.toString()}:faq:pair:${
              toEmbed.length + offset
            }`
        );
        await deleteVectorsByIds(ids);
      }

      // Persist FAQ changes (if we haven't already in instructionText branch)
      // If instructionText was provided, we already saved earlier.
      if (parsed.data.instructionText == null) {
        await chatbot.save();
      }
    }

    return jsonOk({
      instructionText: chatbot.instructionText ?? "",
      settings: chatbot.settings ?? {},
      faqs: (chatbot.faqs ?? []).map((f) => ({
        question: f.question,
        answer: f.answer,
      })),
    });
  } catch (e) {
    // Log error for debugging
    console.error("Chatbot settings PATCH error:", e);
    // If error is authentication-related, return 401
    if (e && typeof e === "object" && (e as any)?.name === "UnauthenticatedError") {
      return jsonError("Unauthenticated", 401);
    }
    return jsonError("Server error", 500);
  }
}
