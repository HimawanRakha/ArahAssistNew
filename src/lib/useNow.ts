"use client";

import { useSyncExternalStore } from "react";

// Satu detak jam bersama untuk seluruh UI (jam Notch, pemantau pengingat, sisa masa simpan file)
let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (!current) current = Date.now();
  return current;
}

/** Waktu sekarang (ms), diperbarui tiap detik. null saat render di server agar tidak terjadi hydration mismatch. */
export function useNow(): number | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return value || null;
}
