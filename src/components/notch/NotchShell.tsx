"use client";

import { AnimatePresence, motion, MotionConfig, useIsPresent } from "motion/react";
import type { ReactNode, Ref } from "react";

/**
 * peek: kapsul kecil saat Notch desktop tidak disentuh; idle: bentuk normal (jam, tugas berikutnya, jumlah);
 * add: tambah tugas manual; settings: pengaturan; working / result: AI sedang menyusun rencana dan hasilnya.
 */
export type NotchMode =
  | "peek"
  | "idle"
  | "dashboard"
  | "shelf"
  | "plan"
  | "add"
  | "settings"
  | "reminder"
  | "working"
  | "result";

/** Tepi layar tempat Notch desktop menempel */
export type NotchEdge = "top" | "left" | "right";

// --notch-gutter: ruang yang disisakan dari lebar layar; demo di landing memakai nilai lebih besar
const WIDTH: Record<NotchMode, string> = {
  peek: "w-[118px]",
  idle: "w-[min(380px,calc(100vw-var(--notch-gutter,24px)))]",
  shelf: "w-[min(660px,calc(100vw-var(--notch-gutter,24px)))]",
  plan: "w-[min(680px,calc(100vw-var(--notch-gutter,24px)))]",
  reminder: "w-[min(460px,calc(100vw-var(--notch-gutter,24px)))]",
  working: "w-[min(400px,calc(100vw-var(--notch-gutter,24px)))]",
  result: "w-[min(460px,calc(100vw-var(--notch-gutter,24px)))]",
  dashboard: "w-[min(560px,calc(100vw-var(--notch-gutter,24px)))]",
  add: "w-[min(640px,calc(100vw-var(--notch-gutter,24px)))]",
  settings: "w-[min(640px,calc(100vw-var(--notch-gutter,24px)))]",
};

// Saat menempel di kiri/kanan, kapsul kecil dan bentuk normal berdiri vertikal
const SIDE_WIDTH: Partial<Record<NotchMode, string>> = {
  peek: "w-[32px]",
  idle: "w-[92px]",
};

const spring = { type: "spring", bounce: 0.22, duration: 0.55 } as const;

/**
 * Badan kapsul Notch. Ukurannya berubah mengikuti isi (mode) dengan satu animasi pegas,
 * sementara isi lama memudar dan isi baru masuk.
 */
export function NotchShell({
  mode,
  children,
  label,
  edge,
}: {
  mode: NotchMode;
  children: ReactNode;
  label: string;
  /** Notch desktop menempel di tepi layar: sudut di sisi itu rata. Tanpa edge, semua sudut membulat (demo). */
  edge?: NotchEdge;
}) {
  const side = edge === "left" || edge === "right";
  const radius = mode === "peek" ? (side ? 14 : 12) : mode === "idle" || mode === "working" ? 26 : 32;
  const flat = (corner: "tl" | "tr" | "bl" | "br") =>
    (edge === "top" && (corner === "tl" || corner === "tr")) ||
    (edge === "left" && (corner === "tl" || corner === "bl")) ||
    (edge === "right" && (corner === "tr" || corner === "br"))
      ? 0
      : radius;
  const width = (side && SIDE_WIDTH[mode]) || WIDTH[mode];
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        layout
        aria-label={label}
        transition={spring}
        style={{
          borderTopLeftRadius: flat("tl"),
          borderTopRightRadius: flat("tr"),
          borderBottomLeftRadius: flat("bl"),
          borderBottomRightRadius: flat("br"),
        }}
        className={`notch-glass relative overflow-hidden text-kertas shadow-[0_24px_60px_-22px_rgba(3,8,16,0.85)] ${width}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <NotchContent key={mode}>{children}</NotchContent>
        </AnimatePresence>
      </motion.section>
    </MotionConfig>
  );
}

// ref diteruskan karena AnimatePresence mode="popLayout" perlu mengukur elemen yang keluar
function NotchContent({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  // Isi yang sedang keluar dibuat inert agar tombolnya (mis. ACC milik pengingat lama) tidak bisa terklik
  const present = useIsPresent();
  return (
    <motion.div
      ref={ref}
      inert={!present}
      initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.12 } }}
      transition={{ duration: 0.28, delay: 0.06 }}
    >
      {children}
    </motion.div>
  );
}
