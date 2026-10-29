"use client";

import type { NotchEdge } from "@/components/notch/NotchShell";

/** Jembatan yang disediakan desktop/preload.cjs saat halaman dibuka di dalam aplikasi Notch desktop. */
export type ArahDesktopBridge = {
  /** Ukuran jendela Notch: kapsul kecil (peek), bentuk normal (idle), atau panel terbuka (expanded) */
  setLevel: (level: "peek" | "idle" | "expanded") => void;
  /** Buka tautan di browser default (hanya tautan ke server Arah Assist yang diizinkan) */
  openExternal: (url: string) => void;
  /** Buka jendela login, Notch dimuat ulang otomatis setelah berhasil masuk */
  openLogin: () => void;
  /** Perintah dari aplikasi desktop: pintasan global atau menu tray */
  onCommand: (callback: (command: "plan" | "open-workspace") => void) => () => void;
  /** Pengaturan tersimpan aplikasi desktop. canAutoStart hanya true pada versi installer. */
  getSettings: () => Promise<{ dock: NotchEdge; openAtLogin: boolean; canAutoStart: boolean }>;
  /** Nyalakan/matikan Notch otomatis saat Windows menyala */
  setAutoStart: (on: boolean) => void;
  /** Pindahkan Notch ke tepi atas, kiri, atau kanan layar */
  setDock: (dock: NotchEdge) => void;
  /** Mulai/akhiri menyeret Notch; selama diseret jendela mengikuti kursor, lalu menempel ke tepi terdekat */
  dragStart: () => void;
  dragEnd: () => void;
  /** Posisi Notch berubah (selesai diseret atau dari pengaturan) */
  onDock: (callback: (dock: NotchEdge) => void) => () => void;
};

declare global {
  interface Window {
    arahDesktop?: ArahDesktopBridge;
  }
}

export function desktopBridge(): ArahDesktopBridge | null {
  return typeof window !== "undefined" ? (window.arahDesktop ?? null) : null;
}

/** Saat dialog pilih file terbuka, jendela Notch kehilangan fokus. Jangan dianggap "klik di luar". */
let pickingFile = false;
export const filePicker = {
  start() {
    pickingFile = true;
  },
  end() {
    pickingFile = false;
  },
  get active() {
    return pickingFile;
  },
};
