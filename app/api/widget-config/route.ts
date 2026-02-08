import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";

const QuerySchema = z.object({
  token: z.string().min(10),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const parsed = QuerySchema.safeParse({ token });
  if (!parsed.success) {
    return jsonError("Invalid request", 400, { issues: parsed.error.issues });
  }

  await connectToDatabase();

  const chatbot = await Chatbot.findOne({ token: parsed.data.token })
    .select("name settings")
    .lean();

  if (!chatbot) return jsonError("Unknown token", 404);

  const s = chatbot.settings ?? {};

  return jsonOk({
    chatbotId: chatbot._id.toString(),
    name: chatbot.name,
    theme: {
      mode: (s.widgetThemeMode ?? "system") as "light" | "dark" | "system",
      primary: s.widgetPrimaryColor ?? "#111111",
      userBubble: s.widgetUserBubbleColor ?? "#111111",
      botBubble: s.widgetBotBubbleColor ?? "#f1f1f1",
      userText: (s.widgetUserTextColor ?? "#ffffff").toString(),
      botText: (s.widgetBotTextColor ?? "#111111").toString(),
    },
    welcomeMessage: (s.widgetWelcomeMessage ?? "").toString(),
    starterQuestions: Array.isArray(s.starterQuestions) ? s.starterQuestions : [],
  });
}
