import mongoose, { type Model } from "mongoose";

export type WidgetSessionDocument = mongoose.Document & {
  chatbotToken: string;
  sessionId: string;
  userId?: string;
  messages?: Array<{
    role: string;
    text: string;
    timestamp: Date;
  }>;

  // Timing
  startedAt: Date;
  lastSeenAt: Date;

  // Network / geo (best-effort)
  ip?: string;
  country?: string;
  region?: string;
  city?: string;

  // Client/device
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: "mobile" | "tablet" | "desktop" | "bot" | "unknown";

  // Context
  referrer?: string;
  pageUrl?: string;
  language?: string;
  timezone?: string;
};

const WidgetSessionSchema = new mongoose.Schema<WidgetSessionDocument>(
  {
  chatbotToken: { type: String, required: true, index: true },
  sessionId: { type: String, required: true },
  userId: { type: String },

    startedAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now, expires: '7d' },

    ip: { type: String },
    country: { type: String },
    region: { type: String },
    city: { type: String },

    userAgent: { type: String },
    browser: { type: String },
    os: { type: String },
    deviceType: { type: String },

    referrer: { type: String },
    pageUrl: { type: String },
    language: { type: String },
    timezone: { type: String },
    messages: [
      {
        role: { type: String, required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { collection: "widget_sessions" }
);

WidgetSessionSchema.index({ chatbotToken: 1, sessionId: 1 }, { unique: true });
WidgetSessionSchema.index({ chatbotToken: 1, lastSeenAt: -1 });

export const WidgetSession: Model<WidgetSessionDocument> =
  (mongoose.models.WidgetSession as Model<WidgetSessionDocument>) ||
  mongoose.model<WidgetSessionDocument>("WidgetSession", WidgetSessionSchema);
