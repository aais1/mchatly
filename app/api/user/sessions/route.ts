import { NextResponse } from "next/server";

import { getOptionalUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Chatbot } from "@/lib/models/Chatbot";
import { WidgetSession } from "@/lib/models/WidgetSession";

export async function GET() {
  const user = await getOptionalUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();

  const chatbots = await Chatbot.find({ ownerId: user.id })
    .select({ _id: 1, name: 1, token: 1 })
    .lean();

  const tokens = (chatbots as Array<{ token: string }>)
    .map((c) => c.token)
    .filter(Boolean);

  if (tokens.length === 0) {
    return NextResponse.json({
      last7dSessions: 0,
      last24hSessions: 0,
      uniqueVisitors7d: 0,
      uniqueVisitors24h: 0,
      recent: [],
    });
  }

  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Counts are based on WidgetSession docs. This is “visitors who opened the widget”.
  const [last7dSessions, last24hSessions] = await Promise.all([
    WidgetSession.countDocuments({
      chatbotToken: { $in: tokens },
      lastSeenAt: { $gte: since7d },
    }),
    WidgetSession.countDocuments({
      chatbotToken: { $in: tokens },
      lastSeenAt: { $gte: since24h },
    }),
  ]);

  const [uniqueVisitors7d, uniqueVisitors24h] = await Promise.all([
    WidgetSession.distinct("sessionId", {
      chatbotToken: { $in: tokens },
      lastSeenAt: { $gte: since7d },
    }).then((x: unknown[]) => x.length),
    WidgetSession.distinct("sessionId", {
      chatbotToken: { $in: tokens },
      lastSeenAt: { $gte: since24h },
    }).then((x: unknown[]) => x.length),
  ]);

  const tokenToChatbot = new Map(
    (chatbots as Array<{ _id: unknown; token: string; name: string }>).map(
      (c) => [c.token, { id: String(c._id), name: c.name }]
    )
  );

  const recentDocs = await WidgetSession.find({ chatbotToken: { $in: tokens } })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .lean();

  type SessionDoc = {
    _id: unknown;
    chatbotToken: string;
    sessionId: string;
    startedAt: Date;
    lastSeenAt: Date;
    country?: string;
    region?: string;
    city?: string;
    browser?: string;
    os?: string;
    deviceType?: string;
    pageUrl?: string;
    referrer?: string;
  };

  const recent = (recentDocs as unknown as SessionDoc[]).map((s) => {
    const chatbot = tokenToChatbot.get(s.chatbotToken);
    return {
      id: String(s._id),
      chatbot: chatbot ?? null,
      sessionId: s.sessionId,
      startedAt: s.startedAt,
      lastSeenAt: s.lastSeenAt,
      country: s.country,
      region: s.region,
      city: s.city,
      browser: s.browser,
      os: s.os,
      deviceType: s.deviceType,
      pageUrl: s.pageUrl,
      referrer: s.referrer,
      // Intentionally omit ip for privacy.
    };
  });

  return NextResponse.json({
    last7dSessions,
    last24hSessions,
    uniqueVisitors7d,
    uniqueVisitors24h,
    recent,
  });
}
