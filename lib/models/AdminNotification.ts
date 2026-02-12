import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  chatbotToken: { type: String, required: true },
  scheduledFor: { type: Date, required: true },
  sent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  qstashMessageId: { type: String },
});

export default mongoose.models.AdminNotification ||
  mongoose.model("AdminNotification", AdminNotificationSchema);
