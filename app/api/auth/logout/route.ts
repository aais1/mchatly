import { jsonOk } from "@/lib/http";
import { clearAuthCookie } from "@/lib/auth/cookies";

export async function POST() {
  await clearAuthCookie();
  return jsonOk({ ok: true });
}
