import Link from "next/link";

import { requireUser } from "@/lib/auth/server";

function TabsNav({
  base,
  active,
}: {
  base: string;
  active: "overview" | "chats" | "analytics" | "settings";
}) {
  const item = (key: typeof active, label: string, href: string) => {
    const isActive = key === active;
    return (
      <Link
        key={key}
        href={href}
        className={
          "rounded-md px-3 py-2 text-sm border transition-colors " +
          (isActive
            ? "bg-accent text-accent-foreground border-transparent"
            : "hover:bg-accent hover:text-accent-foreground")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {item("overview", "Overview", base)}
      {item("chats", "Chats", `${base}/chats`)}
      {item("analytics", "Analytics", `${base}/analytics`)}
      {item("settings", "Settings", `${base}/settings`)}
    </div>
  );
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // Active tab is inferred client-side by pages; layout just renders nav using the current segment.
  // We keep it simple by placing the nav shell in each page (so no segment parsing here).

  return (
    <main className="min-h-dvh bg-muted/30">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-semibold">Project</div>
            <div className="text-sm text-muted-foreground break-all">{id}</div>
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[260px]">
            {user.email}
          </div>
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export { TabsNav };
