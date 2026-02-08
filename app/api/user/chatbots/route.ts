import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);

    const parsed = QuerySchema.safeParse({
      limit: url.searchParams.get("limit"),
    });

    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    await connectToDatabase();

    const chatbots = await Chatbot.find({ ownerId: user.id })
      .sort({ createdAt: -1 })
      .limit(parsed.data.limit)
      .select("name description token createdAt")
      .lean();

    return jsonOk({
      chatbots: chatbots.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        token: c.token,
        createdAt: c.createdAt,
      })),
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
