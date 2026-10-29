"use client";

import { api } from "./client";

/**
 * Status notifikasi HP di perangkat ini:
 * on/off = sudah/belum berlangganan, denied = izin diblokir, ios-install = iPhone perlu dipasang ke layar utama dulu,
 * unsupported = browser tidak mendukung, unconfigured = kunci VAPID belum diisi di server.
 */
export type PushState = "on" | "off" | "denied" | "ios-install" | "unsupported" | "unconfigured";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function base64UrlToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!PUBLIC_KEY) return "unconfigured";
  if (!supported()) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

/** Minta izin, daftarkan service worker, dan simpan langganan ke server */
export async function enablePush() {
  if (!PUBLIC_KEY || !supported()) throw new Error("Browser ini belum mendukung notifikasi.");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "Izin notifikasi ditolak." : "Izin notifikasi belum diberikan.");
  }
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(PUBLIC_KEY) }));
  await api("/api/push/subscribe", { method: "POST", json: subscription.toJSON() });
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api("/api/push/subscribe", { method: "DELETE", json: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}

export function sendTestPush() {
  return api<{ devices: number; sent: number }>("/api/push/test", { method: "POST" });
}
