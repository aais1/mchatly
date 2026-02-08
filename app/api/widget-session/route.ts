import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { Chatbot } from "@/lib/models/Chatbot";
import { WidgetSession } from "@/lib/models/WidgetSession";
import { parseUserAgent } from "@/lib/analytics/userAgent";

const BodySchema = z.object({
  token: z.string().min(10),
  sessionId: z.string().min(8).max(128),
  name: z.string().max(128).optional(),
  whatsapp: z.string().max(32).optional(),
  pageUrl: z.string().max(5000).optional(),
  referrer: z.string().max(5000).optional(),
  language: z.string().max(64).optional(),
  timezone: z.string().max(64).optional(),
});

function getClientIp(req: Request): string | undefined {
  // Best-effort. In many deployments a reverse proxy sets these.
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0]?.trim() || undefined;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return undefined;
}

function getCfGeo(req: Request): {
  country?: string;
  region?: string;
  city?: string;
} {
  // Cloudflare default headers (best-effort)
  const country = req.headers.get("cf-ipcountry") ?? undefined;
  // (Most CF deployments don't send region/city by default without extra products)
  const region = req.headers.get("cf-region") ?? undefined;
  const city = req.headers.get("cf-city") ?? undefined;
  return {
    country: country || undefined,
    region: region || undefined,
    city: city || undefined,
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  console.log('widget body that is updaled',parsed)
  if (!parsed.success) {
    return jsonError("Invalid request", 400, { issues: parsed.error.issues });
  }

  await connectToDatabase();

  const chatbot = await Chatbot.findOne({ token: parsed.data.token })
    .select("token")
    .lean();
  if (!chatbot) return jsonError("Unknown token", 404);

  const ua = req.headers.get("user-agent") ?? "";
  const { browser, os, deviceType } = parseUserAgent(ua);

  const ip = getClientIp(req);
  const cfGeo = getCfGeo(req);

  const now = new Date();

  await WidgetSession.updateOne(
    {
      chatbotToken: parsed.data.token,
      sessionId: parsed.data.sessionId,
    },
    {
      $setOnInsert: {
        startedAt: now,
      },
      $set: {
        lastSeenAt: now,
        userAgent: ua,
        browser,
        os,
        deviceType,
        ip,
        ...cfGeo,
        pageUrl: parsed.data.pageUrl ?? undefined,
        referrer: parsed.data.referrer ?? undefined,
        language: parsed.data.language ?? undefined,
        timezone: parsed.data.timezone ?? undefined,
        name: parsed.data.name ?? undefined,
        whatsapp: parsed.data.whatsapp ?? undefined,
      },
    },
    { upsert: true }
  );

  return jsonOk({ tracked: true });
}
