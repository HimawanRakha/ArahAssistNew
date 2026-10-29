import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indikator dev Next akan ikut tampil di jendela Notch desktop yang transparan
  devIndicators: false,
  // PGlite (database lokal untuk development) memuat file WASM sendiri
  serverExternalPackages: ["@electric-sql/pglite"],
  // Tailwind diproses lewat postcss.config.mjs (setup resmi Next). Loader @tailwindcss/turbopack bawaan template
  // tidak mendeteksi perubahan kelas/CSS di proyek ini sehingga gaya baru baru muncul setelah cache dihapus.
};

export default nextConfig;
