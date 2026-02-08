import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/auth/server";
import { Chatbot } from "@/lib/models/Chatbot";
import { generateChatbotToken } from "@/lib/token";

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    const user = await requireUser().catch(() => null);
    if (!user) {
      return jsonError("Unauthenticated", 401);
    }

    await connectToDatabase();

    const existing = await Chatbot.findOne({ ownerId: user.id })
      .sort({ createdAt: -1 })
      .select("name description token createdAt")
      .lean();

    if (existing) {
      return jsonOk({
        chatbot: {
          id: existing._id.toString(),
          name: existing.name,
          description: existing.description ?? "",
          token: existing.token,
          createdAt: existing.createdAt,
          existing: true,
        },
      });
    }

    // It's extremely unlikely to collide, but we'll still retry a few times.
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = generateChatbotToken();
      try {
        const chatbot = await Chatbot.create({
          ownerId: user.id,
          name: parsed.data.name,
          description: parsed.data.description ?? "",
          token,
        });

        return jsonOk({
          chatbot: {
            id: chatbot._id.toString(),
            name: chatbot.name,
            description: chatbot.description,
            token: chatbot.token,
            createdAt: chatbot.createdAt,
          },
        });
      } catch (e: unknown) {
        // Duplicate token => retry. Otherwise bubble.
        if (
          typeof e === "object" &&
          e &&
          "code" in e &&
          typeof (e as { code?: unknown }).code === "number" &&
          (e as { code: number }).code === 11000
        ) {
          continue;
        }
        throw e;
      }
    }

    return jsonError("Failed to generate unique token", 500);
  } catch {
    return jsonError("Server error", 500);
  }
}
