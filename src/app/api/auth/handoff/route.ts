import { NextResponse, type NextRequest } from "next/server";
import { createHandoffToken, createSession, verifyHandoffToken } from "@/lib/auth";
import { requireUser } from "@/lib/api";

// Dipanggil Notch desktop: menghasilkan tautan masuk berumur pendek untuk browser
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL("/api/auth/handoff", request.nextUrl.origin);
  url.searchParams.set("token", await createHandoffToken(user.id));
  return NextResponse.json({ url: url.toString() });
}

// Dibuka di browser: tukar token menjadi sesi, lalu tampilkan Workspace
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const userId = token ? await verifyHandoffToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(new URL("/masuk", request.nextUrl.origin));
  }
  await createSession(userId);
  return NextResponse.redirect(new URL("/workspace", request.nextUrl.origin));
}
