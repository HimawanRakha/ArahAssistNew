import type { MetadataRoute } from "next";

// Website bisa dipasang ke layar utama HP (PWA) agar bisa menerima notifikasi pengingat
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arah Assist",
    short_name: "Arah Assist",
    description: "To-Do List harian dengan AI dan pengingat ACC / Snooze.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#fffbfc",
    theme_color: "#0c1d32",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
