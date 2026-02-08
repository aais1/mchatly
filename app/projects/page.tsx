import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Chatbot } from "@/lib/models/Chatbot";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
  const user = await requireUser();

  await connectToDatabase();
  const chatbots = await Chatbot.find({ ownerId: user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("name description token createdAt")
    .lean();

  if (chatbots.length > 0) {
    const first = chatbots[0];
    redirect(`/dashboard/chatbots/${String(first._id)}/overview`);
  }

  return (
    <main className="min-h-dvh bg-muted/30">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-semibold">Projects</div>
            <div className="text-sm text-muted-foreground">
              Pick a chatbot to view overview, chats, analytics, and settings.
            </div>
          </div>

          <div className="text-xs text-muted-foreground truncate max-w-[260px]">
            {user.email}
          </div>
        </header>

        <div className="mt-6 grid gap-4">
          {chatbots.length === 0 ? (
            <div className="rounded-[15px] border bg-background p-6 text-sm text-muted-foreground">
              No chatbots yet. Create your first project.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/onboarding"
              className="group rounded-[15px] border bg-background p-5 hover:shadow-sm transition-shadow"
            >
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center gap-3 text-center">
                <div className="size-10 rounded-full border flex items-center justify-center">
                  <Plus className="size-5" />
                </div>
                <div className="font-medium">Create new chatbot</div>
                <div className="text-xs text-muted-foreground">
                  Start a new project
                </div>
              </div>
            </Link>

            {chatbots.map((c) => (
              <Link
                key={String(c._id)}
                href={`/dashboard/chatbots/${String(c._id)}/overview`}
                className="rounded-[15px] border bg-background p-5 hover:shadow-sm transition-shadow"
              >
                <div className="grid gap-2">
                  <div className="text-lg font-semibold truncate">{c.name}</div>
                  {c.description ? (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No description
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap gap-3 text-sm">
                    <span className="underline underline-offset-4">Open</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Settings</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Analytics</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
