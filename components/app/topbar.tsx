import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AppTopbar({
  title,
  userEmail,
}: {
  title: string;
  userEmail: string;
}) {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="md:hidden"
        aria-label="Menu"
        disabled
      >
        <Menu className="size-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block text-xs text-muted-foreground truncate max-w-[240px]">
          {userEmail}
        </div>
        <Button asChild variant="outline" size="sm">
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/projects">Projects</Link>
        </Button>
        <form
          action="/api/auth/logout"
          method="post"
          className="hidden sm:block"
        >
          <Button variant="outline" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
