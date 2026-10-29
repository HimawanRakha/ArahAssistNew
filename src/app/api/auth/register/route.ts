import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 huruf").max(60),
  email: z.email("Format email belum benar").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Data belum lengkap", 400);
  }
  const { name, email, password } = parsed.data;

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length) {
    return jsonError("Email ini sudah terdaftar. Masuk dengan email tersebut.", 409);
  }

  const userId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });
  await db.insert(schema.workspaces).values({
    id: crypto.randomUUID(),
    userId,
    workspaceName: `Workspace ${name.split(" ")[0]}`,
  });

  await createSession(userId);
  return NextResponse.json({ ok: true });
}
