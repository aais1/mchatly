import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { CHATBOT_LIMITS } from "@/lib/chatbot/config";
import { extractTextFromUpload } from "@/lib/uploads/extractText";
import { embedTexts } from "@/lib/embeddings/gemini";

// Helper to extract Q/A pairs from text
function extractFaqPairs(text: string): { question: string; answer: string }[] {
  const regex = /Q:\s*(.+?)\s*A:\s*(.+?)(?=(?:Q:|$))/gs;
  const pairs: { question: string; answer: string }[] = [];
  let match;
  while ((match = regex.exec(text))) {
    pairs.push({ question: match[1].trim(), answer: match[2].trim() });
  }
  return pairs;
}
import { deleteVectorsByIds, upsertVectors } from "@/lib/vectorstore/pinecone";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

function isAllowedMimeType(mime: string) {
  return (
    CHATBOT_LIMITS.instructionAllowedMimeTypes as readonly string[]
  ).includes(mime);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("file is uploading");
    const user = await requireUser();
    const params = await context.params;

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return jsonError("Invalid request", 400, {
        issues: parsedParams.error.issues,
      });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) return jsonError("Invalid form data", 400);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Missing file", 400);
    }

    if (!isAllowedMimeType(file.type)) {
      return jsonError(
        `Unsupported file type (${file.type || "unknown"})`,
        400
      );
    }

    if (file.size > CHATBOT_LIMITS.instructionFileMaxBytes) {
      return jsonError(
        `File too large. Max ${CHATBOT_LIMITS.instructionFileMaxBytes} bytes`,
        400
      );
    }

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({
      _id: parsedParams.data.id,
      ownerId: user.id,
    }).select("instructionFiles");

    if (!chatbot) return jsonError("Not found", 404);

    const currentCount = chatbot.instructionFiles?.length ?? 0;
    if (currentCount >= CHATBOT_LIMITS.instructionFilesMaxCount) {
      return jsonError(
        `File limit reached (${CHATBOT_LIMITS.instructionFilesMaxCount})`,
        400
      );
    }

    // MVP: store metadata only (no blob storage yet)
    chatbot.instructionFiles = chatbot.instructionFiles ?? [];

    // Create a placeholder record so we have a stable id for Pinecone vector ids.
    chatbot.instructionFiles.push({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: new Date(),
    });

    // Save once to ensure subdocument _id exists.
    await chatbot.save();

    const created =
      chatbot.instructionFiles[chatbot.instructionFiles.length - 1];
    const fileId = created?._id?.toString?.();
    if (!fileId) {
      return jsonError("Failed to create file record", 500);
    }

    // Extract text and parse Q/A pairs
    console.log("strarting extracting");
    const extracted = await extractTextFromUpload(file);
    const faqPairs = extractFaqPairs(extracted.text);
    if (faqPairs.length === 0) {
      return jsonError("No Q/A pairs found in this file", 400);
    }

    // Persist extracted content for UI preview/editing.
    created.text = extracted.text;
    created.textChars = extracted.text.length;
    created.chunkCount = faqPairs.length;
    await chatbot.save();

    // Embed and upsert FAQ pairs
    const toEmbed = faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`);
    const embeddings = await embedTexts(toEmbed);
    await upsertVectors(
      embeddings.map((values, idx) => ({
        id: `chatbot:${chatbot._id.toString()}:faq:pair:${idx}`,
        values,
        metadata: {
          chatbotId: chatbot._id.toString(),
          kind: "faq",
          pairIndex: idx,
          pairCount: faqPairs.length,
          text: toEmbed[idx] ?? "",
        },
      }))
    );

    return jsonOk({
      files: chatbot.instructionFiles.map((f) => ({
        id: f._id?.toString?.() ?? undefined,
        filename: f.filename,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    console.log(e);
    return jsonError("Something went wrong", 500);
  }
}

export async function DELETE(
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

    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return jsonError("Missing fileId", 400);

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({
      _id: parsedParams.data.id,
      ownerId: user.id,
    }).select("instructionFiles");

    if (!chatbot) return jsonError("Not found", 404);

    const before = chatbot.instructionFiles?.length ?? 0;
    const toDelete = (chatbot.instructionFiles ?? []).find(
      (f) => f._id?.toString?.() === fileId
    );
    chatbot.instructionFiles = (chatbot.instructionFiles ?? []).filter(
      (f) => f._id?.toString?.() !== fileId
    );

    if ((chatbot.instructionFiles?.length ?? 0) === before) {
      return jsonError("File not found", 404);
    }

    await chatbot.save();

    // Best-effort Pinecone cleanup: delete the chunk ids we deterministically generated.
    // If chunkCount is missing, we skip deletion rather than guessing.
    const chunkCount = toDelete?.chunkCount ?? 0;
    if (chunkCount > 0) {
      const ids = Array.from({ length: chunkCount }).map(
        (_v, idx) =>
          `chatbot:${chatbot._id.toString()}:file:${fileId}:chunk:${idx}`
      );
      await deleteVectorsByIds(ids);
    }

    return jsonOk({
      files: chatbot.instructionFiles.map((f) => ({
        id: f._id?.toString?.() ?? undefined,
        filename: f.filename,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt,
      })),
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
