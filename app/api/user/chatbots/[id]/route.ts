import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const params = await context.params;

    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({
      _id: parsed.data.id,
      ownerId: user.id,
    })
      .select(
        "name description token instructionText settings instructionFiles faqs"
      )
      .lean();

    if (!chatbot) return jsonError("Not found", 404);

    return jsonOk({
      chatbot: {
        id: chatbot._id.toString(),
        name: chatbot.name,
        description: chatbot.description,
        token: chatbot.token,
        instructionText: chatbot.instructionText ?? "",
        settings: chatbot.settings ?? {},
        instructionFiles: (chatbot.instructionFiles ?? []).map((f) => ({
          id: f._id?.toString?.() ?? undefined,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          text: f.text ?? "",
          textChars: f.textChars ?? f.text?.length ?? 0,
          chunkCount: f.chunkCount ?? 0,
          createdAt: f.createdAt,
        })),
        faqs: (chatbot.faqs ?? []).map((f) => ({
          id: f._id?.toString?.() ?? undefined,
          question: f.question,
          answer: f.answer,
          createdAt: f.createdAt,
        })),
      },
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
