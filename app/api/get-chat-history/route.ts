import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { ChatHistory } from "@/lib/models/ChatHistory";

const QuerySchema = z.object({
  token: z.string().min(10),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  sessionId: z.string().min(8).max(128).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qs = Object.fromEntries(url.searchParams.entries());
    const parsed = QuerySchema.safeParse(qs);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    await connectToDatabase();

    const chatbot = await Chatbot.findOne({ token: parsed.data.token }).lean();
    if (!chatbot) return jsonError("Unknown token", 404);

    const limit = parsed.data.limit ?? 50;
    const items = await ChatHistory.find({
      chatbotToken: parsed.data.token,
      ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}),
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return jsonOk({
      token: parsed.data.token,
      items: items.map((i) => {
        const doc = i as unknown as {
          _id: { toString(): string };
          userMessage: string;
          botResponse: string;
          timestamp: Date;
        };
        return {
          id: doc._id.toString(),
          userMessage: doc.userMessage,
          botResponse: doc.botResponse,
          timestamp: doc.timestamp,
        };
      }),
    });
  } catch {
    return jsonError("Server error", 500);
  }
}
