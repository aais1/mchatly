import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Chatbot } from "@/lib/models/Chatbot";

export default async function ProjectChatsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  await connectToDatabase();
  const chatbot = await Chatbot.findOne({ _id: id, ownerId: user.id })
    .select("token")
    .lean();

  if (!chatbot) {
    redirect("/projects");
  }

  redirect(`/history?token=${encodeURIComponent(chatbot.token)}`);
}
