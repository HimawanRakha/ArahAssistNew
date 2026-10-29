import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

// Simpan langganan notifikasi perangkat ini (dipanggil setelah pengguna mengizinkan notifikasi)
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Data langganan notifikasi tidak valid.", 400);
  const { endpoint, keys } = parsed.data;

  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({ id: crypto.randomUUID(), userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = z.object({ endpoint: z.url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Perangkat tidak dikenali.", 400);

  const db = await getDb();
  await db
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.endpoint, parsed.data.endpoint), eq(schema.pushSubscriptions.userId, user.id)));
  return NextResponse.json({ ok: true });
}
