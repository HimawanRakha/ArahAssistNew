"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import {
  AlarmClock,
  ArrowLeft,
  BellRing,
  Check,
  Clock3,
  LayoutPanelTop,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  Paperclip,
  Plus,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { NotchShell, type NotchEdge, type NotchMode } from "./NotchShell";
import { Mascot } from "@/components/Mascot";
import { dayKey, formatSize, formatTime, remainingLabel } from "@/lib/client";
import { useNow } from "@/lib/useNow";
import { filePicker } from "@/lib/desktop";
import type { NewTodoInput } from "@/lib/useWorkspaceData";
import type { ShelfFileDTO, TodoDTO, TodoStatus } from "@/lib/types";

export const FILE_DRAG_TYPE = "application/x-arah-file";

export type PlanRun =
  | { status: "working"; slow: boolean }
  | { status: "done"; summary: string; createdIds: string[] };

type NotchProps = {
  /** null jika Notch desktop belum terhubung ke akun */
  user: { name: string } | null;
  mode: NotchMode;
  onModeChange: (mode: NotchMode) => void;
  /** Tepi layar tempat Notch menempel */
  dock: NotchEdge;
  onDockChange: (dock: NotchEdge) => void;
  /** Notch sedang diseret untuk dipindah */
  dragging: boolean;
  /** Pointer handler untuk menyeret Notch (dipasang pada kapsul) */
  dragProps?: HTMLAttributes<HTMLDivElement>;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  /** Menyala otomatis saat Windows menyala; available false di luar versi installer */
  autoStart: { on: boolean; available: boolean };
  onAutoStartChange: (on: boolean) => void;
  files: ShelfFileDTO[];
  todos: TodoDTO[];
  uploading: boolean;
  reminder: { todo: TodoDTO; more: number } | null;
  plan: PlanRun | null;
  planError: string | null;
  onUpload: (files: File[]) => Promise<void>;
  onDeleteFile: (id: string) => void;
  /** true jika berhasil, agar teks rencana dikosongkan */
  onGenerate: (text: string) => Promise<boolean>;
  /** Tambah tugas manual; melempar error agar formulir bisa menampilkannya */
  onAddTodo: (input: NewTodoInput) => Promise<void>;
  onAcc: (todoId: string) => void;
  onSnooze: (todoId: string, minutes: 5 | 10 | 15) => void;
  onOpenWorkspace: () => void;
  onLogin: () => void;
  onLogout: () => void;
  /** Kapsul kecil diklik/difokus: tampilkan bentuk normal */
  onWake: () => void;
};

const PANEL_MODES: NotchMode[] = ["dashboard", "shelf", "plan", "add", "settings"];

const DOCK_WRAPPER: Record<NotchEdge, string> = {
  top: "inset-x-0 top-0 justify-center",
  left: "inset-y-0 left-0 items-center",
  right: "inset-y-0 right-0 items-center justify-end",
};

export function Notch(props: NotchProps) {
  const { mode, onModeChange, dock } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [planText, setPlanText] = useState("");
  const side = dock !== "top";

  // Klik di luar Notch menutup panel (kecuali saat pengingat tampil)
  useEffect(() => {
    if (!PANEL_MODES.includes(mode) && mode !== "result") return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onModeChange("idle");
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mode, onModeChange]);

  // Menarik file dari komputer ke jendela langsung membuka rak file
  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (mode === "reminder" || mode === "shelf" || mode === "working") return;
      if (e.dataTransfer?.types.includes("Files")) onModeChange("shelf");
    }
    window.addEventListener("dragenter", onDragEnter);
    return () => window.removeEventListener("dragenter", onDragEnter);
  }, [mode, onModeChange]);

  const unattached = props.files.filter((f) => !f.todoItemId);

  return (
    <div className={`pointer-events-none fixed z-50 flex ${DOCK_WRAPPER[dock]}`}>
      <div ref={ref} className={`pointer-events-auto ${props.dragging ? "cursor-grabbing" : ""}`} {...props.dragProps}>
        <NotchShell mode={mode} label="Dynamic Notch" edge={dock}>
          {mode === "peek" && <PeekView vertical={side} signedIn={!!props.user} onWake={props.onWake} />}
          {mode === "idle" && !props.user && <SignedOutView vertical={side} onLogin={props.onLogin} />}
          {mode === "idle" &&
            props.user &&
            (side ? (
              <IdleViewVertical todos={props.todos} fileCount={props.files.length} onOpen={() => onModeChange("plan")} />
            ) : (
              <IdleView
                todos={props.todos}
                fileCount={props.files.length}
                dragging={props.dragging}
                onOpen={() => onModeChange("plan")}
              />
            ))}
          {PANEL_MODES.includes(mode) && (
            <div className="p-3.5 sm:p-4">
              <PanelHeader
                mode={mode}
                fileCount={props.files.length}
                onModeChange={onModeChange}
                onOpenWorkspace={props.onOpenWorkspace}
              />
              {mode === "shelf" && (
                <ShelfView
                  files={props.files}
                  todos={props.todos}
                  uploading={props.uploading}
                  onUpload={props.onUpload}
                  onDelete={props.onDeleteFile}
                />
              )}
              {mode === "plan" && (
                <PlanView
                  text={planText}
                  onTextChange={setPlanText}
                  shelfFiles={unattached}
                  todos={props.todos}
                  error={props.planError}
                  onSubmit={async (text) => {
                    if (await props.onGenerate(text)) setPlanText("");
                  }}
                  onOpenShelf={() => onModeChange("shelf")}
                  onOpenAdd={() => onModeChange("add")}
                />
              )}
              {mode === "dashboard" && <DashboardView />}
              {mode === "add" && (
                <AddTaskView shelfFiles={unattached} onAdd={props.onAddTodo} onBack={() => onModeChange("plan")} />
              )}
              {mode === "settings" && (
                <SettingsView
                  userName={props.user?.name ?? ""}
                  dock={dock}
                  onDockChange={props.onDockChange}
                  soundOn={props.soundOn}
                  onSoundChange={props.onSoundChange}
                  autoStart={props.autoStart}
                  onAutoStartChange={props.onAutoStartChange}
                  onLogout={props.onLogout}
                />
              )}
            </div>
          )}
          {mode === "working" && <WorkingView slow={props.plan?.status === "working" && props.plan.slow} files={unattached} />}
          {mode === "result" && props.plan?.status === "done" && (
            <ResultView
              run={props.plan}
              todos={props.todos}
              onOpenWorkspace={props.onOpenWorkspace}
              onClose={() => onModeChange("idle")}
            />
          )}
          {mode === "reminder" && props.reminder && (
            <ReminderView
              todo={props.reminder.todo}
              more={props.reminder.more}
              onAcc={props.onAcc}
              onSnooze={props.onSnooze}
            />
          )}
        </NotchShell>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kapsul kecil dan bentuk normal
// ---------------------------------------------------------------------------

/** Kapsul kecil: maskot yang berkedip dan jam, mendatar di atas atau berdiri di sisi kiri/kanan */
export function PeekView({
  signedIn,
  onWake,
  vertical = false,
}: {
  signedIn: boolean;
  onWake: () => void;
  vertical?: boolean;
}) {
  const now = useNow();
  const date = now ? new Date(now) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <button
      type="button"
      onClick={onWake}
      onFocus={onWake}
      aria-label={signedIn ? "Buka Notch Arah Assist" : "Buka Notch Arah Assist untuk masuk"}
      className={`flex w-full items-center gap-1.5 ${vertical ? "h-[150px] flex-col justify-center" : "h-[30px] pl-1 pr-3"}`}
    >
      <MascotChip size={vertical ? 18 : 16} className={vertical ? "h-7 w-7" : "h-[22px] w-8"} />
      {vertical ? (
        <span aria-hidden className="tabular mt-1 flex flex-col items-center text-[12.5px] font-bold leading-[1.1] text-kertas/90">
          <span>{date ? pad(date.getHours()) : "--"}</span>
          <span>{date ? pad(date.getMinutes()) : "--"}</span>
        </span>
      ) : (
        <span aria-hidden className="tabular mx-auto text-[13px] font-bold tracking-tight text-kertas/90">
          {date ? formatTime(date) : "--.--"}
        </span>
      )}
    </button>
  );
}

/** Maskot (mapnya saja) di dalam kapsul kecil berkilau, seperti ikon di dalam tombol pil */
function MascotChip({ size, className, animated = true }: { size: number; className: string; animated?: boolean }) {
  return (
    <span className={`satin-chip flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <Mascot bare size={size} animated={animated} />
    </span>
  );
}

function nextTask(todos: TodoDTO[], now: number) {
  return todos
    .filter((t) => t.status !== "completed" && t.scheduledTime && new Date(t.scheduledTime).getTime() > now)
    .sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!))[0];
}

function untilLabel(iso: string, now: number) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (minutes < 1) return "sebentar lagi";
  if (minutes < 60) return `${minutes} mnt lagi`;
  return formatTime(iso);
}

export function IdleView({
  todos,
  fileCount,
  onOpen,
  dragging = false,
  now: fixedNow,
}: {
  todos: TodoDTO[];
  fileCount: number;
  onOpen: () => void;
  /** Notch sedang diseret: tampilkan petunjuk tempat melepas */
  dragging?: boolean;
  /** Waktu tetap untuk demo di landing; default jam sekarang */
  now?: number;
}) {
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const activeCount = todos.filter((t) => t.status !== "completed").length;
  const next = now ? nextTask(todos, now) : undefined;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Buka Notch. ${activeCount} tugas aktif, ${fileCount} file sementara. Pintasan Ctrl K.`}
      className="flex h-11 w-full items-center gap-2.5 pl-1.5 pr-5 text-sm"
    >
      <MascotChip size={22} className="h-8 w-11" animated={!fixedNow} />
      <span className="tabular text-[15px] font-semibold tracking-tight">{now ? formatTime(now) : "--.--"}</span>
      <span aria-hidden className="h-4 w-px bg-white/15" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[12.5px]">
        {dragging ? (
          <span className="truncate text-kertas/90">Lepas di tepi atas, kiri, atau kanan</span>
        ) : next && now ? (
          <>
            <Clock3 size={13} aria-hidden className="shrink-0 text-arus brightness-150" />
            <span className="truncate text-kertas/90">{next.title}</span>
            <span className="shrink-0 text-kabut/70">{untilLabel(next.scheduledTime!, now)}</span>
          </>
        ) : (
          <span className="truncate text-kabut/70">Tidak ada jadwal berikutnya</span>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-kabut" title="Tugas aktif di Workspace">
        <ListChecks size={15} aria-hidden />
        <span className="tabular font-semibold text-kertas">{activeCount}</span>
      </span>
      <span className="flex items-center gap-1.5 text-kabut" title="File sementara di Notch">
        <Paperclip size={14} aria-hidden />
        <span className="tabular font-semibold text-kertas">{fileCount}</span>
      </span>
    </button>
  );
}

/** Bentuk normal saat Notch menempel di kiri/kanan layar: berdiri vertikal */
function IdleViewVertical({ todos, fileCount, onOpen }: { todos: TodoDTO[]; fileCount: number; onOpen: () => void }) {
  const now = useNow();
  const activeCount = todos.filter((t) => t.status !== "completed").length;
  const next = now ? nextTask(todos, now) : undefined;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Buka Notch. ${activeCount} tugas aktif, ${fileCount} file sementara.`}
      className="flex w-full flex-col items-center gap-2.5 px-2 py-3 text-center"
    >
      <MascotChip size={30} className="h-12 w-[4.25rem]" />
      <span className="tabular text-[16px] font-bold tracking-tight">{now ? formatTime(now) : "--.--"}</span>
      <span aria-hidden className="h-px w-8 bg-white/15" />
      {next && now ? (
        <span className="flex flex-col items-center gap-0.5" title={next.title}>
          <Clock3 size={13} aria-hidden className="text-arus brightness-150" />
          <span className="text-[11px] leading-tight text-kabut/80">{untilLabel(next.scheduledTime!, now)}</span>
        </span>
      ) : (
        <span className="text-[11px] leading-tight text-kabut/60">Kosong</span>
      )}
      <span aria-hidden className="h-px w-8 bg-white/15" />
      <span className="flex items-center gap-1 text-kabut" title="Tugas aktif di Workspace">
        <ListChecks size={14} aria-hidden />
        <span className="tabular text-[13px] font-semibold text-kertas">{activeCount}</span>
      </span>
      <span className="flex items-center gap-1 text-kabut" title="File sementara di Notch">
        <Paperclip size={13} aria-hidden />
        <span className="tabular text-[13px] font-semibold text-kertas">{fileCount}</span>
      </span>
    </button>
  );
}

function SignedOutView({ onLogin, vertical = false }: { onLogin: () => void; vertical?: boolean }) {
  return (
    <button
      type="button"
      onClick={onLogin}
      className={`flex w-full items-center gap-2.5 text-sm font-semibold ${
        vertical ? "flex-col px-2 py-3 text-center text-[12px] leading-tight" : "h-11 pl-1.5 pr-5"
      }`}
    >
      <MascotChip size={vertical ? 30 : 22} className={vertical ? "h-12 w-[4.25rem]" : "h-8 w-11"} />
      {vertical ? "Masuk" : "Masuk untuk memakai Notch"}
      {!vertical && <LogIn size={15} aria-hidden className="ml-auto text-arus brightness-150" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Panel: rencana, tambah manual, rak file, pengaturan
// ---------------------------------------------------------------------------

function PanelHeader({
  mode,
  fileCount,
  onModeChange,
  onOpenWorkspace,
}: {
  mode: NotchMode;
  fileCount: number;
  onModeChange: (mode: NotchMode) => void;
  onOpenWorkspace: () => void;
}) {
  const tabs: { id: NotchMode; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "plan", label: "Rencana" },
    { id: "shelf", label: fileCount ? `Rak file (${fileCount})` : "Rak file" },
  ];
  // Formulir tambah tugas adalah bagian dari Rencana
  const selected = mode === "add" ? "plan" : mode;
  const tabClass = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
      active ? "bg-kertas text-malam" : "text-kabut hover:text-kertas"
    }`;
  return (
    <div className="mb-3.5 flex items-center gap-1">
      <div role="tablist" aria-label="Isi Notch" className="flex gap-1 rounded-full bg-white/[0.06] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected === tab.id}
            onClick={() => onModeChange(tab.id)}
            className={tabClass(selected === tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button
          role="tab"
          type="button"
          aria-selected={mode === "settings"}
          aria-label="Pengaturan"
          title="Pengaturan"
          onClick={() => onModeChange("settings")}
          className={`${tabClass(mode === "settings")} !px-2.5`}
        >
          <Settings2 size={15} aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenWorkspace}
        className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 text-[13px] font-semibold text-kabut transition-colors hover:bg-white/[0.12] hover:text-kertas"
      >
        <LayoutPanelTop size={15} aria-hidden />
        <span className="hidden sm:inline">Buka Workspace</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange("idle")}
        aria-label="Tutup Notch"
        className="flex h-9 w-9 items-center justify-center rounded-full text-kabut transition-colors hover:bg-white/[0.08] hover:text-kertas"
      >
        <X size={17} />
      </button>
    </div>
  );
}

const glassField =
  "block w-full rounded-[14px] bg-white/[0.06] px-3.5 py-2.5 text-[14px] text-kertas shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-kabut/45 focus:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-arus)] [color-scheme:dark]";

/** Tambah tugas manual tanpa AI */
export function AddTaskView({
  shelfFiles,
  onAdd,
  onBack,
}: {
  shelfFiles: ShelfFileDTO[];
  onAdd: (input: NewTodoInput) => Promise<void>;
  onBack: () => void;
}) {
  const now = useNow();
  const today = now ? dayKey(new Date(now)) : "";
  const tomorrow = now ? dayKey(new Date(now + 86_400_000)) : "";
  const [title, setTitle] = useState("");
  const [day, setDay] = useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = useState("");
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState(true);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = day === "today" ? today : day === "tomorrow" ? tomorrow : customDate || today;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await onAdd({ title: title.trim(), date: time ? date : null, time: time || null, reminder: reminder && !!time, fileIds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah tugas.");
      setPending(false);
    }
  }

  const chip = (active: boolean) =>
    `h-9 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
      active ? "bg-kertas text-malam" : "bg-white/[0.06] text-kabut hover:text-kertas"
    }`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke rencana"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-kabut hover:bg-white/[0.12] hover:text-kertas"
        >
          <ArrowLeft size={15} aria-hidden />
        </button>
        <h3 className="text-[15px] font-semibold">Tambah tugas manual</h3>
      </div>
      <div>
        <label htmlFor="add-title" className="mb-1.5 block text-[12.5px] text-kabut/80">
          Nama tugas
        </label>
        <input
          id="add-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Misalnya: Kirim revisi proposal"
          maxLength={200}
          className={glassField}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
        <fieldset>
          <legend className="mb-1.5 text-[12.5px] text-kabut/80">Hari</legend>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(day === "today")} onClick={() => setDay("today")}>
              Hari ini
            </button>
            <button type="button" className={chip(day === "tomorrow")} onClick={() => setDay("tomorrow")}>
              Besok
            </button>
            {day === "custom" ? (
              <input
                type="date"
                aria-label="Pilih tanggal"
                value={customDate}
                min={today}
                onChange={(e) => setCustomDate(e.target.value)}
                className={`${glassField} !w-auto !py-1.5`}
              />
            ) : (
              <button type="button" className={chip(false)} onClick={() => setDay("custom")}>
                Tanggal lain
              </button>
            )}
          </div>
        </fieldset>
        <div>
          <label htmlFor="add-time" className="mb-1.5 block text-[12.5px] text-kabut/80">
            Jam
          </label>
          <input id="add-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${glassField} !py-1.5`} />
        </div>
      </div>

      {shelfFiles.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12.5px] text-kabut/80">Tempel file dari rak</p>
          <div className="flex flex-wrap gap-1.5">
            {shelfFiles.map((f) => {
              const on = fileIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFileIds((ids) => (on ? ids.filter((i) => i !== f.id) : [...ids, f.id]))}
                  className={`flex max-w-48 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    on ? "bg-arus text-white" : "bg-white/[0.06] text-kabut hover:text-kertas"
                  }`}
                >
                  {on ? <Check size={12} aria-hidden /> : <Paperclip size={12} aria-hidden />}
                  <span className="truncate">{f.fileName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className={`flex items-center gap-2 text-[12.5px] ${time ? "text-kertas" : "text-kabut/50"}`}>
          <input
            type="checkbox"
            checked={reminder && !!time}
            disabled={!time}
            onChange={(e) => setReminder(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-arus)]"
          />
          {time ? "Ingatkan lewat Notch" : "Tanpa jam: masuk tab Tanpa jam"}
        </label>
        <button
          type="submit"
          disabled={!title.trim() || pending}
          className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-kertas px-5 text-[13.5px] font-bold text-malam disabled:opacity-40"
        >
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
          Tambah tugas
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-[#ff9b91]">
          {error}
        </p>
      )}
    </form>
  );
}

const DOCK_OPTIONS: { id: NotchEdge; label: string }[] = [
  { id: "top", label: "Atas tengah" },
  { id: "left", label: "Kiri tengah" },
  { id: "right", label: "Kanan tengah" },
];

/** Gambar layar kecil dengan posisi Notch */
function DockDiagram({ edge }: { edge: NotchEdge }) {
  const notch =
    edge === "top"
      ? "left-1/2 top-0 h-1.5 w-7 -translate-x-1/2 rounded-b-[4px]"
      : edge === "left"
        ? "left-0 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-r-[4px]"
        : "right-0 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-l-[4px]";
  return (
    <span aria-hidden className="relative block h-12 w-[76px] rounded-[10px] bg-[linear-gradient(160deg,#2a9fd4,#0b4f78)] ring-1 ring-white/15">
      <span className={`absolute bg-malam ring-1 ring-white/30 ${notch}`} />
    </span>
  );
}

export function SettingsView({
  userName,
  dock,
  onDockChange,
  soundOn,
  onSoundChange,
  autoStart,
  onAutoStartChange,
  onLogout,
}: {
  userName: string;
  dock: NotchEdge;
  onDockChange: (dock: NotchEdge) => void;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  autoStart: { on: boolean; available: boolean };
  onAutoStartChange: (on: boolean) => void;
  onLogout: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section aria-labelledby="dock-title">
        <h3 id="dock-title" className="text-[14px] font-semibold">
          Posisi Notch
        </h3>
        <div role="radiogroup" aria-labelledby="dock-title" className="mt-2.5 grid grid-cols-3 gap-2">
          {DOCK_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={dock === o.id}
              onClick={() => onDockChange(o.id)}
              className={`flex flex-col items-center gap-2 rounded-[16px] p-2.5 text-[12px] font-semibold transition-colors ${
                dock === o.id ? "bg-white/[0.12] text-kertas ring-1 ring-arus" : "bg-white/[0.04] text-kabut hover:bg-white/[0.08]"
              }`}
            >
              <DockDiagram edge={o.id} />
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-kabut/70">
          Bisa juga dengan menyeret Notch ke tepi atas, kiri, atau kanan layar.
        </p>
      </section>

      <section aria-label="Lainnya" className="space-y-2.5">
        <label className="flex items-center justify-between gap-3 rounded-[16px] bg-white/[0.04] px-3.5 py-3">
          <span>
            <span className="block text-[13px] font-semibold">Bunyi pengingat</span>
            <span className="block text-[11.5px] text-kabut/70">Nada halus saat jadwal tiba</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={soundOn}
            onChange={(e) => onSoundChange(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-arus)]"
          />
        </label>
        <label
          className={`flex items-center justify-between gap-3 rounded-[16px] bg-white/[0.04] px-3.5 py-3 ${
            autoStart.available ? "" : "opacity-60"
          }`}
        >
          <span>
            <span className="block text-[13px] font-semibold">Nyalakan saat Windows menyala</span>
            <span className="block text-[11.5px] text-kabut/70">
              {autoStart.available ? "Notch langsung siap setiap laptop dibuka" : "Tersedia di versi installer"}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={autoStart.on}
            disabled={!autoStart.available}
            onChange={(e) => onAutoStartChange(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-arus)]"
          />
        </label>
        <div className="flex items-center gap-3 rounded-[16px] bg-white/[0.04] px-3.5 py-3">
          <MascotChip size={22} className="h-9 w-11" animated={false} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-kabut/70">Masuk sebagai</span>
            <span className="block truncate text-[13px] font-semibold">{userName}</span>
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar dari Notch"
            title="Keluar dari Notch"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-kabut hover:bg-white/[0.12] hover:text-kertas"
          >
            <LogOut size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

const ZONE_NAME: Record<number, string> = { [-420]: "WIB", [-480]: "WITA", [-540]: "WIT" };

/** Dashboard: informasi jam saja, besar dan mudah dibaca sekilas */
export function DashboardView({ now: fixedNow }: { now?: number }) {
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const date = now ? new Date(now) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = date ? date.getTimezoneOffset() : 0;
  const utc = `UTC${offset <= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}.${pad(Math.abs(offset) % 60)}`;
  return (
    <section aria-label="Jam" className="flex flex-col items-center px-2 pb-3 pt-1 text-center">
      <p className="min-h-5 text-[13px] text-kabut/80">
        {date &&
          new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)}
      </p>
      <p className="tabular mt-1 flex items-start text-[76px] font-extrabold leading-none tracking-[-0.04em]">
        {date ? `${pad(date.getHours())}.${pad(date.getMinutes())}` : "--.--"}
        <span className="ml-2 mt-2 text-[22px] font-bold tracking-normal text-kabut/70">{date ? pad(date.getSeconds()) : "--"}</span>
      </p>
      <p className="satin-chip mt-3 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-kabut">
        {ZONE_NAME[offset] ? `${ZONE_NAME[offset]}, ${utc}` : utc}
      </p>
    </section>
  );
}

const STATUS_BAR: Record<TodoStatus, string> = {
  pending: "bg-kabut-deep",
  acc: "bg-acc",
  completed: "bg-arus",
};

const STATUS_SHORT: Record<TodoStatus, string> = {
  pending: "Menunggu",
  acc: "Dikerjakan",
  completed: "Selesai",
};

export function PlanView({
  text,
  onTextChange,
  shelfFiles,
  todos,
  error,
  onSubmit,
  onOpenShelf,
  onOpenAdd,
  now: fixedNow,
}: {
  text: string;
  onTextChange: (text: string) => void;
  shelfFiles: ShelfFileDTO[];
  todos: TodoDTO[];
  error: string | null;
  onSubmit: (text: string) => void;
  onOpenShelf: () => void;
  /** Buka formulir tambah tugas manual */
  onOpenAdd: () => void;
  /** Waktu tetap untuk demo di landing; default jam sekarang */
  now?: number;
}) {
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const example =
    "Hari ini jam 10.00 revisi laporan bab 3, jam 14.00 lanjut rapikan desain UI, jam 19.00 rapat evaluasi tim.";
  const ready = text.trim().length >= 3;

  return (
    <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onSubmit(text);
        }}
        className="flex flex-col"
      >
        <label htmlFor="plan-input" className="text-[21px] font-bold leading-tight tracking-tight">
          Apa rencanamu hari ini?
        </label>
        <textarea
          id="plan-input"
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && ready) {
              e.preventDefault();
              onSubmit(text);
            }
          }}
          placeholder="Ketik seperti mengirim pesan: jam 10 revisi laporan, jam 2 siang rapat..."
          className="mt-3 block w-full resize-none rounded-[18px] bg-white/[0.06] px-4 py-3 text-[14.5px] leading-relaxed text-kertas shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-kabut/45 focus:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-arus)]"
        />

        <div className="mt-2.5 min-h-6 text-[12.5px] leading-snug text-kabut">
          {error ? (
            <p role="alert" className="text-[#ff9b91]">
              {error}
            </p>
          ) : shelfFiles.length ? (
            <p className="flex flex-wrap items-center gap-1.5">
              <span>AI mencocokkan file di rak:</span>
              {shelfFiles.slice(0, 3).map((f) => (
                <span key={f.id} className="max-w-36 truncate rounded-full bg-white/[0.08] px-2 py-0.5 text-[11.5px] text-kertas">
                  {f.fileName}
                </span>
              ))}
              {shelfFiles.length > 3 && <span>dan {shelfFiles.length - 3} lainnya</span>}
            </p>
          ) : !text ? (
            <p>
              Contoh:{" "}
              <button
                type="button"
                onClick={() => onTextChange(example)}
                className="text-left text-kertas/90 underline decoration-kabut/30 underline-offset-4 hover:decoration-kertas"
              >
                {example}
              </button>
            </p>
          ) : (
            <p>
              Rak file kosong.{" "}
              <button type="button" onClick={onOpenShelf} className="font-semibold text-kertas underline underline-offset-4">
                Taruh file dulu
              </button>{" "}
              agar AI bisa menempelkannya ke tugas.
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="hidden whitespace-nowrap text-[11.5px] text-kabut/60 sm:inline">Ctrl + Enter</span>
          <button
            type="submit"
            disabled={!ready}
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-kertas px-5 text-[13.5px] font-bold text-malam transition-[opacity,transform] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send size={15} aria-hidden className="text-arus" />
            Buat To-Do List dengan AI
          </button>
        </div>
      </form>

      <TodayList todos={todos} now={now} onAdd={onOpenAdd} />
    </div>
  );
}

/** Daftar singkat tugas hari ini dengan garis warna status, seperti widget kalender */
function TodayList({ todos, now, onAdd }: { todos: TodoDTO[]; now: number | null; onAdd: () => void }) {
  const today = now ? dayKey(new Date(now)) : null;
  const items = today
    ? todos
        .filter((t) => t.scheduledTime && dayKey(new Date(t.scheduledTime)) === today)
        .sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!))
    : [];
  const done = items.filter((t) => t.status === "completed").length;
  const nextId = items.find((t) => t.status !== "completed")?.id;
  const scrollable = items.length > 4;

  // Saat panel dibuka, gulir sekali ke tugas pertama yang belum selesai agar tugas berikutnya langsung terlihat
  const listRef = useRef<HTMLUListElement>(null);
  const scrolled = useRef(false);
  useEffect(() => {
    const list = listRef.current;
    if (!list || scrolled.current || !nextId) return;
    scrolled.current = true;
    const target = list.querySelector<HTMLElement>(`[data-id="${nextId}"]`);
    if (target) list.scrollTop = target.offsetTop;
  }, [nextId]);

  return (
    <section aria-label="Tugas hari ini" className="rounded-[20px] bg-white/[0.04] p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="flex items-center">
        <h3 className="text-[13px] font-semibold text-kabut">Hari ini</h3>
        <span className="tabular ml-auto mr-2 text-[12px] text-kabut/70">
          {done}/{items.length} selesai
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Tambah tugas manual"
          title="Tambah tugas manual"
          className="satin-chip flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kertas transition-transform hover:scale-105"
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      {items.length ? (
        <ul
          ref={listRef}
          tabIndex={scrollable ? 0 : undefined}
          aria-label={scrollable ? `${items.length} tugas, gulir untuk melihat semua` : undefined}
          className="scrollbar-notch relative mt-2.5 max-h-[10.75rem] space-y-2 overflow-y-auto overscroll-contain pr-1.5"
        >
          {items.map((t) => (
            <li key={t.id} data-id={t.id} className="flex gap-2.5">
              <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${STATUS_BAR[t.status]}`} />
              <span className="min-w-0">
                <span className={`block truncate text-[13px] font-semibold leading-snug ${t.status === "completed" ? "text-kabut line-through" : ""}`}>
                  {t.title}
                </span>
                <span className="tabular block text-[11.5px] text-kabut/70">
                  {formatTime(t.scheduledTime!)}, {STATUS_SHORT[t.status]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-kabut/70">
          Belum ada tugas untuk hari ini. Tugas dari rencanamu akan muncul di sini.
        </p>
      )}
    </section>
  );
}

const FILE_BAR = (mime: string) =>
  mime.startsWith("image/") ? "bg-snooze" : mime === "application/pdf" || mime.startsWith("text/") ? "bg-arus" : "bg-acc";

export function ShelfView({
  files,
  todos,
  uploading,
  onUpload,
  onDelete,
}: {
  files: ShelfFileDTO[];
  todos: TodoDTO[];
  uploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow() ?? 0;

  async function handle(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    try {
      await onUpload(Array.from(list));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file.");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
      {/* Map kaca: area tarik-lepas sekaligus tombol pilih file */}
      <label
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        className={`group relative mx-auto block h-[150px] w-[208px] cursor-pointer transition-transform duration-300 ${over ? "-translate-y-1 scale-[1.03]" : "hover:-translate-y-0.5"}`}
      >
        <GlassFolder count={files.length} uploading={uploading} over={over} />
        <input
          type="file"
          multiple
          className="sr-only"
          onClick={filePicker.start}
          onChange={(e) => {
            filePicker.end();
            void handle(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div className="min-w-0">
        {files.length ? (
          <ul className="scrollbar-none max-h-[150px] space-y-1.5 overflow-y-auto pr-1">
            {files.map((file) => {
              const owner = file.todoItemId ? todos.find((t) => t.id === file.todoItemId) : null;
              return (
                <li
                  key={file.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(FILE_DRAG_TYPE, file.id);
                    e.dataTransfer.effectAllowed = "link";
                  }}
                  className="flex cursor-grab items-center gap-2.5 rounded-[14px] bg-white/[0.04] py-2 pl-2.5 pr-1.5 active:cursor-grabbing"
                >
                  <span aria-hidden className={`h-8 w-[3px] shrink-0 rounded-full ${FILE_BAR(file.mimeType)}`} />
                  <span className="min-w-0 flex-1">
                    <a
                      href={file.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[13px] font-semibold hover:underline"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </a>
                    <span className="tabular block truncate text-[11.5px] text-kabut/75">
                      {owner ? `Di tugas: ${owner.title}` : `${formatSize(file.fileSize)}, ${remainingLabel(file.expiresAt, now)}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    aria-label={`Hapus ${file.fileName} dari rak`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-kabut hover:bg-white/[0.08] hover:text-kertas"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full min-h-[150px] flex-col justify-center rounded-[18px] border border-dashed border-white/12 px-4">
            <p className="text-[14px] font-semibold">Rak masih kosong</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-kabut/75">
              Tarik PDF, gambar, atau dokumen dari File Explorer ke map di kiri. Maks 4 MB, dihapus otomatis setelah 24 jam.
            </p>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-2 text-[12.5px] text-[#ff9b91]">
            {error}
          </p>
        ) : (
          files.length > 0 && <p className="mt-2 text-[11.5px] text-kabut/60">Tarik file ke kartu tugas di Workspace untuk menempelkannya.</p>
        )}
      </div>
    </div>
  );
}

/** Ikon map berlapis: punggung map berwarna, kertas yang mengintip, dan sisi depan kaca buram */
function GlassFolder({ count, uploading, over }: { count: number; uploading: boolean; over: boolean }) {
  return (
    <>
      <svg viewBox="0 0 208 150" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="folder-back" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1aa3dc" />
            <stop offset="0.55" stopColor="#007AAD" />
            <stop offset="1" stopColor="#0c3a5c" />
          </linearGradient>
        </defs>
        <path
          d="M0 16Q0 2 14 2H70Q79 2 84 8L90 15Q94 19 102 19H194Q208 19 208 33V136Q208 150 194 150H14Q0 150 0 136Z"
          fill="url(#folder-back)"
        />
      </svg>
      {/* Kertas di dalam map */}
      {count > 0 && (
        <>
          <span aria-hidden className="absolute left-8 top-[30px] h-16 w-28 -rotate-6 rounded-[9px] bg-[#cfdbe5] shadow-md transition-transform duration-300 group-hover:-translate-y-1" />
          <span aria-hidden className="absolute left-[3.75rem] top-[26px] h-16 w-28 rotate-3 rounded-[9px] bg-kertas/90 shadow-md transition-transform duration-300 group-hover:-translate-y-2" />
        </>
      )}
      {/* Sisi depan kaca buram, dengan lidah kecil di kanan atas */}
      <span
        className={`absolute inset-x-0 bottom-0 flex h-[108px] flex-col justify-end p-3.5 backdrop-blur-[6px] transition-colors [clip-path:path('M0_24Q0_10_14_10H112Q120_10_125_5L127_3Q130_0_137_0H194Q208_0_208_14V94Q208_108_194_108H14Q0_108_0_94Z')] ${
          over ? "bg-white/30" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))]"
        }`}
      >
        <span className="text-[14px] font-bold leading-tight">Rak file</span>
        <span className="tabular text-[11.5px] text-white/75">{count ? `${count} file, simpan 24 jam` : "Simpan 24 jam"}</span>
        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-malam text-kertas shadow-lg">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={17} />}
        </span>
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// AI bekerja dan hasilnya
// ---------------------------------------------------------------------------

export function WorkingView({ slow, files }: { slow: boolean; files: ShelfFileDTO[] }) {
  return (
    <div role="status" className="flex h-[58px] items-center gap-3 pl-3 pr-3.5">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-arus [animation-duration:1.1s]" />
        <Sparkles size={15} className="text-arus brightness-150" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">Menyusun rencanamu</span>
        <span className="block truncate text-[11.5px] text-kabut/75">
          {slow ? "AI sedang ramai, mencoba model cadangan" : "AI memecah kalimat jadi tugas berjam"}
        </span>
      </span>
      {files.length > 0 && (
        <span aria-hidden className="relative h-9 w-12 shrink-0">
          {files.slice(0, 3).map((f, i) => (
            <span
              key={f.id}
              className={`absolute top-0 h-9 w-7 rounded-[6px] shadow-md ${FILE_BAR(f.mimeType)}`}
              style={{ left: i * 9, transform: `rotate(${(i - 1) * 6}deg)`, opacity: 1 - i * 0.18 }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

export function ResultView({
  run,
  todos,
  onOpenWorkspace,
  onClose,
}: {
  run: Extract<PlanRun, { status: "done" }>;
  todos: TodoDTO[];
  onOpenWorkspace: () => void;
  onClose: () => void;
}) {
  const created = todos.filter((t) => run.createdIds.includes(t.id));
  return (
    <div role="status" className="flex flex-col items-center px-5 pb-5 pt-4 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acc text-malam">
        <Check size={16} strokeWidth={3} aria-hidden />
      </span>
      <h2 className="mt-2.5 text-[18px] font-bold tracking-tight">{run.createdIds.length} tugas masuk ke Workspace</h2>
      {run.summary && <p className="mt-1 max-w-[34ch] text-[12.5px] leading-snug text-kabut/80">{run.summary}</p>}
      {created.length > 0 && (
        <ul
          tabIndex={created.length > 3 ? 0 : undefined}
          className="scrollbar-notch mt-3.5 max-h-[8.4rem] w-full space-y-1.5 overflow-y-auto overscroll-contain pr-1 text-left"
        >
          {created.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.05] px-3 py-2">
              <span className="tabular w-11 shrink-0 text-[12.5px] font-bold text-kabut">
                {t.scheduledTime ? formatTime(t.scheduledTime) : "--.--"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.title}</span>
              {t.files.length > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-kabut/80">
                  <Paperclip size={12} aria-hidden />
                  {t.files.length}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpenWorkspace}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-kertas px-5 text-[13.5px] font-bold text-malam"
        >
          <LayoutPanelTop size={15} aria-hidden />
          Buka Workspace
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center rounded-full bg-white/[0.1] px-5 text-[13.5px] font-semibold text-kertas hover:bg-white/[0.16]"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pengingat ACC / Snooze
// ---------------------------------------------------------------------------

export function ReminderView({
  todo,
  more,
  onAcc,
  onSnooze,
}: {
  todo: TodoDTO;
  more: number;
  onAcc: (todoId: string) => void;
  onSnooze: (todoId: string, minutes: 5 | 10 | 15) => void;
}) {
  const details = [
    { label: "Jadwal", value: todo.scheduledTime ? formatTime(todo.scheduledTime) : "Tanpa jam" },
    { label: "File", value: todo.files[0]?.fileName ?? "Tidak ada" },
    { label: "Status", value: STATUS_SHORT[todo.status] },
  ];
  return (
    <div role="alertdialog" aria-labelledby="reminder-title" className="flex flex-col items-center px-5 pb-5 pt-4 text-center">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-arus">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-arus/50 [animation-iteration-count:3]" />
        <BellRing size={17} className="relative" aria-hidden />
      </span>
      <p className="mt-2.5 text-[12.5px] text-kabut/80">
        {todo.reminder?.state === "snoozed" ? "Pengingat setelah ditunda" : "Waktunya mulai"}
        {more > 0 && `, ada ${more} pengingat lain`}
      </p>
      <h2 id="reminder-title" className="mt-0.5 max-w-full text-[20px] font-bold leading-snug tracking-tight">
        {todo.title}
      </h2>

      <dl className="mt-3.5 grid w-full grid-cols-3 gap-2 border-y border-white/[0.07] py-3">
        {details.map((d) => (
          <div key={d.label} className="min-w-0">
            <dt className="text-[11px] text-kabut/65">{d.label}</dt>
            <dd className="tabular truncate text-[13px] font-semibold" title={d.value}>
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => onAcc(todo.id)}
          className="glass-sheen relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(135deg,rgba(69,189,240,0.62),rgba(0,122,173,0.42))] pl-1.5 pr-6 text-[14px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(255,255,255,0.2),0_12px_32px_-10px_rgba(39,174,230,0.75)] backdrop-blur-md transition-[filter] hover:brightness-110"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            <Check size={16} strokeWidth={3} aria-hidden />
          </span>
          ACC
        </button>
        <div
          role="group"
          aria-label="Snooze pengingat"
          className="flex h-11 items-center gap-0.5 rounded-full bg-white/[0.07] pl-3.5 pr-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md"
        >
          <AlarmClock size={15} aria-hidden className="text-kabut" />
          <span className="ml-1.5 mr-1 text-[13.5px] font-bold text-kertas">Snooze</span>
          {([5, 10, 15] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onSnooze(todo.id, m)}
              aria-label={`Tunda ${m} menit`}
              className="tabular h-9 rounded-full px-3 text-[12.5px] font-semibold text-kabut transition-colors hover:bg-white/[0.14] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              {m} mnt
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
