import { CHATBOT_LIMITS } from "@/lib/chatbot/config";

export function chunkText(
  input: string,
  opts?: {
    maxChars?: number;
    overlapChars?: number;
    maxChunks?: number;
  }
): string[] {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const maxChars = opts?.maxChars ?? CHATBOT_LIMITS.embeddingChunkMaxChars;
  const overlapChars =
    opts?.overlapChars ?? CHATBOT_LIMITS.embeddingChunkOverlapChars;
  const maxChunks = opts?.maxChunks ?? CHATBOT_LIMITS.embeddingMaxChunksPerFile;

  const safeMax = Math.max(200, maxChars);
  const safeOverlap = Math.max(0, Math.min(overlapChars, safeMax - 1));

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + safeMax, text.length);
    chunks.push(text.slice(start, end).trim());

    if (end >= text.length) break;
    start = end - safeOverlap;
  }

  return chunks.filter(Boolean);
}
