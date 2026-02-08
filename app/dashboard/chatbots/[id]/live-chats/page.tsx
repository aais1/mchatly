import { LiveChats } from "@/components/app/live-chats";

export default async function LiveChatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl grid gap-4">
      <div>
        <div className="text-2xl font-semibold">Live chats</div>
        <div className="text-sm text-muted-foreground">
          Monitor active sessions and join a chat to talk in real time.
        </div>
      </div>
      <LiveChats chatbotId={id} />
    </div>
  );
}
