
import AdminNotification from "@/lib/models/AdminNotification";
import { connectToDatabase } from "@/lib/db/mongoose";
import { scheduleQStashNotification } from "@/lib/qstash";
;

// Schedule an admin notification for 40 seconds from now using QStash v2
export async function scheduleAdminNotification(sessionId: string, chatbotToken: string) {
  await connectToDatabase();

  // Remove any previous unsent notifications for this session/chatbot
  await AdminNotification.deleteMany({ sessionId, chatbotToken, sent: false });

  // Notification endpoint
  const notifyUrl = `${process.env.NEXT_BASE_URL || "https://yourdomain.com"}/api/notify-admin`;
  console.log("sending from", notifyUrl);

  // Schedule 1 minute from now
  const scheduledFor = new Date(Date.now() + 60 * 1000);

  // Schedule QStash job using v2 scheduleAt
  const messageId = await scheduleQStashNotification({
    url: notifyUrl,
    delaySeconds: 60, // fallback for v1
    scheduledAt: scheduledFor.toISOString(), // v2 compliant
    body: { sessionId, chatbotToken },
  });

  // Save the scheduled notification in DB
  await AdminNotification.create({
    sessionId,
    chatbotToken,
    scheduledFor,
    qstashMessageId: messageId,
  });

  console.log(`Admin notification scheduled for ${scheduledFor.toISOString()}`);
}
