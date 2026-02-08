import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Chatbot } from "@/lib/models/Chatbot";
import { WidgetSession } from "@/lib/models/WidgetSession";

import { TabsNav } from "../layout";

type SessionRow = {
  _id: unknown;
  lastSeenAt: Date;
  city?: string;
  region?: string;
  country?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
};

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  await connectToDatabase();
  const chatbot = await Chatbot.findOne({ _id: id, ownerId: user.id })
    .select("name token")
    .lean();

  if (!chatbot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not found</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You don’t have access to this project.
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [sessions7d, sessions24h] = await Promise.all([
    WidgetSession.countDocuments({
      chatbotToken: chatbot.token,
      lastSeenAt: { $gte: since7d },
    }),
    WidgetSession.countDocuments({
      chatbotToken: chatbot.token,
      lastSeenAt: { $gte: since24h },
    }),
  ]);

  const recent = await WidgetSession.find({ chatbotToken: chatbot.token })
    .sort({ lastSeenAt: -1 })
    .limit(20)
    .lean();

  const base = `/projects/${String(chatbot._id)}`;

  const formatWhere = (s: SessionRow) => {
    const bits = [s.city, s.region, s.country].filter(Boolean);
    return bits.length ? bits.join(", ") : "Unknown";
  };

  const formatDevice = (s: SessionRow) => {
    const bits = [s.deviceType, s.os, s.browser].filter(Boolean);
    return bits.length ? bits.join(" • ") : "Unknown";
  };

  return (
    <div className="grid gap-4">
      <TabsNav base={base} active="analytics" />

      <div className="text-xs text-muted-foreground">
        Settings live under the chatbot overview:{" "}
        <Link
          className="underline"
          href={`/dashboard/chatbots/${String(chatbot._id)}/settings`}
        >
          open settings
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sessions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{sessions24h}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sessions (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{sessions7d}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent visitors</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No sessions tracked yet.
            </div>
          ) : (
            <div className="grid gap-2">
              {(recent as unknown as SessionRow[]).map((s) => (
                <div key={String(s._id)} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatDevice(s)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatWhere(s)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
