"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { NewTodoInput } from "@/lib/useWorkspaceData";
import type { TodoDTO } from "@/lib/types";

const field =
  "block h-11 w-full rounded-[14px] border border-kabut bg-kertas px-3.5 text-[14.5px] placeholder:text-redup/60 focus:border-arus focus:outline-none focus:ring-2 focus:ring-arus/20";

/** Formulir tambah tugas manual di Workspace, tanggalnya mengikuti tab yang sedang dibuka */
export function AddTaskCard({
  defaultDate,
  onAdd,
  onDone,
  onCancel,
}: {
  defaultDate: string;
  onAdd: (input: NewTodoInput) => Promise<TodoDTO>;
  onDone: (todo: TodoDTO) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const todo = await onAdd({ title: title.trim(), date: time ? date : null, time: time || null, reminder: reminder && !!time });
      onDone(todo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah tugas.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Tambah tugas" className="mb-5 rounded-[22px] bg-white p-4 shadow-[0_18px_40px_-28px_rgba(12,29,50,0.45)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight">Tambah tugas</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Tutup formulir tambah tugas"
          className="flex h-9 w-9 items-center justify-center rounded-full text-redup hover:bg-panel hover:text-malam"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem]">
        <div>
          <label htmlFor="ws-add-title" className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Nama tugas
          </label>
          <input
            id="ws-add-title"
            autoFocus
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misalnya: Kirim revisi proposal"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ws-add-date" className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Tanggal
          </label>
          <input id="ws-add-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="ws-add-time" className="mb-1.5 block text-[12.5px] font-semibold text-redup">
            Jam
          </label>
          <input id="ws-add-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <label className={`flex items-center gap-2 text-[13px] ${time ? "text-malam" : "text-redup"}`}>
          <input
            type="checkbox"
            checked={reminder && !!time}
            disabled={!time}
            onChange={(e) => setReminder(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-arus)]"
          />
          {time ? "Ingatkan lewat Notch saat jamnya tiba" : "Tanpa jam: tugas masuk tab Tanpa jam"}
        </label>
        <button
          type="submit"
          disabled={!title.trim() || pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-arus px-5 text-[14px] font-semibold text-white transition-colors hover:bg-arus-deep disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
          Tambah tugas
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
