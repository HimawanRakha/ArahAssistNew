import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { findOwnedTodo, jsonError, listTodos, requireUser } from "@/lib/api";

const patchSchema = z.object({
  status: z.enum(["pending", "acc", "completed"]).optional(),
  title: z.string().trim().min(1, "Judul tugas tidak boleh kosong.").max(200).optional(),
  /** Ubah jadwal: tanggal & jam lokal pengguna; time null berarti tugas tanpa jam */
  schedule: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      tzOffset: z.number().int().min(-840).max(840),
    })
    .optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/todos/[id]">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const todo = await findOwnedTodo(user, id);
  if (!todo) return jsonError("Tugas tidak ditemukan.", 404);

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Perubahan tidak valid.", 400);
  const { schedule, ...fields } = parsed.data;

  const db = await getDb();
  const changes: Partial<typeof schema.todoItems.$inferInsert> = { ...fields };
  if (schedule) {
    const [y, m, d] = schedule.date.split("-").map(Number);
    const [hh, mm] = (schedule.time ?? "00:00").split(":").map(Number);
    changes.scheduledTime = schedule.time ? new Date(Date.UTC(y, m - 1, d, hh, mm) + schedule.tzOffset * 60_000) : null;
  }
  if (Object.keys(changes).length) {
    await db.update(schema.todoItems).set(changes).where(eq(schema.todoItems.id, id));
  }

  // Jadwal berubah: pengingat ikut pindah ke jam baru, atau mati bila tugas kini tanpa jam
  if (schedule) {
    const remindAt = changes.scheduledTime ?? null;
    await db
      .update(schema.taskReminders)
      .set(
        remindAt
          ? { remindAt, reminderState: "waiting", snoozeMinutes: null }
          : { remindAt: null, isEnabled: false, reminderState: "waiting", snoozeMinutes: null },
      )
      .where(eq(schema.taskReminders.todoItemId, id));
  }

  const [updated] = await listTodos(user, [id]);
  return NextResponse.json({ todo: updated });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/todos/[id]">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const todo = await findOwnedTodo(user, id);
  if (!todo) return jsonError("Tugas tidak ditemukan.", 404);

  const db = await getDb();
  await db.delete(schema.todoItems).where(eq(schema.todoItems.id, id));
  return NextResponse.json({ ok: true });
}
