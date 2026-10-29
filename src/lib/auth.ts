import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

const COOKIE_NAME = "arah_session";
const SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET wajib diisi di production");
  }
  return new TextEncoder().encode(secret ?? "arah-assist-dev-secret-ganti-di-production");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
};

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** Token berumur 2 menit agar Notch desktop bisa membuka Workspace di browser tanpa login ulang. */
export async function createHandoffToken(userId: string) {
  return new SignJWT({ purpose: "handoff" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secretKey());
}

export async function verifyHandoffToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.purpose === "handoff" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    // Token handoff hanya untuk ditukar menjadi sesi, bukan sesi itu sendiri
    if (payload.purpose) return null;
    userId = payload.sub;
  } catch {
    return null;
  }
  if (!userId) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      workspaceId: schema.workspaces.id,
      workspaceName: schema.workspaces.workspaceName,
    })
    .from(schema.users)
    .innerJoin(schema.workspaces, eq(schema.workspaces.userId, schema.users.id))
    .where(eq(schema.users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}
