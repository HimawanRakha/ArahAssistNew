"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FolderOpen,
  ListChecks,
  Pause,
  PenLine,
  Play,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { NotchShell, type NotchMode } from "@/components/notch/NotchShell";
import { IdleView, PlanView, ReminderView, ResultView, ShelfView, WorkingView } from "@/components/notch/Notch";
import { LogoMark } from "@/components/LogoMark";
import { useNow } from "@/lib/useNow";
import { NOTCH_DOWNLOAD_SIZE, NOTCH_DOWNLOAD_URL } from "@/lib/download";
import type { ShelfFileDTO, TodoDTO } from "@/lib/types";

const STATES: { id: Exclude<NotchMode, "peek">; label: string; icon: LucideIcon; caption: string }[] = [
  {
    id: "idle",
    label: "Ringkas",
    icon: Clock3,
    caption: "Kapsul di atas layar: jam, tugas berikutnya, jumlah tugas aktif, dan file sementara.",
  },
  {
    id: "shelf",
    label: "Rak file",
    icon: FolderOpen,
    caption: "Taruh PDF atau gambar referensi di map kaca. File hanya transit dan terhapus otomatis setelah 24 jam.",
  },
  {
    id: "plan",
    label: "Rencana",
    icon: PenLine,
    caption: "Ketik rencana seperti mengirim pesan, dengan daftar tugas hari ini selalu terlihat di sampingnya.",
  },
  {
    id: "working",
    label: "AI menyusun",
    icon: Sparkles,
    caption: "Notch mengecil menjadi pil status selama AI memecah kalimatmu menjadi tugas berjam.",
  },
  {
    id: "result",
    label: "Hasil",
    icon: ListChecks,
    caption: "Tugas baru langsung masuk ke Workspace, lengkap dengan file yang cocok.",
  },
  {
    id: "reminder",
    label: "Pengingat",
    icon: BellRing,
    caption: "Saat jamnya tiba, Notch melebar. ACC untuk mulai, Snooze untuk menunda 5, 10, atau 15 menit.",
  },
];

const PLAN_EXAMPLE =
  "Hari ini jam 10.00 revisi laporan bab 3, jam 14.00 rapikan desain UI, jam 19.00 rapat evaluasi tim.";

/** Data contoh untuk demo: tiga tugas hari ini dan dua file di rak, dengan jam tetap 09.35 */
function buildDemo(realNow: number) {
  const base = new Date(realNow);
  const at = (h: number, m: number) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const createdAt = new Date(realNow - 2 * 3_600_000).toISOString();
  const expiresAt = new Date(realNow + 22 * 3_600_000).toISOString();
  const file = (id: string, fileName: string, mimeType: string, fileSize: number): ShelfFileDTO => ({
    id,
    fileName,
    mimeType,
    fileSize,
    filePath: "#",
    todoItemId: null,
    createdAt,
    expiresAt,
  });
  const files = [
    file("f1", "Laporan_Bab3.pdf", "application/pdf", 482_000),
    file("f2", "Desain_UI.png", "image/png", 1_240_000),
  ];
  const task = (id: string, title: string, h: number, attached: ShelfFileDTO[]): TodoDTO => ({
    id,
    title,
    scheduledTime: at(h, 0),
    status: "pending",
    createdAt,
    files: attached.map(({ id: fid, fileName, mimeType, filePath }) => ({ id: fid, fileName, mimeType, filePath })),
    reminder: { isEnabled: true, remindAt: at(h, 0), snoozeMinutes: null, state: "waiting" },
  });
  const todos = [
    task("t1", "Revisi laporan bab 3", 10, [files[0]]),
    task("t2", "Rapikan desain UI", 14, [files[1]]),
    task("t3", "Rapat evaluasi tim", 19, []),
  ];
  return { now: new Date(at(9, 35)).getTime(), files, todos };
}

const noop = () => {};

export function LandingHero({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();
  // Data contoh dibuat setelah halaman terpasang di browser, agar jam contoh mengikuti zona waktu pengunjung
  const nowMs = useNow();
  const minute = nowMs ? Math.floor(nowMs / 60_000) : null;
  const demo = useMemo(() => (minute ? buildDemo(minute * 60_000) : null), [minute]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const autoplay = playing && !reduce;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % STATES.length), 3800);
    return () => clearInterval(id);
  }, [autoplay]);

  const go = (delta: number) => {
    setPlaying(false);
    setIndex((i) => (i + delta + STATES.length) % STATES.length);
  };
  const state = STATES[index];

  return (
    <section aria-label="Arah Assist" className="rounded-[34px] bg-kertas p-2 sm:rounded-[48px] sm:p-3">
      <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(85%_65%_at_50%_32%,#27aee6_0%,#007aad_48%,#00527a_100%)] text-kertas sm:rounded-[38px]">
        {/* Potongan bingkai: brand di atas, panah turun di bawah, panah demo di kiri dan kanan */}
        <div className="cut cut-top flex h-12 items-center gap-2 px-5 sm:h-[58px] sm:px-8">
          <LogoMark />
          <span className="text-[15px] font-extrabold tracking-tight text-malam sm:text-[18px]">Arah Assist.</span>
        </div>
        <div className="cut cut-bottom flex h-11 w-16 items-end justify-center pb-2 sm:h-12 sm:w-20">
          <a href="#alur" aria-label="Lihat cara kerja" className="flex h-8 w-8 items-center justify-center rounded-full text-malam hover:bg-panel">
            <ArrowDown size={18} />
          </a>
        </div>
        <div className="cut cut-left hidden h-20 w-9 items-center justify-center sm:flex">
          <button type="button" onClick={() => go(-1)} aria-label="Keadaan Notch sebelumnya" className="flex h-8 w-7 items-center justify-center text-malam">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="cut cut-right hidden h-20 w-9 items-center justify-center sm:flex">
          <button type="button" onClick={() => go(1)} aria-label="Keadaan Notch berikutnya" className="flex h-8 w-7 items-center justify-center text-malam">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="relative flex min-h-[min(calc(100svh-1.5rem),940px)] flex-col px-4 pb-16 pt-4 sm:px-12 sm:pt-[14px]">
          <nav aria-label="Utama" className="flex items-center gap-1 text-[13px] font-semibold">
            <a href="#alur" className="hidden rounded-full bg-kertas px-4 py-2 text-arus-deep md:inline-block">
              Cara kerja
            </a>
            <a href="#peran" className="hidden rounded-full px-3.5 py-2 text-kertas/85 hover:text-kertas md:inline-block">
              Notch dan Workspace
            </a>
            <a href="#pasang" className="hidden rounded-full px-3.5 py-2 text-kertas/85 hover:text-kertas md:inline-block">
              Pasang Notch
            </a>
            <div className="ml-auto hidden items-center gap-1 sm:flex">
              {signedIn ? (
                <CtaPill href="/workspace">Buka Workspace</CtaPill>
              ) : (
                <>
                  <Link href="/masuk" className="hidden rounded-full px-3.5 py-2 text-kertas/85 hover:text-kertas sm:inline-block">
                    Masuk
                  </Link>
                  <CtaPill href="/daftar">Buat akun</CtaPill>
                </>
              )}
            </div>
          </nav>

          {/* Tulisan Arah Assist di atas Notch, tidak tertutup oleh demo */}
          <div className="relative mx-auto mt-14 text-center sm:mt-12">
            <p className="relative text-[clamp(3.4rem,10.5vw,9.6rem)] font-bold leading-[0.9] tracking-[-0.035em]">
              <span className="text-kertas">Arah</span>
              <span className="ml-[0.18em] text-malam">Assist.</span>
              <ArrowScribble />
            </p>
          </div>

          {/* Kolom tengah dibuat tetap agar teks di kiri dan kanan tidak melompat saat keadaan Notch berganti */}
          <div className="relative z-10 mt-10 grid flex-1 grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-2 hero:grid-cols-[minmax(0,1fr)_680px_minmax(0,1fr)] hero:items-start hero:gap-x-12">
            <RibbonPair className="absolute -inset-x-12 top-[22rem] -z-10 hidden h-24 hero:block" />
            <div className="order-2 hero:order-1 hero:pt-6">
              <h1 className="max-w-[17ch] text-[clamp(1.6rem,2.1vw,2.2rem)] font-bold leading-[1.12] tracking-[-0.025em]">
                Ketik rencanamu sekali. Notch yang menjaga arahnya.
              </h1>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-kertas/80">
                Dynamic Notch yang tinggal di tepi layar komputermu. Taruh file, tulis rencana dengan bahasa sehari-hari,
                dan AI menyusunnya menjadi To-Do List yang mengingatkanmu tepat waktu.
              </p>
              <Link
                href={signedIn ? "/workspace" : "/daftar"}
                className="mt-7 inline-flex h-14 items-center gap-3 rounded-full bg-kertas pl-7 pr-2 text-[15px] font-bold text-arus-deep shadow-[0_18px_40px_-18px_rgba(0,30,50,0.6)] transition-transform hover:-translate-y-0.5"
              >
                {signedIn ? "Buka Workspace" : "Mulai susun rencana"}
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-arus text-white">
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            </div>

            {/* Notch demo: komponen Notch asli dengan data contoh */}
            <div className="order-1 flex min-h-[12rem] justify-center md:col-span-2 md:min-h-[19rem] hero:order-2 hero:col-span-1 hero:min-h-[24rem]">
              <div inert className="drop-shadow-[0_40px_50px_rgba(0,25,45,0.45)] [--notch-gutter:64px] sm:[--notch-gutter:144px]">
                <NotchShell mode={state.id} label="Contoh Dynamic Notch">
                  {demo ? <DemoView mode={state.id} demo={demo} /> : <div className="h-11 w-[320px]" />}
                </NotchShell>
              </div>
            </div>

            <div className="order-3 flex flex-col gap-3 md:items-end md:text-right hero:pt-6">
              <p className="text-[13px] font-semibold text-kertas/85">Keadaan Notch</p>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {STATES.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={i === index}
                      aria-label={s.label}
                      title={s.label}
                      onClick={() => {
                        setPlaying(false);
                        setIndex(i);
                      }}
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                        i === index
                          ? "bg-kertas text-arus-deep shadow-[0_10px_24px_-10px_rgba(0,20,40,0.6)]"
                          : "bg-white/15 text-kertas ring-1 ring-white/25 hover:bg-white/25"
                      }`}
                    >
                      <Icon size={18} aria-hidden />
                    </button>
                  );
                })}
                {!reduce && (
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Jeda demo Notch" : "Putar demo Notch"}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-kertas/80 hover:text-kertas"
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                )}
              </div>
              <p aria-live="polite" className="max-w-[34ch] text-[14px] leading-relaxed text-kertas/80">
                <span className="font-semibold text-kertas">{state.label}.</span> {state.caption}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-10 flex flex-wrap items-end justify-between gap-4">
            <ul aria-label="Bagian Arah Assist" className="flex flex-wrap gap-2 text-[12px] font-semibold">
              {["Notch desktop", "Workspace web", "AI Gemini"].map((label) => (
                <li key={label} className="rounded-full bg-white/15 px-3.5 py-2 ring-1 ring-white/20">
                  {label}
                </li>
              ))}
            </ul>
            <div className="w-full max-w-[22rem] rounded-[26px] bg-white/[0.14] p-4 ring-1 ring-white/25 backdrop-blur-xl sm:mb-0">
              <div className="flex items-start gap-3">
                <LogoMark size={44} animated />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-tight">Notch untuk Windows</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-kertas/80">
                    Pasang sekali, Notch menyala sendiri setiap laptop dibuka.
                  </p>
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-2">
                <a
                  href={NOTCH_DOWNLOAD_URL}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-kertas text-[14px] font-bold text-arus-deep transition-transform hover:-translate-y-0.5"
                >
                  <Download size={16} aria-hidden />
                  <span className="sm:hidden">Unduh</span>
                  <span className="hidden sm:inline">Unduh untuk Windows</span>
                </a>
                <a
                  href="#pasang"
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold text-kertas/90 ring-1 ring-inset ring-white/30 hover:bg-white/10"
                >
                  Cara pasang
                </a>
              </div>
              <p className="mt-2 text-[11.5px] text-kertas/65">Windows 10 dan 11, {NOTCH_DOWNLOAD_SIZE}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-2 rounded-full bg-kertas pl-4 pr-1 text-arus-deep">
      {children}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-arus text-white">
        <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}

/** Coretan panah tangan di atas judul, seperti tanda tangan: "arah" berarti arah/penunjuk */
function ArrowScribble() {
  return (
    <svg
      viewBox="0 0 220 90"
      aria-hidden
      className="pointer-events-none absolute -top-[30%] left-[40%] w-[30%] min-w-[8rem] text-malam"
      fill="none"
    >
      <path
        className="draw-stroke"
        style={{ ["--len" as string]: "520" }}
        d="M8 70C30 40 52 18 80 22C104 26 92 58 72 56C52 54 66 20 104 14C140 8 160 40 196 22M196 22L178 14M196 22L188 40"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Pita berjalan di bawah hero untuk layar sempit; di layar lebar pita berada di dalam hero */
export function LandingRibbons() {
  return <RibbonPair className="relative z-10 -mt-9 h-24 hero:hidden" />;
}

/** Dua pita berjalan "Arah Assist" yang menyilang, tipis dan tenang */
function RibbonPair({ className }: { className: string }) {
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <Ribbon className="top-7 -rotate-[2deg] bg-malam/90 text-kertas" duration="56s" />
      <Ribbon
        className="top-9 rotate-[1.4deg] bg-kertas/95 text-malam shadow-[0_14px_30px_-18px_rgba(12,29,50,0.45)]"
        duration="46s"
        reverse
      />
    </div>
  );
}

function Ribbon({ className, duration, reverse = false }: { className: string; duration: string; reverse?: boolean }) {
  const items = Array.from({ length: 14 });
  const run = (
    <span className="flex shrink-0 items-center gap-5 pr-5">
      {items.map((_, i) => (
        <span key={i} className="flex items-center gap-5">
          <span className="whitespace-nowrap font-semibold tracking-[-0.01em]">Arah Assist</span>
          <LogoMark size={18} />
        </span>
      ))}
    </span>
  );
  return (
    <div className={`absolute -left-[5%] w-[110%] py-2 text-[clamp(0.9rem,1.2vw,1.1rem)] leading-none ${className}`}>
      <div className={`marquee-track flex w-max ${reverse ? "marquee-reverse" : ""}`} style={{ ["--marquee-duration" as string]: duration }}>
        {run}
        {run}
      </div>
    </div>
  );
}

function DemoView({ mode, demo }: { mode: Exclude<NotchMode, "peek">; demo: ReturnType<typeof buildDemo> }) {
  switch (mode) {
    case "idle":
      return <IdleView todos={demo.todos} fileCount={demo.files.length} onOpen={noop} now={demo.now} />;
    case "shelf":
      return (
        <div className="p-4">
          <ShelfView files={demo.files} todos={demo.todos} uploading={false} onUpload={async () => {}} onDelete={noop} />
        </div>
      );
    case "plan":
      return (
        <div className="p-4">
          <PlanView
            text={PLAN_EXAMPLE}
            onTextChange={noop}
            shelfFiles={demo.files}
            todos={demo.todos}
            error={null}
            onSubmit={noop}
            onOpenShelf={noop}
            onOpenAdd={noop}
            now={demo.now}
          />
        </div>
      );
    case "working":
      return <WorkingView slow={false} files={demo.files} />;
    case "result":
      return (
        <ResultView
          run={{ status: "done", summary: "2 file dari rak ditempel otomatis.", createdIds: demo.todos.map((t) => t.id) }}
          todos={demo.todos}
          onOpenWorkspace={noop}
          onClose={noop}
        />
      );
    case "reminder":
      return <ReminderView todo={demo.todos[0]} more={0} onAcc={noop} onSnooze={noop} />;
  }
}
