import { NextResponse } from 'next/server';

// Replace with your own VAPID public key
const VAPID_PUBLIC_KEY = 'BGFOd3O5E6IZY_bujdrHnfIqptUxG9GKN0enh7YQxC3zdhwCWekyvFUUJxXel-PIoxNcckSCtmAUHz7S9MKYRY0';

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}
