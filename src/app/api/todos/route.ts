import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { jsonError, listTodos, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ todos: await listTodos(user) });
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Isi nama tugasnya dulu.").max(200),
  /** Tanggal lokal YYYY-MM-DD; hanya dipakai bila jam diisi */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** Jam lokal HH:MM; kosong berarti tugas masuk tab "Tanpa jam" */
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  tzOffset: z.number().int().min(-840).max(840),
  reminder: z.boolean().default(false),
  fileIds: z.array(z.uuid()).max(10).default([]),
});

// Tambah tugas manual dari Notch atau Workspace (tanpa AI)
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Data tugas belum lengkap.", 400);
  }
  const { title, date, time, tzOffset, reminder, fileIds } = parsed.data;

  let scheduledTime: Date | null = null;
  if (time) {
    const day = date ?? new Date(Date.now() - tzOffset * 60_000).toISOString().slice(0, 10);
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    scheduledTime = new Date(Date.UTC(y, m - 1, d, hh, mm) + tzOffset * 60_000);
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(schema.todoItems).values({ id, workspaceId: user.workspaceId, title, scheduledTime });
  await db.insert(schema.taskReminders).values({
    id: crypto.randomUUID(),
    todoItemId: id,
    isEnabled: reminder && !!scheduledTime,
    remindAt: scheduledTime,
  });
  if (fileIds.length) {
    // Hanya file milik pengguna yang belum tertempel ke tugas lain
    await db
      .update(schema.notchTempFiles)
      .set({ todoItemId: id })
      .where(
        and(
          inArray(schema.notchTempFiles.id, fileIds),
          eq(schema.notchTempFiles.userId, user.id),
          isNull(schema.notchTempFiles.todoItemId),
        ),
      );
  }

  const todos = await listTodos(user);
  return NextResponse.json({ todo: todos.find((t) => t.id === id), todos }, { status: 201 });
}
