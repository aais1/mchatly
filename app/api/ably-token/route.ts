import Ably from "ably";
import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";

const QuerySchema = z.object({
  role: z.enum(["admin", "visitor"]),
  sessionId: z.string().min(6),
  chatbotId: z.string().optional(),
  token: z.string().optional(),
});

export async function GET(req: Request) {
  const rawKey = process.env.ABLY_API_KEY ?? process.env.ABLY_API_KEY;
  if (!rawKey) {
    return jsonError("Missing Ably API key", 500, {
      hint: "Set ABLY_API_KEY from your Ably dashboard (API Keys tab).",
    });
  }

  console.log(rawKey)

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    role: url.searchParams.get("role"),
    sessionId: url.searchParams.get("sessionId"),
    chatbotId: url.searchParams.get("chatbotId") ?? undefined,
    token: url.searchParams.get("token") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid request", 400, { issues: parsed.error.issues });
  }

  const { role, sessionId } = parsed.data;

  await connectToDatabase();

  let chatbotId: string | null = null;
  let clientId: string;

  if (role === "admin") {
    const user = await requireUser();
    if (!parsed.data.chatbotId) {
      return jsonError("Missing chatbotId", 400);
    }
    const chatbot = await Chatbot.findOne({
      _id: parsed.data.chatbotId,
      ownerId: user.id,
    })
      .select("_id")
      .lean();
    if (!chatbot) return jsonError("Chatbot not found", 404);
    chatbotId = chatbot._id.toString();
    clientId = `admin:${user.id.toString()}:${sessionId}`;
  } else {
    if (!parsed.data.token) {
      return jsonError("Missing token", 400);
    }
    const chatbot = await Chatbot.findOne({ token: parsed.data.token })
      .select("_id")
      .lean();
    if (!chatbot) return jsonError("Chatbot not found", 404);
    chatbotId = chatbot._id.toString();
    clientId = `visitor:${sessionId}`;
  }

  const channelName = `live-chat:${chatbotId}:${sessionId}`;
  const ably = new Ably.Rest({ key: rawKey });
  const tokenRequest = await new Promise<Ably.Types.TokenRequest>(
    (resolve, reject) => {
      ably.auth.createTokenRequest(
        {
          clientId,
          capability: {
            [channelName]: ["publish", "subscribe", "presence"],
          },
        },
        (err, request) => {
          if (err || !request) {
            reject(err ?? new Error("Failed to create token request"));
            return;
          }
          resolve(request);
        }
      );
    }
  );

  return new Response(JSON.stringify(tokenRequest), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
