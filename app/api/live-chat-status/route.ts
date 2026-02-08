import { jsonError } from "@/lib/http";

export async function GET(_req: Request) {
  return jsonError("Live chat status polling is deprecated", 410, {
    hint: "Use Ably presence on the live-chat channel instead.",
  });
}
