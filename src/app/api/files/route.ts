import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { listShelf, MAX_FILE_BYTES, TTL_HOURS } from "@/lib/files";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ files: await listShelf(user) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const form = await request.formData().catch(() => null);
  const uploads = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File);
  if (!uploads.length) return jsonError("Pilih minimal satu file.", 400);

  const tooBig = uploads.find((f) => f.size > MAX_FILE_BYTES);
  if (tooBig) {
    return jsonError(`${tooBig.name} lebih dari 4 MB. Kompres dulu atau pilih file lain.`, 413);
  }

  const db = await getDb();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  for (const file of uploads) {
    const id = crypto.randomUUID();
    await db.insert(schema.notchTempFiles).values({
      id,
      userId: user.id,
      fileName: file.name,
      filePath: `/api/files/${id}`,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      fileData: Buffer.from(await file.arrayBuffer()).toString("base64"),
      expiresAt,
    });
  }

  return NextResponse.json({ files: await listShelf(user) });
}
