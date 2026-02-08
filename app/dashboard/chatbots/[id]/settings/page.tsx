import { redirect } from "next/navigation";

export default async function ChatbotSettingsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Reuse the existing settings UI.
  redirect(`/dashboard/chatbots/${id}/manage`);
}
