import { NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { jsonError, listTodos, requireUser } from "@/lib/api";
import { extractTasks } from "@/lib/ai";
import { listShelf } from "@/lib/files";

const bodySchema = z.object({
  text: z.string().trim().min(3, "Tulis rencanamu dulu.").max(2000),
  // Nilai Date.getTimezoneOffset() dari browser, agar "jam 10.00" sesuai zona waktu pengguna
  tzOffset: z.number().int().min(-840).max(840),
});

// Gemini bisa butuh beberapa detik saat sedang ramai, beri ruang sebelum fungsi serverless dihentikan
export const maxDuration = 60;

const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Rencana tidak valid.", 400);
  }
  const { text, tzOffset } = parsed.data;

  const db = await getDb();
  const shelf = await db
    .select({ id: schema.notchTempFiles.id, fileName: schema.notchTempFiles.fileName })
    .from(schema.notchTempFiles)
    .where(
      and(
        eq(schema.notchTempFiles.userId, user.id),
        isNull(schema.notchTempFiles.todoItemId),
        gt(schema.notchTempFiles.expiresAt, new Date()),
      ),
    );

  const localNow = new Date(Date.now() - tzOffset * 60_000);
  const today = localNow.toISOString().slice(0, 10);
  const result = await extractTasks(text, shelf, today, WEEKDAYS[localNow.getUTCDay()]);

  if (!result.tasks.length) {
    return jsonError("Belum ada tugas yang bisa dikenali. Coba sebut aktivitas dan jamnya.", 422);
  }

  // Simpan semua tugas dan pengingatnya dalam dua query agar cepat walau database jauh
  const rows = result.tasks.map((task) => ({
    id: crypto.randomUUID(),
    title: task.title,
    scheduledTime: task.time ? toUtc(task.date, task.time, tzOffset) : null,
    fileIds: task.fileIds,
  }));
  await db.insert(schema.todoItems).values(
    rows.map((r) => ({
      id: r.id,
      workspaceId: user.workspaceId,
      title: r.title,
      scheduledTime: r.scheduledTime,
    })),
  );
  await db.insert(schema.taskReminders).values(
    rows.map((r) => ({
      id: crypto.randomUUID(),
      todoItemId: r.id,
      isEnabled: false,
      remindAt: r.scheduledTime,
    })),
  );

  // Satu file hanya ditempel ke satu tugas (yang pertama menyebutnya)
  const usedFiles = new Set<string>();
  for (const row of rows) {
    const fileIds = row.fileIds.filter((f) => !usedFiles.has(f));
    if (!fileIds.length) continue;
    fileIds.forEach((f) => usedFiles.add(f));
    await db
      .update(schema.notchTempFiles)
      .set({ todoItemId: row.id })
      .where(
        and(inArray(schema.notchTempFiles.id, fileIds), eq(schema.notchTempFiles.userId, user.id)),
      );
  }
  const createdIds = rows.map((r) => r.id);

  const [todos, files] = await Promise.all([listTodos(user), listShelf(user)]);
  return NextResponse.json({
    mode: result.mode,
    note: result.note,
    created: createdIds,
    attachedFiles: usedFiles.size,
    todos,
    files,
  });
}

function toUtc(date: string, time: string, tzOffset: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + tzOffset * 60_000);
}
