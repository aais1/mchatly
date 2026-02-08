import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { ChatHistory } from "@/lib/models/ChatHistory";
import { scheduleAdminNotification } from "@/lib/adminNotifications";

const BodySchema = z.object({
  token: z.string().min(10),
  message: z.string().max(8000),
  messageBy: z.enum(["user", "admin", "bot"]),
  sessionId: z.string().max(128).optional(),
  userId: z.string().max(128).optional(),
  name: z.string().max(128).optional(),
  whatsapp: z.string().max(32).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);

    console.log('message',json)
    const parsed = BodySchema.safeParse(json);

    console.log("message to store in db", parsed);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    await connectToDatabase();

    const chatbotToken = parsed.data.token;
    const sessionId = parsed.data.sessionId;
    if (!chatbotToken || !sessionId) return jsonError("Missing token or sessionId", 400);

    const { message, messageBy, userId } = parsed.data;
  const { name, whatsapp } = parsed.data;
    const now = new Date();

    const doc = await ChatHistory.create({
  chatbotToken,
  sessionId,
  userId: userId ?? undefined,
  message,
  messageBy,
  name: name ?? undefined,
  whatsapp: whatsapp ?? undefined,
  timestamp: now,
    });

    // Trigger timer if bot says trigger phrase
    if (messageBy === 'bot' && message.includes("Someone will contact you shortly")) {
      scheduleAdminNotification(sessionId, chatbotToken);
    }

    return jsonOk({
      logged: true,
      sessionId,
      messageIds: [doc._id.toString()],
    });


  } catch (e: any) {
    console.error(e?.message);
    return jsonError("Server error", 500);
  }
}
