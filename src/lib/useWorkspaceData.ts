"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./client";
import type { ShelfFileDTO, TodoDTO } from "./types";

type Options = {
  /** Interval sinkronisasi dengan server (ms), 0 untuk mematikan. Notch desktop dan website saling memperbarui lewat ini. */
  pollMs?: number;
  onError?: (message: string) => void;
};

export type NewTodoInput = {
  title: string;
  /** Tanggal lokal YYYY-MM-DD, dipakai bila jam diisi; null berarti hari ini */
  date: string | null;
  /** Jam lokal HH:MM; null berarti tanpa jam */
  time: string | null;
  reminder: boolean;
  fileIds?: string[];
};

type ReminderBody =
  | { action: "enable" | "disable" | "acc" }
  | { action: "snooze"; minutes: 5 | 10 | 15 };

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** State To-Do dan rak file beserta semua aksinya, dipakai bersama oleh Notch desktop dan Workspace web. */
export function useWorkspaceData(
  initialTodos: TodoDTO[],
  initialFiles: ShelfFileDTO[],
  { pollMs = 15_000, onError }: Options = {},
) {
  const [todos, setTodos] = useState(initialTodos);
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fail = useCallback((err: unknown, fallback: string) => {
    onErrorRef.current?.(message(err, fallback));
  }, []);

  const replaceTodo = useCallback((todo: TodoDTO) => {
    setTodos((list) => list.map((t) => (t.id === todo.id ? todo : t)));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [t, f] = await Promise.all([
        api<{ todos: TodoDTO[] }>("/api/todos"),
        api<{ files: ShelfFileDTO[] }>("/api/files"),
      ]);
      setTodos(t.todos);
      setFiles(f.files);
    } catch {
      // Sinkronisasi latar belakang: diam saja, dicoba lagi pada interval berikutnya
    }
  }, []);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = setInterval(refresh, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, pollMs]);

  async function uploadFiles(list: File[]) {
    setUploading(true);
    try {
      const form = new FormData();
      list.forEach((f) => form.append("files", f));
      const data = await api<{ files: ShelfFileDTO[] }>("/api/files", { method: "POST", body: form });
      setFiles(data.files);
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    try {
      const data = await api<{ files: ShelfFileDTO[] }>(`/api/files/${id}`, { method: "DELETE" });
      setFiles(data.files);
      await refresh();
    } catch (err) {
      fail(err, "Gagal menghapus file.");
    }
  }

  async function attachFile(fileId: string, todoId: string | null) {
    try {
      const data = await api<{ files: ShelfFileDTO[] }>(`/api/files/${fileId}`, {
        method: "PATCH",
        json: { todoItemId: todoId },
      });
      setFiles(data.files);
      await refresh();
    } catch (err) {
      fail(err, "Gagal menempelkan file.");
    }
  }

  /** Mengembalikan ringkasan dan ID tugas yang baru dibuat. Melempar error agar Notch bisa menampilkannya. */
  async function generate(text: string): Promise<{ summary: string; createdIds: string[] }> {
    const data = await api<{
      todos: TodoDTO[];
      files: ShelfFileDTO[];
      created: string[];
      attachedFiles: number;
      note?: string;
    }>("/api/plan", { method: "POST", json: { text, tzOffset: new Date().getTimezoneOffset() } });
    setTodos(data.todos);
    setFiles(data.files);
    const parts: string[] = [];
    if (data.attachedFiles) parts.push(`${data.attachedFiles} file dari rak ditempel otomatis.`);
    if (data.note) parts.push(data.note);
    return { summary: parts.join(" "), createdIds: data.created };
  }

  /** Tambah tugas manual. Melempar error agar formulir bisa menampilkannya. */
  async function addTodo(input: NewTodoInput): Promise<TodoDTO> {
    const data = await api<{ todo: TodoDTO; todos: TodoDTO[] }>("/api/todos", {
      method: "POST",
      json: { ...input, tzOffset: new Date().getTimezoneOffset() },
    });
    setTodos(data.todos);
    if (input.fileIds?.length) {
      const f = await api<{ files: ShelfFileDTO[] }>("/api/files");
      setFiles(f.files);
    }
    return data.todo;
  }

  /** Ubah judul dan jadwal tugas. Melempar error agar formulir edit bisa menampilkannya. */
  async function editTodo(todo: TodoDTO, input: { title: string; date: string; time: string | null }) {
    const data = await api<{ todo: TodoDTO }>(`/api/todos/${todo.id}`, {
      method: "PATCH",
      json: {
        title: input.title,
        schedule: { date: input.date, time: input.time, tzOffset: new Date().getTimezoneOffset() },
      },
    });
    replaceTodo(data.todo);
    return data.todo;
  }

  async function toggleDone(todo: TodoDTO) {
    const status = todo.status === "completed" ? "pending" : "completed";
    replaceTodo({ ...todo, status });
    try {
      const data = await api<{ todo: TodoDTO }>(`/api/todos/${todo.id}`, { method: "PATCH", json: { status } });
      replaceTodo(data.todo);
    } catch (err) {
      replaceTodo(todo);
      fail(err, "Gagal memperbarui tugas.");
    }
  }

  async function reminderAction(todo: TodoDTO, body: ReminderBody) {
    try {
      const data = await api<{ todo: TodoDTO }>(`/api/todos/${todo.id}/reminder`, {
        method: "PATCH",
        json: body,
      });
      replaceTodo(data.todo);
      return data.todo;
    } catch (err) {
      fail(err, "Gagal memperbarui pengingat.");
      return null;
    }
  }

  async function acc(todoId: string) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    // Tutup notifikasi segera, lalu sinkronkan status ke server
    replaceTodo({
      ...todo,
      status: todo.status === "pending" ? "acc" : todo.status,
      reminder: todo.reminder ? { ...todo.reminder, state: "acc" } : null,
    });
    await reminderAction(todo, { action: "acc" });
  }

  async function snooze(todoId: string, minutes: 5 | 10 | 15) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    replaceTodo({
      ...todo,
      reminder: todo.reminder
        ? {
            ...todo.reminder,
            state: "snoozed",
            snoozeMinutes: minutes,
            remindAt: new Date(Date.now() + minutes * 60_000).toISOString(),
          }
        : null,
    });
    await reminderAction(todo, { action: "snooze", minutes });
  }

  async function deleteTodo(todo: TodoDTO) {
    setTodos((list) => list.filter((t) => t.id !== todo.id));
    try {
      await api(`/api/todos/${todo.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      await refresh();
      fail(err, "Gagal menghapus tugas.");
    }
  }

  return {
    todos,
    files,
    uploading,
    refresh,
    uploadFiles,
    deleteFile,
    attachFile,
    generate,
    addTodo,
    editTodo,
    toggleDone,
    reminderAction,
    acc,
    snooze,
    deleteTodo,
  };
}
