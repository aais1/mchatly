import { z } from "zod";

import { connectToDatabase } from "@/lib/db/mongoose";
import { jsonError, jsonOk } from "@/lib/http";
import { setAuthCookie } from "@/lib/auth/cookies";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { User } from "@/lib/models/User";

const BodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, { issues: parsed.error.issues });
    }

    const email = parsed.data.email.toLowerCase().trim();

    await connectToDatabase();

    const user = await User.findOne({ email }).select("email passwordHash");
    if (!user) {
      // avoid user enumeration
      return jsonError("Invalid email or password", 401);
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return jsonError("Invalid email or password", 401);
    }

    const token = signAuthToken({
      sub: user._id.toString(),
      email: user.email,
    });
    await setAuthCookie(token);

    return jsonOk({ user: { id: user._id.toString(), email: user.email } });
  } catch {
    return jsonError("Server error", 500);
  }
}
