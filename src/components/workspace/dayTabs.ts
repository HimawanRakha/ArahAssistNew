import { dayKey } from "@/lib/client";
import type { TodoDTO } from "@/lib/types";

export type DayTab = {
  key: string;
  /** Label pendek di tab map */
  label: string;
  /** Tanggal lengkap di bawah label saat tab aktif */
  caption: string;
  tone?: "late";
  /** Tab berisi tugas dari beberapa tanggal, tampilkan tanggal di setiap baris */
  mixedDates?: boolean;
  isToday?: boolean;
  items: TodoDTO[];
};

const longDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short" });

/**
 * Satu tab per hari yang punya tugas, ditambah Hari ini (selalu ada), Terlewat (tugas hari lalu yang belum selesai),
 * Tanpa jam, dan Riwayat (tugas hari lalu yang sudah selesai).
 */
export function buildDayTabs(todos: TodoDTO[], now: Date): DayTab[] {
  const today = dayKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = dayKey(tomorrowDate);

  const late: TodoDTO[] = [];
  const history: TodoDTO[] = [];
  const noTime: TodoDTO[] = [];
  const byDay = new Map<string, TodoDTO[]>([[today, []]]);

  for (const todo of todos) {
    if (!todo.scheduledTime) {
      noTime.push(todo);
      continue;
    }
    const key = dayKey(new Date(todo.scheduledTime));
    if (key < today) {
      (todo.status === "completed" ? history : late).push(todo);
    } else {
      byDay.set(key, [...(byDay.get(key) ?? []), todo]);
    }
  }

  const tabs: DayTab[] = [];
  if (late.length) {
    tabs.push({ key: "terlewat", label: "Terlewat", caption: "Belum selesai dari hari sebelumnya", tone: "late", mixedDates: true, items: late });
  }
  for (const [key, items] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const date = key === today ? now : new Date(items[0].scheduledTime!);
    const label = key === today ? "Hari ini" : key === tomorrow ? "Besok" : capitalize(shortDate.format(date));
    tabs.push({ key, label, caption: capitalize(longDate.format(date)), isToday: key === today, items });
  }
  if (noTime.length) {
    tabs.push({ key: "tanpa-jam", label: "Tanpa jam", caption: "Tugas yang belum diberi jam", items: noTime });
  }
  if (history.length) {
    tabs.push({ key: "riwayat", label: "Riwayat", caption: "Sudah selesai di hari sebelumnya", mixedDates: true, items: history });
  }
  return tabs;
}

export function tabStats(items: TodoDTO[]) {
  const done = items.filter((t) => t.status === "completed").length;
  const acc = items.filter((t) => t.status === "acc").length;
  const pending = items.length - done - acc;
  const reminders = items.filter((t) => t.reminder?.isEnabled && t.status !== "completed").length;
  return {
    total: items.length,
    done,
    acc,
    pending,
    reminders,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
