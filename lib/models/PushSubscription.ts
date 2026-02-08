import mongoose, { type Model } from "mongoose";

export type PushSubscriptionDocument = mongoose.Document & {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
};

const PushSubscriptionSchema = new mongoose.Schema<PushSubscriptionDocument>(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "push_subscriptions" }
);

export const PushSubscription: Model<PushSubscriptionDocument> =
  (mongoose.models.PushSubscription as Model<PushSubscriptionDocument>) ||
  mongoose.model<PushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);
