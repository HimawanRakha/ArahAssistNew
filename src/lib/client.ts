"use client";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Sesi habis: muat ulang penuh agar state klien ikut bersih. Notch desktop kembali ke keadaan "Masuk".
    window.location.href = window.location.pathname.startsWith("/notch") ? "/notch" : "/masuk";
  }
  if (!res.ok) {
    throw new Error(data?.error ?? "Terjadi kesalahan. Coba lagi.");
  }
  return data as T;
}

const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

/** 10.00 — format jam Indonesia */
export function formatTime(date: Date | string | number) {
  return timeFmt.format(date instanceof Date ? date : new Date(date));
}

export function formatDay(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(
    date,
  );
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function remainingLabel(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "kedaluwarsa";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `sisa ${hours} jam`;
  return `sisa ${Math.max(1, Math.round(ms / 60_000))} menit`;
}

let audioCtx: AudioContext | null = null;

/** Siapkan AudioContext saat ada interaksi pertama, karena browser memblokir suara otomatis. */
export function primeAudio() {
  if (audioCtx || typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctx) audioCtx = new Ctx();
}

/** Bunyi pengingat halus: dua nada lembut menaik */
export function playChime() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") void audioCtx.resume();
  const start = audioCtx.currentTime + 0.02;
  [659.25, 987.77].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = start + i * 0.18;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}
