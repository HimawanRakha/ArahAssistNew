import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";

type Mode = "masuk" | "daftar";

/**
 * Halaman masuk/daftar berbentuk map: tab "Masuk" dan "Buat akun" adalah tab map,
 * kertas dan lembar kaca mengintip dari belakang seperti pada maskot.
 */
export function AuthLayout({
  mode,
  next,
  title,
  description,
  children,
}: {
  mode: Mode;
  next: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const query = next !== "/workspace" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[radial-gradient(90%_70%_at_50%_18%,#2db1e8_0%,#007aad_46%,#00446a_100%)] px-4 pb-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:24px_24px]"
      />
      <Link
        href="/"
        aria-label="Kembali ke beranda Arah Assist"
        className="relative z-10 flex h-[52px] items-center gap-2.5 rounded-b-[22px] bg-kertas px-6 text-malam shadow-[0_18px_40px_-20px_rgba(0,20,40,0.6)]"
      >
        <LogoMark size={28} />
        <span className="text-[16px] font-extrabold tracking-tight">Arah Assist.</span>
      </Link>

      <div className="relative z-10 mt-16 w-full max-w-[27rem] sm:mt-20">
        {/* Lembar kaca dan kertas di dalam map */}
        <span aria-hidden className="absolute -top-14 right-0 h-48 w-52 rotate-[8deg] rounded-[26px] bg-white/20 ring-1 ring-white/30 backdrop-blur-sm" />
        <span aria-hidden className="absolute -top-8 left-12 right-14 h-40 -rotate-[4deg] rounded-[20px] bg-kabut shadow-md" />
        <span aria-hidden className="absolute -top-5 left-8 right-10 h-40 rotate-[1.5deg] rounded-[20px] bg-white shadow-md" />

        <nav aria-label="Masuk atau buat akun" className="relative flex items-end">
          <FolderTabLink href={`/masuk${query}`} active={mode === "masuk"} side="first">
            Masuk
          </FolderTabLink>
          <FolderTabLink href={`/daftar${query}`} active={mode === "daftar"} side="last">
            Buat akun
          </FolderTabLink>
        </nav>

        <main
          className="relative rounded-[30px] rounded-tl-none bg-kertas px-6 pb-7 pt-6 shadow-[0_44px_90px_-34px_rgba(0,20,40,0.7)] sm:px-8"
        >
          <div className="flex items-center gap-3.5">
            <LogoMark size={52} animated />
            <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{title}</h1>
          </div>
          <p className="mb-7 mt-3 text-[15px] leading-relaxed text-redup">{description}</p>
          {children}
        </main>
      </div>
    </div>
  );
}

function FolderTabLink({
  href,
  active,
  side,
  children,
}: {
  href: string;
  active: boolean;
  side: "first" | "last";
  children: ReactNode;
}) {
  if (active) {
    // Tab aktif menempel rata ke tab di sebelahnya: lengkung cekung dan celah hanya di sisi yang kosong
    const joined = side === "first" ? "mr-0 after:hidden" : "ml-0 before:hidden";
    return (
      <span
        aria-current="page"
        className={`folder-tab px-6 pb-2 pt-3.5 text-[15px] font-bold text-malam [--tab-bg:var(--color-kertas)] ${joined}`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-t-[18px] bg-kabut px-5 pb-2 pt-2.5 text-[14px] font-semibold text-redup shadow-[inset_0_-6px_10px_-8px_rgba(12,29,50,0.35)] transition-colors hover:text-malam"
    >
      {children}
    </Link>
  );
}
