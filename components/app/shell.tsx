import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";

export function AppShell({
  title,
  activeHref,
  userEmail,
  children,
}: {
  title: string;
  activeHref: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="flex min-h-dvh">
        <AppSidebar activeHref={activeHref} userEmail={userEmail} />
        <div className="flex-1 min-w-0">
          <AppTopbar title={title} userEmail={userEmail} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
