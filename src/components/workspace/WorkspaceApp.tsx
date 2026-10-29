"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Paperclip, Plus, SlidersHorizontal, X } from "lucide-react";
import { FILE_DRAG_TYPE } from "@/components/notch/Notch";
import { LogoMark } from "@/components/LogoMark";
import { FileTypeIcon, TaskTimeline } from "./TaskTimeline";
import { AddTaskCard } from "./AddTaskCard";
import { buildDayTabs, tabStats, type DayTab } from "./dayTabs";
import { dayKey, formatDay, formatTime, remainingLabel } from "@/lib/client";
import { useNow } from "@/lib/useNow";
import { useWorkspaceData, type NewTodoInput } from "@/lib/useWorkspaceData";
import type { ShelfFileDTO, TodoDTO, TodoStatus } from "@/lib/types";

type Filter = "semua" | TodoStatus;

type Props = {
  user: { name: string; email: string; workspaceName: string };
  initialTodos: TodoDTO[];
  initialFiles: ShelfFileDTO[];
};

export function WorkspaceApp({ user, initialTodos, initialFiles }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((t) => (t === message ? null : t)), 4000);
  }, []);

  const data = useWorkspaceData(initialTodos, initialFiles, { onError: notify });
  const { todos, files } = data;

  const nowMs = useNow();
  // Dibulatkan ke menit agar tab dan penanda "Sekarang" tidak dihitung ulang setiap detik
  const minute = nowMs ? Math.floor(nowMs / 60_000) : null;
  const now = useMemo(() => (minute ? new Date(minute * 60_000) : null), [minute]);
  const tabs = useMemo(() => (now ? buildDayTabs(todos, now) : []), [todos, now]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("semua");
  const active = tabs.find((t) => t.key === selectedKey) ?? tabs.find((t) => t.isToday) ?? tabs[0];
  const activeIndex = active ? tabs.indexOf(active) : 0;

  async function toggleReminder(todo: TodoDTO) {
    const enabling = !todo.reminder?.isEnabled;
    const updated = await data.reminderAction(todo, { action: enabling ? "enable" : "disable" });
    if (updated && enabling && updated.reminder?.remindAt) {
      const at = new Date(updated.reminder.remindAt);
      notify(
        at <= new Date()
          ? "Jam tugas ini sudah lewat, Notch di atas layar langsung mengingatkan."
          : `Notch di atas layar akan mengingatkan pukul ${formatTime(at)}.`,
      );
    }
  }

  async function editTodo(todo: TodoDTO, input: { title: string; date: string; time: string | null }) {
    const updated = await data.editTodo(todo, input);
    notify(
      updated.scheduledTime
        ? `"${updated.title}" dijadwalkan ${formatDay(new Date(updated.scheduledTime))} pukul ${formatTime(updated.scheduledTime)}.`
        : `"${updated.title}" disimpan di tab Tanpa jam.`,
    );
    return updated;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_0%,#eef3f6_0%,#dfe7ed_100%)] p-2 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-[1240px] rounded-[30px] bg-malam p-1.5 shadow-[0_40px_80px_-40px_rgba(12,29,50,0.55)] sm:rounded-[38px] sm:p-2.5">
        {/* Baris tab map: satu tab per hari */}
        <div className="flex items-end gap-2">
          <div role="tablist" aria-label="Hari" className="scrollbar-none flex min-w-0 flex-1 items-end gap-1 overflow-x-auto pr-2">
            {tabs.map((tab) => (
              <DayTabButton
                key={tab.key}
                tab={tab}
                active={tab === active}
                onSelect={() => {
                  setSelectedKey(tab.key);
                  setFilter("semua");
                }}
              />
            ))}
            {!now && <span className="folder-tab h-[4.25rem] w-56" aria-hidden />}
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 self-center pr-1 md:flex">
            <span className="max-w-44 truncate rounded-full bg-malam-2 px-3.5 py-2 text-[13px] font-semibold text-kabut" title={user.email}>
              {user.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-kertas px-3.5 text-[13px] font-semibold text-malam transition-colors hover:bg-kabut"
            >
              <LogOut size={14} aria-hidden />
              Keluar
            </button>
          </div>
        </div>

        {/* Panel isi tab aktif */}
        <div
          role="tabpanel"
          aria-label={active?.label}
          className={`relative rounded-[24px] bg-panel sm:rounded-[30px] ${activeIndex === 0 ? "rounded-tl-none sm:rounded-tl-none" : ""}`}
        >
          {active ? (
            <TabContent
              key={active.key}
              tab={active}
              user={user}
              files={files}
              now={now}
              filter={filter}
              onFilter={setFilter}
              onToggleDone={data.toggleDone}
              onToggleReminder={toggleReminder}
              onDelete={data.deleteTodo}
              onAttach={data.attachFile}
              onEdit={editTodo}
              onLogout={logout}
              onAdd={data.addTodo}
              onAdded={(todo) => {
                // Pindah ke tab hari tugas baru supaya langsung terlihat
                setSelectedKey(todo.scheduledTime ? dayKey(new Date(todo.scheduledTime)) : "tanpa-jam");
                setFilter("semua");
                notify(`"${todo.title}" ditambahkan.`);
              }}
            />
          ) : (
            <div className="h-[70vh]" aria-hidden />
          )}

          <FileDock files={files} todos={todos} onDelete={data.deleteFile} />
        </div>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
        {toast && (
          <p className="pointer-events-auto max-w-md rounded-2xl bg-malam px-4 py-3 text-sm text-kertas shadow-lg">{toast}</p>
        )}
      </div>
    </div>
  );
}

function DayTabButton({ tab, active, onSelect }: { tab: DayTab; active: boolean; onSelect: () => void }) {
  const stats = tabStats(tab.items);
  if (active) {
    return (
      <button type="button" role="tab" aria-selected className="folder-tab flex shrink-0 items-center gap-3 py-3 pl-3 pr-7 text-left sm:pr-9">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
          <LogoMark />
        </span>
        <span>
          <span className={`block text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[26px] ${tab.tone === "late" ? "text-bahaya" : ""}`}>
            {tab.label}
          </span>
          <span className="block whitespace-nowrap text-[12.5px] text-redup">{tab.caption}</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      role="tab"
      aria-selected={false}
      onClick={onSelect}
      className="flex h-11 shrink-0 items-center gap-2 rounded-t-[16px] bg-malam-2 px-4 text-[13px] font-semibold text-kabut transition-colors hover:bg-malam-3 hover:text-kertas"
    >
      {tab.tone === "late" && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#ff8a7a]" />}
      {tab.label}
      <span className="tabular rounded-full bg-malam px-1.5 py-0.5 text-[11px] text-kabut">
        {stats.done}/{stats.total}
      </span>
    </button>
  );
}

type ContentProps = {
  tab: DayTab;
  user: Props["user"];
  files: ShelfFileDTO[];
  now: Date | null;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onToggleDone: (todo: TodoDTO) => void;
  onToggleReminder: (todo: TodoDTO) => void;
  onDelete: (todo: TodoDTO) => void;
  onAttach: (fileId: string, todoId: string | null) => void;
  onEdit: (todo: TodoDTO, input: { title: string; date: string; time: string | null }) => Promise<TodoDTO>;
  onLogout: () => void;
  onAdd: (input: NewTodoInput) => Promise<TodoDTO>;
  onAdded: (todo: TodoDTO) => void;
};

function TabContent({ tab, user, files, now, filter, onFilter, onLogout, onAdd, onAdded, ...actions }: ContentProps) {
  const [adding, setAdding] = useState(false);
  // Tanggal bawaan formulir: tanggal tab ini, atau hari ini untuk tab Terlewat / Tanpa jam / Riwayat
  const defaultDate = /^\d{4}-\d{2}-\d{2}$/.test(tab.key) ? tab.key : now ? dayKey(now) : "";
  const stats = tabStats(tab.items);
  const next = tab.items.find((t) => t.status !== "completed");
  const visible = filter === "semua" ? tab.items : tab.items.filter((t) => t.status === filter);
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const filters: [Filter, string, number][] = [
    ["semua", "Semua", stats.total],
    ["pending", "Menunggu", stats.pending],
    ["acc", "Sedang dikerjakan", stats.acc],
    ["completed", "Selesai", stats.done],
  ];

  return (
    <div className="px-3 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8">
      {/* Ringkasan: identitas dan metrik tab ini */}
      <section aria-label="Ringkasan" className="flex flex-wrap items-stretch gap-x-10 gap-y-5">
        <div className="flex min-w-[15rem] items-center gap-3 rounded-[22px] bg-white p-3 pr-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-arus text-lg font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] text-redup">{user.workspaceName}</span>
            <span className="block truncate text-[17px] font-bold leading-tight">{user.name}</span>
            <button
              type="button"
              onClick={onLogout}
              className="mt-0.5 text-[12px] font-semibold text-arus-deep underline-offset-2 hover:underline md:hidden"
            >
              Keluar
            </button>
          </span>
        </div>

        <Metric label="Fokus berikutnya" wide>
          {next ? (
            <>
              <span className="block truncate text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">{next.title}</span>
              <span className="tabular text-[13px] text-redup">
                {next.scheduledTime ? `Jadwal ${formatTime(next.scheduledTime)}` : "Belum diberi jam"}
              </span>
            </>
          ) : (
            <span className="block text-[22px] font-semibold leading-tight sm:text-[26px]">
              {stats.total ? "Semua tuntas" : "Belum ada tugas"}
            </span>
          )}
        </Metric>
        <Metric label="Selesai">
          <Big value={stats.done} unit={`/${stats.total}`} />
        </Metric>
        <Metric label="Dikerjakan">
          <Big value={stats.acc} unit="tugas" />
        </Metric>
        <Metric label="Menunggu">
          <Big value={stats.pending} unit="tugas" />
        </Metric>
        <Metric label="Reminder aktif">
          <Big value={stats.reminders} unit="di Notch" />
        </Metric>
      </section>

      {/* Saring status */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-redup">
          <SlidersHorizontal size={16} />
        </span>
        <div role="group" aria-label="Saring status" className="flex flex-wrap gap-1.5">
          {filters.map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => onFilter(id)}
              className={`h-10 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                filter === id
                  ? "bg-white text-malam shadow-[0_1px_2px_rgba(12,29,50,0.08)]"
                  : "bg-kertas/40 text-redup hover:bg-kertas/80 hover:text-malam"
              }`}
            >
              {label} <span className="tabular opacity-55">{n}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-malam px-4 text-[13px] font-semibold text-kertas transition-colors hover:bg-malam-3"
        >
          <Plus size={16} aria-hidden />
          Tambah tugas
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div>
          {adding && (
            <AddTaskCard
              defaultDate={defaultDate}
              onAdd={onAdd}
              onCancel={() => setAdding(false)}
              onDone={(todo) => {
                setAdding(false);
                onAdded(todo);
              }}
            />
          )}
          {visible.length ? (
            <TaskTimeline
              items={visible}
              shelfFiles={files}
              mixedDates={tab.mixedDates}
              now={tab.isToday && filter === "semua" ? now : null}
              {...actions}
            />
          ) : (
            <EmptyTab tab={tab} filtered={filter !== "semua"} />
          )}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-6">
          <AchievementCard tab={tab} />
          <div className="rounded-[22px] bg-white/60 p-4 text-[13px] leading-relaxed text-redup">
            <p className="font-semibold text-malam">Menambah tugas lewat Notch</p>
            <p className="mt-1">
              Tekan <Kbd>Alt</Kbd> <Kbd>Space</Kbd> di mana saja, ketik rencanamu, dan tugas baru muncul di tab hari
              yang sesuai.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col justify-center ${wide ? "max-w-[22rem] flex-1 basis-56" : ""}`}>
      <span className="text-[12px] text-redup">{label}</span>
      {children}
    </div>
  );
}

function Big({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="tabular text-[26px] font-semibold leading-tight tracking-tight">
      {value}
      <span className="ml-1 text-[13px] font-medium text-redup">{unit}</span>
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md bg-white px-1.5 py-0.5 font-sans text-[11.5px] font-semibold text-malam">{children}</kbd>;
}

function EmptyTab({ tab, filtered }: { tab: DayTab; filtered: boolean }) {
  return (
    <div className="rounded-[22px] border-[1.5px] border-dashed border-kabut-deep px-6 py-10">
      <p className="text-lg font-bold tracking-tight">
        {filtered ? "Tidak ada tugas dengan status ini" : `Belum ada tugas untuk ${tab.label.toLowerCase()}`}
      </p>
      {!filtered && (
        <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-redup">
          Buka Notch di atas layar dengan <Kbd>Alt</Kbd> <Kbd>Space</Kbd>, taruh file referensi di rak, lalu ketik
          rencanamu. AI menyusunnya menjadi tugas berjam di sini.
        </p>
      )}
    </div>
  );
}

/** Cincin ketercapaian: porsi selesai, sedang dikerjakan, dan menunggu dalam tab ini */
function AchievementCard({ tab }: { tab: DayTab }) {
  const stats = tabStats(tab.items);
  const r = 52;
  const c = 2 * Math.PI * r;
  const segments = [
    { value: stats.done, color: "var(--color-arus)", label: "Selesai" },
    { value: stats.acc, color: "var(--color-acc)", label: "Dikerjakan" },
    { value: stats.pending, color: "var(--color-kabut-deep)", label: "Menunggu" },
  ];
  const arcs = segments.reduce<{ start: number; len: number; color: string; label: string }[]>((acc, s) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    return [...acc, { start, len: stats.total ? (s.value / stats.total) * c : 0, color: s.color, label: s.label }];
  }, []);

  return (
    <section aria-label="Ketercapaian" className="rounded-[22px] bg-white p-5">
      <h2 className="text-[17px] font-semibold tracking-tight">Ketercapaian</h2>
      <p className="text-[12.5px] text-redup">{tab.caption}</p>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-panel)" strokeWidth="14" />
            {arcs
              .filter((a) => a.len > 0)
              .map((a) => (
                <circle
                  key={a.label}
                  cx="64"
                  cy="64"
                  r={r}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="14"
                  strokeDasharray={`${Math.max(0, a.len - (a.len < c ? 3 : 0))} ${c}`}
                  strokeDashoffset={-a.start}
                  className="transition-[stroke-dasharray,stroke-dashoffset] duration-500"
                />
              ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-[28px] font-bold leading-none tracking-tight">{stats.percent}%</span>
            <span className="mt-1 text-[11.5px] text-redup">tercapai</span>
          </span>
        </div>
        <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-redup">{s.label}</span>
              <span className="tabular ml-auto pl-2 font-semibold">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Dock gelap di bawah panel: cermin rak file Notch. File bisa ditarik ke kartu tugas. */
function FileDock({ files, todos, onDelete }: { files: ShelfFileDTO[]; todos: TodoDTO[]; onDelete: (id: string) => void }) {
  return (
    <div className="pointer-events-none sticky bottom-3 z-20 -mt-[4.5rem] flex justify-center px-2 pb-3 sm:bottom-5">
      <section
        aria-label="Rak file Notch"
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-malam p-1.5 text-kertas shadow-[0_18px_40px_-16px_rgba(12,29,50,0.7)]"
      >
        <span className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-malam-2 pl-3 pr-3 text-[13px] font-semibold">
          <Paperclip size={15} aria-hidden className="text-kabut" />
          <span className="hidden sm:inline">Rak Notch</span>
          <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-arus px-1 text-[11px]">
            {files.length}
          </span>
        </span>
        {files.length ? (
          <ul className="scrollbar-none flex min-w-0 gap-1.5 overflow-x-auto">
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
                  title={owner ? `${file.fileName}, di tugas: ${owner.title}` : `${file.fileName}, tarik ke kartu tugas`}
                  className="flex h-10 shrink-0 cursor-grab items-center gap-2 rounded-full bg-malam-3/70 pl-3 pr-1 text-[12.5px] active:cursor-grabbing"
                >
                  <FileTypeIcon mime={file.mimeType} size={14} className="text-arus brightness-150" />
                  <a href={file.filePath} target="_blank" rel="noreferrer" className="max-w-36 truncate font-medium hover:underline">
                    {file.fileName}
                  </a>
                  <span className="tabular whitespace-nowrap text-[11px] text-kabut">
                    {owner ? "tertempel" : remainingLabel(file.expiresAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    aria-label={`Hapus ${file.fileName} dari rak`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-kabut hover:bg-malam-2 hover:text-kertas"
                  >
                    <X size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="pr-4 text-[12.5px] text-kabut">Kosong. Taruh file lewat Notch di atas layar.</span>
        )}
      </section>
    </div>
  );
}
