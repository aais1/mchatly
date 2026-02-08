import { AppShell } from "@/components/app/shell";
import { requireUser } from "@/lib/auth/server";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  const h = await headers();
  // In Next's app router, we don't reliably get the pathname in a standard header.
  // We'll fall back to a sane default if it's not present.
  const pathFromHeader = h.get("next-url") ?? h.get("x-url") ?? "";
  const pathname = pathFromHeader.startsWith("/")
    ? pathFromHeader
    : "/dashboard";
  const activeHref = pathname;

  let title = "Dashboard";
  if (
    pathname.startsWith("/dashboard/onboarding") ||
    pathname.startsWith("/dashboard/new")
  ) {
    title = "New chatbot";
  } else if (pathname.includes("/live-chats")) {
    title = "Live chats";
  } else if (pathname.startsWith("/dashboard/chatbots/")) {
    title = "Chatbot";
  }

  return (
    <AppShell title={title} activeHref={activeHref} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
