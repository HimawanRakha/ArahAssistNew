import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { pushConfigured, sendPushToUser } from "@/lib/push";

// Kirim notifikasi percobaan ke semua perangkat pengguna yang sudah mengaktifkan notifikasi
export async function POST() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!pushConfigured()) return jsonError("Notifikasi HP belum dikonfigurasi di server (kunci VAPID kosong).", 503);

  const result = await sendPushToUser(user.id, {
    title: "Notifikasi Arah Assist aktif",
    body: "Pengingat tugas akan muncul di perangkat ini saat jadwalnya tiba.",
    tag: "arah-tes",
  });
  if (!result.devices) return jsonError("Belum ada perangkat yang mengaktifkan notifikasi.", 400);
  return NextResponse.json(result);
}
