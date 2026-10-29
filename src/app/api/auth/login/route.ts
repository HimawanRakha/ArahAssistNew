import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Isi email dan kata sandi.", 400);
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return jsonError("Email atau kata sandi tidak cocok.", 401);
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
