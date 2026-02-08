import { connectToDatabase } from "@/lib/db/mongoose";
import { getAuthTokenFromCookies } from "@/lib/auth/cookies";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { User, type UserDocument } from "@/lib/models/User";

export type AuthedUser = {
  id: string;
  email: string;
};

export async function requireUser(): Promise<AuthedUser> {
  const token = await getAuthTokenFromCookies();
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const payload = verifyAuthToken(token);
  await connectToDatabase();

  const user: UserDocument | null = await User.findById(payload.sub)
    .select("email")
    .lean();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return { id: user._id.toString(), email: user.email };
}

export async function getOptionalUser(): Promise<AuthedUser | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}
