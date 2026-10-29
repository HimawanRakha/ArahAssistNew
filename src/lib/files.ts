import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { SessionUser } from "./auth";
import type { ShelfFileDTO } from "./types";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const TTL_HOURS = 24;

export async function listShelf(user: SessionUser): Promise<ShelfFileDTO[]> {
  const db = await getDb();
  // Pembersihan otomatis: file yang lewat masa simpan dihapus setiap rak dibuka
  await db
    .delete(schema.notchTempFiles)
    .where(
      and(
        eq(schema.notchTempFiles.userId, user.id),
        lt(schema.notchTempFiles.expiresAt, new Date()),
      ),
    );

  const rows = await db
    .select({
      id: schema.notchTempFiles.id,
      fileName: schema.notchTempFiles.fileName,
      mimeType: schema.notchTempFiles.mimeType,
      fileSize: schema.notchTempFiles.fileSize,
      filePath: schema.notchTempFiles.filePath,
      todoItemId: schema.notchTempFiles.todoItemId,
      createdAt: schema.notchTempFiles.createdAt,
      expiresAt: schema.notchTempFiles.expiresAt,
    })
    .from(schema.notchTempFiles)
    .where(eq(schema.notchTempFiles.userId, user.id));

  return rows
    .map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
