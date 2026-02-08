import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { chunkText } from "@/lib/uploads/chunkText";
import { embedTexts } from "@/lib/embeddings/gemini";
import { upsertVectors } from "@/lib/vectorstore/pinecone";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

const BodySchema = z.object({
  fileId: z.string().min(1),
  text: z.string(),
});

/**
 * Update an uploaded instruction file's extracted text.
 * This also re-embeds and upserts vectors to Pinecone using the same deterministic ids.
 */
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

    const body = await req.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return jsonError("Invalid request", 400, {
        issues: parsedBody.error.issues,
      });
    }

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({
      _id: parsedParams.data.id,
      ownerId: user.id,
    }).select("instructionFiles");

    if (!chatbot) return jsonError("Not found", 404);

    const file = (chatbot.instructionFiles ?? []).find(
      (f) => f._id?.toString?.() === parsedBody.data.fileId
    );

    if (!file) return jsonError("File not found", 404);

    const text = parsedBody.data.text ?? "";
    const chunks = chunkText(text);

    // Persist new text + metrics first.
    file.text = text;
    file.textChars = text.length;
    file.chunkCount = chunks.length;
    await chatbot.save();

    // Re-embed and upsert vectors using existing ids.
    if (chunks.length > 0) {
      const embeddings = await embedTexts(chunks);
      await upsertVectors(
        embeddings.map((values, idx) => ({
          id: `chatbot:${chatbot._id.toString()}:file:${
            parsedBody.data.fileId
          }:chunk:${idx}`,
          values,
          metadata: {
            chatbotId: chatbot._id.toString(),
            fileId: parsedBody.data.fileId,
            kind: "file",
            filename: file.filename,
            mimeType: file.mimeType,
            chunkIndex: idx,
            chunkCount: chunks.length,
            text: chunks[idx] ?? "",
          },
        }))
      );
    }

    return jsonOk({
      file: {
        id: file._id?.toString?.(),
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        text: file.text ?? "",
        textChars: file.textChars ?? file.text?.length ?? 0,
        chunkCount: file.chunkCount ?? 0,
        createdAt: file.createdAt,
      },
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
