import { jsonError, jsonOk } from "@/lib/http";
import { getOptionalUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getOptionalUser();
  if (!user) return jsonError("Unauthenticated", 401);
  return jsonOk({ user });
}
