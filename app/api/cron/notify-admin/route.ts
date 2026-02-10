import { connectToDatabase } from "@/lib/db/mongoose";
import AdminNotification from "@/lib/models/AdminNotification";
import { ChatHistory } from "@/lib/models/ChatHistory";
import { PushSubscription } from "@/lib/models/PushSubscription";
import { Chatbot } from "@/lib/models/Chatbot";
import { sendPushNotification } from "@/lib/pushNotify";

export async function POST() {
  await connectToDatabase();

  // Find all unsent notifications that are due
  const now = new Date();
  const notifications = await AdminNotification.find({
    sent: false,
    scheduledFor: { $lte: now },
  });

  for (const notif of notifications) {
    // Check if admin has replied since notification was scheduled
    const adminReply = await ChatHistory.findOne({
      sessionId: notif.sessionId,
      chatbotToken: notif.chatbotToken,
      messageBy: "admin",
      timestamp: { $gt: notif.scheduledFor },
    });
    if (adminReply) {
      notif.sent = true;
      await notif.save();
      continue;
    }

    // Send notification to all push subscribers
    const subscriptions = await PushSubscription.find({});
    const chatbot = await Chatbot.findOne({ token: notif.chatbotToken }).select("_id");
    const chatbotId = chatbot ? chatbot._id.toString() : notif.chatbotToken;
    for (const sub of subscriptions) {
      try {
        await sendPushNotification({ endpoint: sub.endpoint, keys: sub.keys }, {
          title: "Mchatly: User waiting",
          body: "A user is waiting for a reply.",
          tag: notif.sessionId,
          data: {
            url: `/dashboard/chatbots/${chatbotId}/live-chats?session=${notif.sessionId}`,
          },
        });
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
    notif.sent = true;
    await notif.save();
  }

  return Response.json({ processed: notifications.length });
}
