import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ChatHistory } from "@/lib/models/ChatHistory";
import { Chatbot } from "@/lib/models/Chatbot";
import { WidgetSession } from "@/lib/models/WidgetSession";

export default async function DashboardPage() {
  const user = await requireUser();

  await connectToDatabase();
  const chatbots = await Chatbot.find({ ownerId: user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("name description token createdAt")
    .lean();

  const hasChatbots = chatbots.length > 0;

  const tokens = (chatbots as Array<{ token: string }>).map((c) => c.token);
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [last7dSessions, last24hSessions] = await Promise.all([
    hasChatbots
      ? WidgetSession.countDocuments({
          chatbotToken: { $in: tokens },
          lastSeenAt: { $gte: since7d },
        })
      : 0,
    hasChatbots
      ? WidgetSession.countDocuments({
          chatbotToken: { $in: tokens },
          lastSeenAt: { $gte: since24h },
        })
      : 0,
  ]);

  const [uniqueVisitors7d, uniqueVisitors24h] = await Promise.all([
    hasChatbots
      ? WidgetSession.distinct("sessionId", {
          chatbotToken: { $in: tokens },
          lastSeenAt: { $gte: since7d },
        }).then((x: unknown[]) => x.length)
      : 0,
    hasChatbots
      ? WidgetSession.distinct("sessionId", {
          chatbotToken: { $in: tokens },
          lastSeenAt: { $gte: since24h },
        }).then((x: unknown[]) => x.length)
      : 0,
  ]);

  const [messages7d, messages24h] = await Promise.all([
    hasChatbots
      ? ChatHistory.countDocuments({
          chatbotToken: { $in: tokens },
          timestamp: { $gte: since7d },
        })
      : 0,
    hasChatbots
      ? ChatHistory.countDocuments({
          chatbotToken: { $in: tokens },
          timestamp: { $gte: since24h },
        })
      : 0,
  ]);

  const tokenToChatbot = new Map(
    (chatbots as Array<{ _id: unknown; token: string; name: string }>).map(
      (c) => [c.token, { id: String(c._id), name: c.name }]
    )
  );

  const recentSessions = hasChatbots
    ? await WidgetSession.find({
        chatbotToken: { $in: tokens },
      })
        .sort({ lastSeenAt: -1 })
        .limit(12)
        .lean()
    : [];

  type SessionRow = {
    _id: unknown;
    chatbotToken: string;
    lastSeenAt: Date;
    city?: string;
    region?: string;
    country?: string;
    deviceType?: string;
    os?: string;
    browser?: string;
  };

  function formatWhere(s: SessionRow) {
    const bits = [s.city, s.region, s.country].filter(Boolean);
    return bits.length ? bits.join(", ") : "Unknown";
  }

  function formatDevice(s: SessionRow) {
    const bits = [s.deviceType, s.os, s.browser].filter(Boolean);
    return bits.length ? bits.join(" • ") : "Unknown";
  }

  return (
    <div className="mx-auto max-w-6xl grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sessions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{last24hSessions}</div>
            <div className="text-xs text-muted-foreground">
              Visitors who opened a widget
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Visitors (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{uniqueVisitors24h}</div>
            <div className="text-xs text-muted-foreground">
              Unique session IDs
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sessions (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{last7dSessions}</div>
            <div className="text-xs text-muted-foreground">All chatbots</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Visitors (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{uniqueVisitors7d}</div>
            <div className="text-xs text-muted-foreground">All chatbots</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Messages (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{messages24h}</div>
            <div className="text-xs text-muted-foreground">
              Messages exchanged across all chatbots
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Messages (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{messages7d}</div>
            <div className="text-xs text-muted-foreground">All chatbots</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent visitors</CardTitle>
          <div className="text-sm text-muted-foreground">
            Location is best-effort and depends on your host/proxy headers.
          </div>
        </CardHeader>
        <CardContent>
          {!hasChatbots ? (
            <div className="text-sm text-muted-foreground">
              Create a chatbot to start tracking visitors.
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No sessions tracked yet.
            </div>
          ) : (
            <div className="grid gap-2">
              {(recentSessions as unknown as SessionRow[]).map((s) => {
                const chatbot = tokenToChatbot.get(s.chatbotToken);
                return (
                  <div key={String(s._id)} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {formatDevice(s)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatWhere(s)}
                          {chatbot?.name ? ` • ${chatbot.name}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(s.lastSeenAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!hasChatbots ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Get started</CardTitle>
              <div className="text-sm text-muted-foreground">
                Create your first chatbot to enable analytics.
              </div>
            </div>
            <Link
              href="/dashboard/onboarding"
              className="text-sm font-medium underline underline-offset-4"
            >
              New chatbot
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              After creating a chatbot, add the widget to your site and come
              back here to see visitor and message analytics.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
