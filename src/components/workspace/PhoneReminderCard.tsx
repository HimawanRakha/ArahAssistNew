"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, Smartphone } from "lucide-react";
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from "@/lib/pushClient";

const DESCRIPTION: Record<PushState, string> = {
  on: "Aktif di perangkat ini. Pengingat muncul sebagai notifikasi lengkap dengan tombol ACC dan Snooze, walau Arah Assist tertutup.",
  off: "Dapatkan pengingat tugas sebagai notifikasi di HP atau browser ini, lengkap dengan tombol ACC dan Snooze.",
  denied: "Notifikasi diblokir untuk situs ini. Izinkan lewat pengaturan browser, lalu muat ulang halaman.",
  "ios-install":
    "Di iPhone, ketuk tombol Bagikan lalu Tambahkan ke Layar Utama. Buka Arah Assist dari layar utama, lalu aktifkan notifikasi di sini.",
  unsupported: "Browser ini belum mendukung notifikasi. Coba Chrome di Android atau Safari di iPhone (iOS 16.4 ke atas).",
  unconfigured: "Notifikasi HP belum dikonfigurasi di server.",
};

/** Kartu di Workspace untuk mengaktifkan notifikasi pengingat (web push) di perangkat yang sedang dipakai */
export function PhoneReminderCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPushState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  async function run(action: () => Promise<string | void>) {
    setPending(true);
    setMessage(null);
    try {
      const result = await action();
      if (result) setMessage(result);
      setState(await getPushState());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setState(await getPushState().catch(() => "unsupported" as const));
    } finally {
      setPending(false);
    }
  }

  if (!state) return null;

  return (
    <section aria-labelledby="hp-judul" className="rounded-[22px] bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-arus-soft text-arus-deep">
          <Smartphone size={17} aria-hidden />
        </span>
        <h2 id="hp-judul" className="text-[16px] font-semibold tracking-tight">
          Pengingat di HP
        </h2>
        {state === "on" && (
          <span className="ml-auto rounded-full bg-acc/15 px-2.5 py-1 text-[11.5px] font-semibold text-acc-ink">Aktif</span>
        )}
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-redup">{DESCRIPTION[state]}</p>

      {state === "off" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(async () => {
            await enablePush();
            return "Notifikasi aktif. Coba kirim notifikasi tes.";
          })}
          className="mt-3.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-arus text-[13.5px] font-semibold text-white hover:bg-arus-deep disabled:opacity-60"
        >
          {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <BellRing size={15} aria-hidden />}
          Aktifkan notifikasi
        </button>
      )}
      {state === "on" && (
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(async () => {
              const r = await sendTestPush();
              return `Notifikasi tes dikirim ke ${r.sent} perangkat.`;
            })}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-malam text-[13px] font-semibold text-kertas hover:bg-malam-3 disabled:opacity-60"
          >
            {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
            Kirim tes
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(async () => {
              await disablePush();
              return "Notifikasi dimatikan di perangkat ini.";
            })}
            className="inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold text-redup ring-1 ring-inset ring-kabut hover:text-malam disabled:opacity-60"
          >
            Matikan
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-2.5 text-[12.5px] font-medium text-malam">
          {message}
        </p>
      )}
    </section>
  );
}
