
import { Client } from "@upstash/qstash";

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash-eu-central-1.upstash.io";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;

export const qstashClient = new Client({
  baseUrl: QSTASH_URL,
  token: QSTASH_TOKEN!,
});

export async function scheduleQStashNotification({ url, delaySeconds, scheduledAt, body }: { url: string; delaySeconds?: number; scheduledAt?: string; body?: any }) {
  console.log(`[QStash] Request: Scheduling notification`, { url, delaySeconds, scheduledAt, body });
  const res = await qstashClient.publish({
    url,
    delay: delaySeconds,
    scheduledAt,
    body: body ? JSON.stringify(body) : undefined,
  });
  console.log(`[QStash] Response:`, res);
  if (!res.messageId) throw new Error("QStash schedule failed");
  return res.messageId;
}

export async function deleteQStashNotification(messageId: string) {
  try {
    console.log(`[QStash] Request: Deleting notification`, { messageId });
    await qstashClient.messages.delete(messageId);
    console.log(`[QStash] Response: deleted`);
    return true;
  } catch (e: any) {
   
    console.log(`[QStash] Error deleting notification`, { messageId, error: e });
    return false;
  }
}
