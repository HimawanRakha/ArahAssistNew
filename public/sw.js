// Service worker Arah Assist: menampilkan notifikasi pengingat dari server (web push).
// Tombol ACC / Snooze langsung memanggil API dengan sesi pengguna (cookie), tanpa membuka aplikasi.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      renotify: true,
      requireInteraction: Boolean(data.todoId),
      vibrate: [120, 60, 120],
      data: { todoId: data.todoId ?? null, url: data.url ?? "/workspace" },
      actions: data.todoId
        ? [
            { action: "acc", title: "ACC" },
            { action: "snooze", title: "Snooze 10 mnt" },
          ]
        : [],
    }),
  );
});

async function reminderAction(todoId, body) {
  const res = await fetch(`/api/todos/${todoId}/reminder`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function openWorkspace(url) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = all.find((c) => new URL(c.url).pathname.startsWith("/workspace"));
  if (existing) return existing.focus();
  return self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const { todoId, url } = event.notification.data ?? {};
  event.notification.close();

  event.waitUntil(
    (async () => {
      if (todoId && event.action === "acc") {
        if (await reminderAction(todoId, { action: "acc" })) return;
      } else if (todoId && event.action === "snooze") {
        if (await reminderAction(todoId, { action: "snooze", minutes: 10 })) return;
      }
      // Ketuk notifikasi (atau sesi habis): buka Workspace
      await openWorkspace(url || "/workspace");
    })(),
  );
});
