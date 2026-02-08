import { z } from "zod";

import { requireUser } from "@/lib/auth/server";
import { jsonError, jsonOk } from "@/lib/http";

const QuerySchema = z.object({
  token: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    await requireUser();

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      token: url.searchParams.get("token"),
    });
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    // Dummy stats for now.
    return jsonOk({
      token: parsed.data.token,
      stats: {
        conversations7d: 42,
        messages7d: 180,
        avgResponseSeconds: 1.2,
        satisfaction: 0.86,
      },
    });
  } catch {
    return jsonError("Unauthenticated", 401);
  }
}
