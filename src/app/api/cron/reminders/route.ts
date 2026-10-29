import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { pushConfigured, sendPushToUser } from "@/lib/push";

/** Pengingat yang terlewat lebih lama dari ini tidak dikirim lagi (mis. saat penjadwal baru dinyalakan) */
const MAX_LATE_MS = 2 * 60 * 60 * 1000;

/**
 * Penjadwal notifikasi HP: dipanggil setiap menit oleh layanan cron (lihat README).
 * Mengirim web push untuk setiap pengingat yang jatuh tempo dan belum pernah dikirim untuk jadwal itu.
 * Autentikasi: header "Authorization: Bearer <CRON_SECRET>". Sengaja tidak lewat query string agar token tidak tercatat di log.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return jsonError("CRON_SECRET belum diisi.", 500);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return jsonError("Tidak diizinkan.", 401);
  if (!pushConfigured()) return jsonError("Kunci VAPID belum diisi.", 503);

  const now = new Date();
  const db = await getDb();
  const due = await db
    .select({
      reminderId: schema.taskReminders.id,
      remindAt: schema.taskReminders.remindAt,
      state: schema.taskReminders.reminderState,
      todoId: schema.todoItems.id,
      title: schema.todoItems.title,
      userId: schema.workspaces.userId,
    })
    .from(schema.taskReminders)
    .innerJoin(schema.todoItems, eq(schema.todoItems.id, schema.taskReminders.todoItemId))
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.todoItems.workspaceId))
    .where(
      and(
        eq(schema.taskReminders.isEnabled, true),
        ne(schema.taskReminders.reminderState, "acc"),
        ne(schema.todoItems.status, "completed"),
        lte(schema.taskReminders.remindAt, now),
        gt(schema.taskReminders.remindAt, new Date(now.getTime() - MAX_LATE_MS)),
        or(isNull(schema.taskReminders.pushedFor), ne(schema.taskReminders.pushedFor, schema.taskReminders.remindAt)),
      ),
    );

  if (!due.length) return NextResponse.json({ due: 0, sent: 0 });

  // Tandai dulu sebelum mengirim, agar dua panggilan cron yang bertumpuk tidak mengirim dua kali
  for (const r of due) {
    await db
      .update(schema.taskReminders)
      .set({ pushedFor: r.remindAt })
      .where(eq(schema.taskReminders.id, r.reminderId));
  }

  let sent = 0;
  for (const r of due) {
    const result = await sendPushToUser(r.userId, {
      title: r.title,
      body:
        r.state === "snoozed"
          ? "Pengingat setelah ditunda. ACC untuk mulai, atau Snooze lagi 10 menit."
          : "Waktunya mulai. ACC untuk mulai, atau Snooze 10 menit.",
      tag: `todo-${r.todoId}`,
      todoId: r.todoId,
      url: "/workspace",
    });
    sent += result.sent;
  }
  return NextResponse.json({ due: due.length, sent });
}
