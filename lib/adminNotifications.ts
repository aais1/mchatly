

import AdminNotification from "@/lib/models/AdminNotification";
import { connectToDatabase } from "@/lib/db/mongoose";

// Schedules a persistent admin notification for 1 minute from now (for demo; adjust as needed)
export async function scheduleAdminNotification(sessionId: string, chatbotToken: string) {
  await connectToDatabase();
  // Remove any existing unsent notification for this session
  await AdminNotification.deleteMany({ sessionId, chatbotToken, sent: false });
  // Schedule a new notification for 1 minute from now
  const scheduledFor = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
  await AdminNotification.create({ sessionId, chatbotToken, scheduledFor });
}
