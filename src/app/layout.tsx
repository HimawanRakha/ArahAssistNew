import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});


export const metadata: Metadata = {
  title: "Arah Assist",
  description:
    "Workspace harian dengan Dynamic Notch: taruh file sementara, ketik rencana dengan bahasa santai, dan biarkan AI menyusun To-Do List permanenmu.",
};

export const viewport: Viewport = {
  themeColor: "#0C1D32",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
