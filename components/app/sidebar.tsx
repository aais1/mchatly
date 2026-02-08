import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
];

function getChatbotIdFromPath(pathname: string) {
  const m = /^\/dashboard\/chatbots\/([^/]+)(?:\/|$)/.exec(pathname);
  return m?.[1] ?? null;
}

export function AppSidebar({
  activeHref,
  userEmail,
}: Readonly<{
  activeHref: string;
  userEmail: string;
}>) {
  const chatbotId = getChatbotIdFromPath(activeHref);
  const globalNav = NAV;

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-background">
      <div className="h-14 px-4 flex items-center border-b">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          mchatly
        </Link>
      </div>

      <nav className="p-2 grid gap-1">
        {globalNav.map((item) => {
          const isActive =
            activeHref === item.href || activeHref.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                isActive && "bg-accent text-accent-foreground font-medium"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        {chatbotId ? (
          <>
            <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
              Chatbot
            </div>
            <Link
              href={`/dashboard/chatbots/${chatbotId}/overview`}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                activeHref.startsWith(
                  `/dashboard/chatbots/${chatbotId}/overview`
                ) && "bg-accent text-accent-foreground font-medium"
              )}
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/chatbots/${chatbotId}/settings`}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                (activeHref.startsWith(
                  `/dashboard/chatbots/${chatbotId}/settings`
                ) ||
                  activeHref.includes(
                    `/dashboard/chatbots/${chatbotId}/manage`
                  )) &&
                  "bg-accent text-accent-foreground font-medium"
              )}
            >
              Settings
            </Link>
            <Link
              href={`/dashboard/chatbots/${chatbotId}/live-chats`}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                activeHref.startsWith(
                  `/dashboard/chatbots/${chatbotId}/live-chats`
                ) && "bg-accent text-accent-foreground font-medium"
              )}
            >
              Chats
            </Link>
            <Link
              href={`/dashboard/chatbots/${chatbotId}/onboarding?step=identity`}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                activeHref.includes(
                  `/dashboard/chatbots/${chatbotId}/onboarding`
                ) && "bg-accent text-accent-foreground font-medium"
              )}
            >
              Onboarding
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-auto p-4 border-t grid gap-2">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="text-sm font-medium break-all">{userEmail}</div>
        <form action="/api/auth/logout" method="post">
          <Button className="w-full" variant="outline" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </aside>
  );
}
