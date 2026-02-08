import { NextRequest, NextResponse } from 'next/server';
import { ChatHistory } from '@/lib/models/ChatHistory';
import { connectToDatabase } from '@/lib/db/mongoose';

// In-memory store for notifications (for demo; use DB or Ably in production)
const pendingNotifications: { sessionId: string; timestamp: number }[] = [];

// Store last check for each session
const sessionTimers: Record<string, number> = {};

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    await connectToDatabase();
    // Store timer start
    sessionTimers[sessionId] = Date.now();
    return NextResponse.json({ notified: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  await connectToDatabase();
  const now = Date.now();
  const notifications: { sessionId: string }[] = [];
  // Get subscriptions
  let subscriptions: any[] = [];
  try {
    const subsRes = await fetch(process.env.SITE_URL+'/api/push-subscribe');
    const subsData = await subsRes.json().catch(() => ({}));
    subscriptions = Array.isArray(subsData.subscriptions) ? subsData.subscriptions : [];
  } catch {}
  for (const sessionId in sessionTimers) {
    const timerStart = sessionTimers[sessionId];
    if (now - timerStart >= 1800000) {
      // Find the last user message
      const lastUserMsg = await ChatHistory.findOne({ sessionId, messageBy: "user" })
        .sort({ timestamp: -1 })
        .lean();
      if (lastUserMsg) {
        // Check if any admin message exists after this user message
        const adminReply = await ChatHistory.findOne({ sessionId, messageBy: "admin", timestamp: { $gt: lastUserMsg.timestamp } });
        if (!adminReply) {
          // No reply yet, notify admin
          notifications.push({ sessionId });
          // Send push notifications
          for (const sub of subscriptions) {
            try {
            const { sendPushNotification } = await import('@/lib/pushNotify');
              await sendPushNotification(sub, {
                title: 'Mchatly: User waiting',
                body: `Session ${sessionId} has not received a reply`,
                tag: sessionId,
              });
            } catch {}
          }
          // Remove timer so only one notification per session
          delete sessionTimers[sessionId];
        } else {
          // If replied, remove timer
          delete sessionTimers[sessionId];
        }
      } else {
        // No user message, remove timer
        delete sessionTimers[sessionId];
      }
    }
  }
  return NextResponse.json({ notifications });
}