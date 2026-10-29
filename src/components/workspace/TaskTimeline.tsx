"use client";

import { useEffect, useRef, useState } from "react";
import { Check, File as FileIcon, FileImage, FileText, Loader2, Paperclip, Pencil, Play, Trash2, X } from "lucide-react";
import { FILE_DRAG_TYPE } from "@/components/notch/Notch";
import { dayKey, formatTime } from "@/lib/client";
import { STATUS_LABEL, type ShelfFileDTO, type TodoDTO } from "@/lib/types";

type Actions = {
  onToggleDone: (todo: TodoDTO) => void;
  onToggleReminder: (todo: TodoDTO) => void;
  onDelete: (todo: TodoDTO) => void;
  onAttach: (fileId: string, todoId: string | null) => void;
  /** Simpan judul dan jadwal baru; melempar error agar formulir bisa menampilkannya */
  onEdit: (todo: TodoDTO, input: { title: string; date: string; time: string | null }) => Promise<unknown>;
};

type TimelineProps = Actions & {
  items: TodoDTO[];
  shelfFiles: ShelfFileDTO[];
  mixedDates?: boolean;
  /** Tampilkan penanda "Sekarang" di antara tugas (hanya tab Hari ini) */
  now?: Date | null;
};

const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

/** Daftar tugas vertikal: rel waktu di kiri, setiap tugas adalah node yang tersambung garis ke kartunya. */
export function TaskTimeline({ items, shelfFiles, mixedDates, now, ...actions }: TimelineProps) {
  const nowIndex = now
    ? (() => {
        const i = items.findIndex((t) => t.scheduledTime && new Date(t.scheduledTime) > now);
        const lastTimed = items.findLastIndex((t) => t.scheduledTime);
        return i === -1 ? lastTimed + 1 : i;
      })()
    : -1;

  return (
    <ol className="relative">
      {/* Rel waktu */}
      <span
        aria-hidden
        className="absolute bottom-8 top-6 left-[calc(3.5rem+1.25rem-1px)] w-[2px] rounded-full bg-arus/20 sm:left-[calc(4.25rem+1.25rem-1px)]"
      />
      {items.map((todo, i) => (
        <TimelineEntry
          key={todo.id}
          todo={todo}
          shelfFiles={shelfFiles}
          showDate={mixedDates}
          nowBefore={i === nowIndex ? now : null}
          {...actions}
        />
      ))}
      {now && nowIndex === items.length && <NowMarker now={now} />}
    </ol>
  );
}

function NowMarker({ now }: { now: Date }) {
  return (
    <li aria-label={`Sekarang ${formatTime(now)}`} className="relative grid grid-cols-[3.5rem_2.5rem_1fr] items-center py-1 sm:grid-cols-[4.25rem_2.5rem_1fr]">
      <span className="tabular pr-3 text-right text-[13px] font-bold text-arus">{formatTime(now)}</span>
      <span className="flex justify-center">
        <span className="h-3 w-3 rounded-full border-[3px] border-panel bg-arus outline outline-2 outline-arus/30" />
      </span>
      <span className="flex items-center gap-2">
        <span className="h-[2px] flex-1 bg-gradient-to-r from-arus/60 to-transparent" />
        <span className="rounded-full bg-arus px-2.5 py-0.5 text-[11.5px] font-semibold text-white">Sekarang</span>
      </span>
    </li>
  );
}

const NODE_STYLE = {
  pending: "border-2 border-arus bg-white text-arus/0 hover:text-arus/50",
  acc: "bg-acc text-malam",
  completed: "bg-arus text-white",
} as const;

const STATUS_PILL = {
  pending: "bg-panel text-redup",
  acc: "bg-acc/15 text-acc-ink",
  completed: "bg-arus-soft text-arus-deep",
} as const;

function TimelineEntry({
  todo,
  shelfFiles,
  showDate,
  nowBefore,
  onToggleDone,
  onToggleReminder,
  onDelete,
  onAttach,
  onEdit,
}: Actions & {
  todo: TodoDTO;
  shelfFiles: ShelfFileDTO[];
  showDate?: boolean;
  nowBefore: Date | null | undefined;
}) {
  const [dropping, setDropping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const done = todo.status === "completed";
  const reminderOn = !!todo.reminder?.isEnabled && !done;
  const canRemind = !!todo.scheduledTime && !done;
  const snoozedUntil =
    reminderOn && todo.reminder?.state === "snoozed" && todo.reminder.remindAt ? todo.reminder.remindAt : null;

  useEffect(() => {
    if (!confirmDelete) return;
    const id = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(id);
  }, [confirmDelete]);

  return (
    <>
      {nowBefore && <NowMarker now={nowBefore} />}
      <li
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(FILE_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "link";
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          const fileId = e.dataTransfer.getData(FILE_DRAG_TYPE);
          setDropping(false);
          if (fileId) {
            e.preventDefault();
            onAttach(fileId, todo.id);
          }
        }}
        className="relative grid grid-cols-[3.5rem_2.5rem_1fr] pb-3 sm:grid-cols-[4.25rem_2.5rem_1fr]"
      >
        {/* Jam */}
        <div className="pr-3 pt-[1.15rem] text-right">
          <span className={`tabular block text-[15px] font-bold tracking-tight ${done ? "text-redup/70" : "text-malam"}`}>
            {todo.scheduledTime ? formatTime(todo.scheduledTime) : "--.--"}
          </span>
          {showDate && todo.scheduledTime && (
            <span className="block text-[11.5px] leading-tight text-redup">{shortDate.format(new Date(todo.scheduledTime))}</span>
          )}
        </div>

        {/* Node di rel waktu, sekaligus checkbox selesai */}
        <div className="relative flex justify-center pt-3.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Tandai "${todo.title}" belum selesai` : `Tandai "${todo.title}" selesai`}
            onClick={() => onToggleDone(todo)}
            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-[0_0_0_4px_var(--color-panel)] transition-colors ${NODE_STYLE[todo.status]}`}
          >
            {todo.status === "acc" ? <Play size={13} fill="currentColor" /> : <Check size={15} strokeWidth={3} />}
          </button>
          {/* Garis penghubung node ke kartu */}
          <span aria-hidden className="absolute left-1/2 top-[1.85rem] h-[2px] w-[calc(50%+0.25rem)] bg-arus/20" />
        </div>

        {/* Kartu tugas */}
        <article
          className={`ml-1 rounded-[22px] bg-white p-4 transition-shadow sm:p-5 ${
            dropping ? "ring-2 ring-arus" : "shadow-[0_1px_0_rgba(12,29,50,0.04)]"
          }`}
        >
          {editing ? (
            <EditTaskForm
              todo={todo}
              onCancel={() => setEditing(false)}
              onSave={async (input) => {
                await onEdit(todo, input);
                setEditing(false);
              }}
            />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <h3
                  className={`min-w-0 flex-1 pt-1 text-[16.5px] font-semibold leading-snug tracking-tight ${
                    done ? "text-redup line-through decoration-redup/40" : ""
                  }`}
                >
                  {todo.title}
                </h3>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label={`Edit "${todo.title}"`}
                    title="Edit judul dan waktu"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-kabut text-redup transition-colors hover:border-arus/40 hover:text-arus"
                  >
                    <Pencil size={15} />
                  </button>
                  <AttachMenu todo={todo} shelfFiles={shelfFiles} onAttach={onAttach} />
                  <button
                    type="button"
                    onClick={() => (confirmDelete ? onDelete(todo) : setConfirmDelete(true))}
                    aria-label={confirmDelete ? `Konfirmasi hapus "${todo.title}"` : `Hapus "${todo.title}"`}
                    className={`inline-flex h-9 items-center justify-center rounded-full transition-colors ${
                      confirmDelete
                        ? "bg-bahaya px-3 text-[13px] font-semibold text-white"
                        : "w-9 border border-kabut text-redup hover:border-bahaya/40 hover:text-bahaya"
                    }`}
                  >
                    {confirmDelete ? "Hapus?" : <Trash2 size={15} />}
                  </button>
                </div>
              </div>

              {todo.files.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {todo.files.map((file) => (
                    <FileBadge key={file.id} file={file} onDetach={() => onAttach(file.id, null)} />
                  ))}
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-panel pt-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_PILL[todo.status]}`}>
                  {STATUS_LABEL[todo.status]}
                </span>
                {snoozedUntil && (
                  <span className="tabular rounded-full bg-snooze/25 px-2.5 py-1 text-[12px] font-semibold text-snooze-ink">
                    Ditunda sampai {formatTime(snoozedUntil)}
                  </span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderOn}
                  disabled={!canRemind}
                  onClick={() => onToggleReminder(todo)}
                  title={
                    !todo.scheduledTime
                      ? "Tugas ini belum punya jam"
                      : done
                        ? "Tugas sudah selesai"
                        : reminderOn
                          ? "Matikan reminder"
                          : "Notch akan mengingatkan saat jamnya tiba"
                  }
                  className={`ml-auto inline-flex h-9 items-center gap-2 rounded-full pl-2.5 pr-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    reminderOn ? "bg-malam text-kertas" : "bg-panel text-malam hover:bg-kabut"
                  }`}
                >
                  <span aria-hidden className={`relative h-4 w-7 rounded-full transition-colors ${reminderOn ? "bg-arus" : "bg-kabut-deep"}`}>
                    <span
                      className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-[translate] ${
                        reminderOn ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </span>
                  {reminderOn ? "Reminder aktif" : "Aktifkan reminder"}
                </button>
              </div>
            </>
          )}
        </article>
      </li>
    </>
  );
}

const editField =
  "block h-11 w-full rounded-[14px] border border-kabut bg-kertas px-3.5 text-[14.5px] focus:border-arus focus:outline-none focus:ring-2 focus:ring-arus/20";

/** Formulir edit di dalam kartu: judul, tanggal, dan jam tugas */
function EditTaskForm({
  todo,
  onSave,
  onCancel,
}: {
  todo: TodoDTO;
  onSave: (input: { title: string; date: string; time: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const at = todo.scheduledTime ? new Date(todo.scheduledTime) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const [title, setTitle] = useState(todo.title);
  const [date, setDate] = useState(() => dayKey(at ?? new Date()));
  const [time, setTime] = useState(at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `edit-${todo.id}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), date, time: time || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      aria-label={`Edit "${todo.title}"`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_7.5rem]">
        <div>
          <label htmlFor={`${id}-title`} className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Judul tugas
          </label>
          <input
            id={`${id}-title`}
            autoFocus
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className={editField}
          />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Tanggal
          </label>
          <input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={editField} />
        </div>
        <div>
          <label htmlFor={`${id}-time`} className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Jam
          </label>
          <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className={editField} />
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-panel pt-3.5">
        <p className="mr-auto text-[12.5px] text-redup">
          {time
            ? todo.reminder?.isEnabled
              ? "Pengingat ikut pindah ke jam baru."
              : "Kosongkan jam untuk memindahkan ke tab Tanpa jam."
            : "Tanpa jam: tugas pindah ke tab Tanpa jam."}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-redup hover:bg-panel hover:text-malam"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={!title.trim() || pending}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-arus px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-arus-deep disabled:opacity-50"
        >
          {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Check size={15} strokeWidth={2.75} aria-hidden />}
          Simpan
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-bahaya">
          {error}
        </p>
      )}
    </form>
  );
}

export function FileTypeIcon({ mime, size, className }: { mime: string; size: number; className?: string }) {
  if (mime.startsWith("image/")) return <FileImage size={size} className={className} aria-hidden />;
  if (mime === "application/pdf" || mime.startsWith("text/")) return <FileText size={size} className={className} aria-hidden />;
  return <FileIcon size={size} className={className} aria-hidden />;
}

function FileBadge({ file, onDetach }: { file: TodoDTO["files"][number]; onDetach: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-panel text-[12px] font-medium">
      <a
        href={file.filePath}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-1.5 py-1.5 pl-3 pr-1 hover:text-arus-deep"
        title={`Buka ${file.fileName}`}
      >
        <FileTypeIcon mime={file.mimeType} size={13} className="shrink-0 text-arus" />
        <span className="max-w-48 truncate">{file.fileName}</span>
      </a>
      <button
        type="button"
        onClick={onDetach}
        aria-label={`Lepas ${file.fileName} dari tugas ini`}
        className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-redup hover:bg-kabut hover:text-malam"
      >
        <X size={12} />
      </button>
    </span>
  );
}

function AttachMenu({
  todo,
  shelfFiles,
  onAttach,
}: {
  todo: TodoDTO;
  shelfFiles: ShelfFileDTO[];
  onAttach: (fileId: string, todoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = shelfFiles.filter((f) => f.todoItemId !== todo.id);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Lampirkan file dari rak Notch ke "${todo.title}"`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-kabut text-redup transition-colors hover:border-arus/40 hover:text-arus"
      >
        <Paperclip size={15} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-64 rounded-2xl bg-malam p-1.5 text-kertas shadow-[0_16px_40px_-16px_rgba(12,29,50,0.6)]"
        >
          {options.length ? (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[12px] text-kabut">Tempel file dari rak Notch</p>
              {options.map((file) => (
                <button
                  key={file.id}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    onAttach(file.id, todo.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] hover:bg-malam-2"
                >
                  <Paperclip size={14} className="shrink-0 text-kabut" aria-hidden />
                  <span className="truncate">{file.fileName}</span>
                </button>
              ))}
            </>
          ) : (
            <p className="p-2.5 text-[13px] leading-relaxed text-kabut">
              Rak Notch masih kosong. Taruh file lewat Notch di atas layar, lalu tempelkan di sini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
