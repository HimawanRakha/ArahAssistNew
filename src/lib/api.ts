import "server-only";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser, type SessionUser } from "./auth";
import { getDb, schema } from "./db";
import type { TodoDTO } from "./types";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  return user ?? jsonError("Sesi berakhir. Silakan masuk lagi.", 401);
}

export async function findOwnedTodo(user: SessionUser, todoId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.todoItems)
    .where(
      and(eq(schema.todoItems.id, todoId), eq(schema.todoItems.workspaceId, user.workspaceId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listTodos(user: SessionUser, onlyIds?: string[]): Promise<TodoDTO[]> {
  const db = await getDb();
  const todos = await db
    .select({
      todo: schema.todoItems,
      reminder: schema.taskReminders,
    })
    .from(schema.todoItems)
    .leftJoin(schema.taskReminders, eq(schema.taskReminders.todoItemId, schema.todoItems.id))
    .where(eq(schema.todoItems.workspaceId, user.workspaceId));

  const files = await db
    .select({
      id: schema.notchTempFiles.id,
      todoItemId: schema.notchTempFiles.todoItemId,
      fileName: schema.notchTempFiles.fileName,
      mimeType: schema.notchTempFiles.mimeType,
      filePath: schema.notchTempFiles.filePath,
      expiresAt: schema.notchTempFiles.expiresAt,
    })
    .from(schema.notchTempFiles)
    .where(eq(schema.notchTempFiles.userId, user.id));

  return todos
    .filter(({ todo }) => !onlyIds || onlyIds.includes(todo.id))
    .map(({ todo, reminder }) => ({
      id: todo.id,
      title: todo.title,
      scheduledTime: todo.scheduledTime ? todo.scheduledTime.toISOString() : null,
      status: todo.status,
      createdAt: todo.createdAt.toISOString(),
      files: files
        .filter((f) => f.todoItemId === todo.id && f.expiresAt > new Date())
        .map((f) => ({ id: f.id, fileName: f.fileName, mimeType: f.mimeType, filePath: f.filePath })),
      reminder: reminder
        ? {
            isEnabled: reminder.isEnabled,
            remindAt: reminder.remindAt ? reminder.remindAt.toISOString() : null,
            snoozeMinutes: reminder.snoozeMinutes,
            state: reminder.reminderState,
          }
        : null,
    }))
    .sort(compareTodos);
}

function compareTodos(a: TodoDTO, b: TodoDTO) {
  if (a.scheduledTime && b.scheduledTime) {
    return a.scheduledTime.localeCompare(b.scheduledTime);
  }
  if (a.scheduledTime) return -1;
  if (b.scheduledTime) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}
