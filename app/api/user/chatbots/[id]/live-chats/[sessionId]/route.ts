import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { ChatHistory } from "@/lib/models/ChatHistory";

const ParamsSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(8).max(128),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const user = await requireUser();
    const params = await context.params;
    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    await connectToDatabase();

    console.log('finding useing this data',parsed.data);

    const chatbot = await Chatbot.findOne({
      _id: parsed.data.id,
      ownerId: user.id,
    })
      .select("token")
      .lean();

    if (!chatbot) return jsonError("Not found", 404);

    const items = await ChatHistory.find({
      chatbotToken: chatbot.token,
      sessionId: parsed.data.sessionId,
    })
      .sort({ timestamp: 1 })
      .limit(200)
      .lean();


  

    return jsonOk({
      sessionId: parsed.data.sessionId,
      items: items.map((i) => {
        const doc = i as unknown as {
          _id: { toString(): string };
          message: string;
          messageBy: string;
          timestamp: Date;
        };

        return {
          id: doc._id.toString(),
          role:( doc.messageBy || "bot"),
          text: (doc.message || ""),
          timestamp: doc.timestamp,
        };
      }),
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
