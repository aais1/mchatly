import { redirect } from "next/navigation";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // /projects is just a picker; the actual chatbot UI lives in /dashboard.
  redirect(`/dashboard/chatbots/${id}/overview`);
}
