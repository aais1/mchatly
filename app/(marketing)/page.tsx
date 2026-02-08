import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MarketingHomePage() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 grid gap-10">
        <div className="grid gap-4">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            MVP is live
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            mchatly — your chatbot SaaS starter
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Create chatbots, embed them on your site, and track basic stats.
            This is a simple MVP with JWT auth and a dashboard.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Create chatbots</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Generate a unique token and embed with an iframe widget.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embed anywhere</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Copy/paste embed code. No bundling required.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>See stats</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Dashboard shows dummy stats (for now) and your chatbots.
            </CardContent>
          </Card>
        </div>

        <footer className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} mchatly
        </footer>
      </div>
    </main>
  );
}
