import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini embedding model currently used.
 * Note: Pinecone index dimension must match this model’s output dimension.
 */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");
  return new GoogleGenerativeAI(apiKey);
}

export async function embedText(text: string): Promise<number[]> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

  // Gemini embedContent expects a string; normalize whitespace a bit.
  const normalized = text.replace(/\n/g, " ").trim();
  const result = await model.embedContent(normalized);

  const values = result.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("No embedding values returned from Gemini");
  }

  return values;
}

/**
 * Batch helper matching the previous OpenAI helper signature.
 * Executes sequentially to avoid surprise rate-limit bursts.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embedText(t));
  return out;
}
