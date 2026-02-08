import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_CHAT_MODEL = "gemini-2.0-flash-lite";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");
  return new GoogleGenerativeAI(apiKey);
}

export async function generateText(opts: {
  prompt: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: opts.model ?? GEMINI_CHAT_MODEL,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
    },
  });

  const text = result.response.text();
  return (text ?? "").trim();
}
