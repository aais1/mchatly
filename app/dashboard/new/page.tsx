"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewChatbotPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/onboarding");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
