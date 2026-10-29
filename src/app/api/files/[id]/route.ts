import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { findOwnedTodo, jsonError, requireUser } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import { listShelf } from "@/lib/files";

async function findOwnedFile(user: SessionUser, id: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.notchTempFiles)
    .where(and(eq(schema.notchTempFiles.id, id), eq(schema.notchTempFiles.userId, user.id)))
    .limit(1);
  const file = rows[0];
  return file && file.expiresAt > new Date() ? file : null;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const file = await findOwnedFile(user, id);
  if (!file) return jsonError("File sudah kedaluwarsa atau dihapus dari rak.", 404);

  return new Response(Buffer.from(file.fileData, "base64"), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

const patchSchema = z.object({ todoItemId: z.uuid().nullable() });

// Menempelkan file ke tugas (drag manual / tombol lampirkan) atau melepasnya kembali ke rak
export async function PATCH(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Tugas tujuan tidak valid.", 400);

  const file = await findOwnedFile(user, id);
  if (!file) return jsonError("File sudah kedaluwarsa atau dihapus dari rak.", 404);

  if (parsed.data.todoItemId && !(await findOwnedTodo(user, parsed.data.todoItemId))) {
    return jsonError("Tugas tujuan tidak ditemukan.", 404);
  }

  const db = await getDb();
  await db
    .update(schema.notchTempFiles)
    .set({ todoItemId: parsed.data.todoItemId })
    .where(eq(schema.notchTempFiles.id, id));

  return NextResponse.json({ files: await listShelf(user) });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;

  const db = await getDb();
  await db
    .delete(schema.notchTempFiles)
    .where(and(eq(schema.notchTempFiles.id, id), eq(schema.notchTempFiles.userId, user.id)));

  return NextResponse.json({ files: await listShelf(user) });
}
