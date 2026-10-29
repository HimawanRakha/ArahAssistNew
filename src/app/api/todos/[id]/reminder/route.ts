import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { findOwnedTodo, jsonError, listTodos, requireUser } from "@/lib/api";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enable") }),
  z.object({ action: z.literal("disable") }),
  z.object({ action: z.literal("acc") }),
  z.object({
    action: z.literal("snooze"),
    minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  }),
]);

export async function PATCH(request: Request, ctx: RouteContext<"/api/todos/[id]/reminder">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const todo = await findOwnedTodo(user, id);
  if (!todo) return jsonError("Tugas tidak ditemukan.", 404);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Aksi pengingat tidak valid.", 400);
  const body = parsed.data;

  if (body.action === "enable" && !todo.scheduledTime) {
    return jsonError("Tugas ini belum punya jam, jadi pengingat belum bisa dinyalakan.", 400);
  }

  const db = await getDb();
  const values = (() => {
    switch (body.action) {
      case "enable":
        return {
          isEnabled: true,
          remindAt: todo.scheduledTime,
          snoozeMinutes: null,
          reminderState: "waiting" as const,
        };
      case "disable":
        return { isEnabled: false };
      case "acc":
        return { reminderState: "acc" as const };
      case "snooze":
        return {
          remindAt: new Date(Date.now() + body.minutes * 60_000),
          snoozeMinutes: body.minutes,
          reminderState: "snoozed" as const,
        };
    }
  })();

  await db
    .insert(schema.taskReminders)
    .values({ id: crypto.randomUUID(), todoItemId: id, remindAt: todo.scheduledTime, ...values })
    .onConflictDoUpdate({ target: schema.taskReminders.todoItemId, set: values });

  // ACC langsung mengubah status tugas di Workspace menjadi "Sedang dikerjakan"
  if (body.action === "acc" && todo.status === "pending") {
    await db.update(schema.todoItems).set({ status: "acc" }).where(eq(schema.todoItems.id, id));
  }

  const [updated] = await listTodos(user, [id]);
  return NextResponse.json({ todo: updated });
}
