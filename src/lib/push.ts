import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";

export type PushPayload = {
  title: string;
  body: string;
  /** Notifikasi dengan tag sama menggantikan yang lama */
  tag: string;
  /** Diisi untuk pengingat tugas: memunculkan tombol ACC / Snooze */
  todoId?: string;
  url?: string;
};

let configured: boolean | null = null;

/** Web push butuh kunci VAPID (lihat .env.example) */
export function pushConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://arah-assist.vercel.app", publicKey, privateKey);
  return (configured = true);
}

/** Kirim ke semua perangkat milik pengguna. Langganan yang sudah tidak berlaku (404/410) dihapus. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return { devices: 0, sent: 0 };
  const db = await getDb();
  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));

  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "high" },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(sub.id);
        else console.warn("[push] gagal mengirim:", status, (err as Error).message);
      }
    }),
  );
  if (expired.length) {
    await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.id, expired));
  }
  return { devices: subs.length, sent };
}
