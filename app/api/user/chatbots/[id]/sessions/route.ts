import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { WidgetSession } from "@/lib/models/WidgetSession";

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
      .select("token")
      .lean();

    if (!chatbot) return jsonError("Not found", 404);

    const sessions = await WidgetSession.find({ chatbotToken: chatbot.token })
  .sort({ lastSeenAt: -1 })
  .limit(200)
  .lean();

    return jsonOk({
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        sessionId: s.sessionId,
        userId: s.userId ?? null,
        startedAt: s.startedAt,
        lastSeenAt: s.lastSeenAt,
        country: s.country ?? null,
        region: s.region ?? null,
        city: s.city ?? null,
        browser: s.browser ?? null,
        os: s.os ?? null,
        deviceType: s.deviceType ?? null,
        referrer: s.referrer ?? null,
        pageUrl: s.pageUrl ?? null,
        language: s.language ?? null,
        timezone: s.timezone ?? null,
      })),
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
