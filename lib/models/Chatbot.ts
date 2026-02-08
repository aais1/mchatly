import mongoose, { type Model } from "mongoose";

export type ChatbotDocument = mongoose.Document & {
  ownerId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  token: string;
  instructionText?: string;
  instructionTextChars?: number;
  instructionTextChunkCount?: number;
  settings?: {
    tone?: string;
    humor?: string;
    theme?: string;
    allowEmojis?: boolean;
    widgetThemeMode?: "light" | "dark" | "system";
    widgetPrimaryColor?: string;
    widgetUserBubbleColor?: string;
    widgetBotBubbleColor?: string;
    widgetUserTextColor?: string;
    widgetBotTextColor?: string;
    widgetWelcomeMessage?: string;
  };
  instructionFiles?: Array<{
    _id?: mongoose.Types.ObjectId;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    text?: string;
    textChars?: number;
    chunkCount?: number;
    createdAt: Date;
  }>;
  faqs?: Array<{
    _id?: mongoose.Types.ObjectId;
    question: string;
    answer: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const ChatbotSchema = new mongoose.Schema<ChatbotDocument>(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: { type: String, trim: true, maxlength: 500 },
    token: { type: String, required: true, unique: true, index: true },

    instructionText: { type: String, default: "" },
    instructionTextChars: { type: Number, default: 0 },
    instructionTextChunkCount: { type: Number, default: 0 },

    settings: {
      tone: { type: String, default: "friendly" },
      humor: { type: String, default: "low" },
      theme: { type: String, default: "system" },
      allowEmojis: { type: Boolean, default: true },

      // Widget appearance
      widgetThemeMode: { type: String, default: "system" },
      widgetPrimaryColor: { type: String, default: "#111111" },
      widgetUserBubbleColor: { type: String, default: "#111111" },
      widgetBotBubbleColor: { type: String, default: "#f1f1f1" },
      widgetUserTextColor: { type: String, default: "#ffffff" },
      widgetBotTextColor: { type: String, default: "#111111" },

      // Widget behavior
      widgetWelcomeMessage: { type: String, default: "" },
      starterQuestions: { type: [String], default: [] },
    },

    instructionFiles: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        text: { type: String, default: "" },
        textChars: { type: Number, default: 0 },
        chunkCount: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    faqs: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        question: { type: String, required: true, trim: true, maxlength: 2000 },
        answer: { type: String, required: true, trim: true, maxlength: 8000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Chatbot: Model<ChatbotDocument> =
  (mongoose.models.Chatbot as Model<ChatbotDocument>) ||
  mongoose.model<ChatbotDocument>("Chatbot", ChatbotSchema);
