import type { Metadata } from "next";
import { LogoMark } from "@/components/LogoMark";

export const metadata: Metadata = { title: "Notch terhubung | Arah Assist" };

// Tujuan setelah login dari Notch desktop. Aplikasi desktop menutup jendela ini secara otomatis.
export default function NotchTerhubungPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark />
      <h1 className="text-2xl font-extrabold tracking-tight">Notch sudah terhubung</h1>
      <p className="max-w-sm text-[15px] text-redup">
        Kamu bisa menutup jendela ini. Notch di atas layar sekarang memakai akunmu.
      </p>
    </main>
  );
}
