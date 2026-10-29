"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { Notch, type PlanRun } from "./Notch";
import type { NotchEdge, NotchMode } from "./NotchShell";
import { api, playChime, primeAudio } from "@/lib/client";
import { desktopBridge, filePicker } from "@/lib/desktop";
import { useNow } from "@/lib/useNow";
import { useWorkspaceData, type NewTodoInput } from "@/lib/useWorkspaceData";
import type { ShelfFileDTO, TodoDTO } from "@/lib/types";

/** Jeda sebelum kembali ke kapsul kecil setelah kursor pergi, agar tidak berkedip saat kursor melintas */
const HOVER_LEAVE_MS = 700;
/** Kartu hasil AI menutup sendiri setelah jeda ini bila tidak sedang disentuh */
const RESULT_CLOSE_MS = 7000;
/** Setelah jeda ini pil "Menyusun rencanamu" memberi tahu bahwa AI sedang ramai */
const SLOW_AI_MS = 8000;
/** Jarak minimal (px) sebelum tekan-geser dianggap menyeret Notch, bukan klik */
const DRAG_THRESHOLD = 6;
const SOUND_KEY = "arah-notch-sound";

type PanelMode = "idle" | "dashboard" | "shelf" | "plan" | "add" | "settings" | "working" | "result";

function readSoundPref() {
  try {
    return typeof window === "undefined" || localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

type Props = {
  user: { name: string } | null;
  initialTodos: TodoDTO[];
  initialFiles: ShelfFileDTO[];
};

/** Isi jendela Notch desktop: rak file, input rencana, dan pengingat ACC / Snooze. */
export function NotchApp({ user, initialTodos, initialFiles }: Props) {
  const data = useWorkspaceData(initialTodos, initialFiles, { pollMs: user ? 15_000 : 0 });
  const { todos } = data;
  const [mode, setMode] = useState<PanelMode>("idle");
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  // ---- Posisi Notch (atas, kiri, atau kanan layar) disimpan oleh aplikasi desktop
  const [dock, setDock] = useState<NotchEdge>("top");
  useEffect(() => {
    const bridge = desktopBridge();
    if (!bridge) return;
    bridge
      .getSettings()
      .then((settings) => setDock(settings.dock))
      .catch(() => {});
    return bridge.onDock(setDock);
  }, []);
  const [plan, setPlan] = useState<PlanRun | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  // Saat tidak disentuh Notch hanya kapsul kecil (peek); kursor di atasnya memunculkan bentuk normal
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const root = document.documentElement;
    const enter = () => {
      clearTimeout(timer);
      setHovered(true);
    };
    const leave = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setHovered(false), HOVER_LEAVE_MS);
    };
    root.addEventListener("mouseenter", enter);
    root.addEventListener("mouseleave", leave);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("mouseenter", enter);
      root.removeEventListener("mouseleave", leave);
    };
  }, []);

  // ---- Pengingat: cek setiap detik tugas yang jamnya sudah tiba
  const nowMs = useNow();
  const activeReminder = useMemo(() => {
    if (!nowMs || !user) return null;
    const due = todos.filter(
      (t) =>
        t.status !== "completed" &&
        t.reminder?.isEnabled &&
        t.reminder.state !== "acc" &&
        t.reminder.remindAt &&
        new Date(t.reminder.remindAt).getTime() <= nowMs,
    );
    return due.length ? { todo: due[0], more: due.length - 1 } : null;
  }, [todos, nowMs, user]);

  // Pengingat yang jatuh tempo selalu didahulukan: Notch melebar ke mode pengingat
  const notchMode: NotchMode = activeReminder ? "reminder" : mode !== "idle" ? mode : hovered ? "idle" : "peek";

  const reminderKey = activeReminder
    ? `${activeReminder.todo.id}:${activeReminder.todo.reminder?.remindAt}`
    : null;
  useEffect(() => {
    if (reminderKey && soundRef.current) playChime();
  }, [reminderKey]);

  // ---- Rencana: Notch mengecil ke pil "Menyusun rencanamu", lalu melebar ke kartu hasil
  async function generate(text: string) {
    setPlanError(null);
    setPlan({ status: "working", slow: false });
    setMode("working");
    const slowTimer = setTimeout(
      () => setPlan((p) => (p?.status === "working" ? { ...p, slow: true } : p)),
      SLOW_AI_MS,
    );
    try {
      const result = await data.generate(text);
      setPlan({ status: "done", ...result });
      setMode("result");
      return true;
    } catch (err) {
      setPlan(null);
      setPlanError(err instanceof Error ? err.message : "Gagal membuat daftar tugas.");
      setMode("plan");
      return false;
    } finally {
      clearTimeout(slowTimer);
    }
  }

  // ---- Tambah tugas manual: hasilnya ditampilkan di kartu hasil yang sama dengan rencana AI
  async function addTodo(input: NewTodoInput) {
    const todo = await data.addTodo(input);
    setPlan({ status: "done", summary: "Ditambahkan manual.", createdIds: [todo.id] });
    setMode("result");
  }

  useEffect(() => {
    if (mode !== "result" || hovered) return;
    const id = setTimeout(() => setMode("idle"), RESULT_CLOSE_MS);
    return () => clearTimeout(id);
  }, [mode, hovered]);

  // ---- Ukuran jendela desktop mengikuti keadaan Notch
  useEffect(() => {
    desktopBridge()?.setLevel(notchMode === "peek" || notchMode === "idle" ? notchMode : "expanded");
  }, [notchMode]);

  const openWorkspace = useCallback(async () => {
    try {
      const { url } = await api<{ url: string }>("/api/auth/handoff", { method: "POST" });
      const bridge = desktopBridge();
      if (bridge) bridge.openExternal(url);
      else window.open(url, "_blank", "noopener");
      setMode("idle");
    } catch {
      // api() sudah mengarahkan ulang jika sesi habis
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }, []);

  const login = useCallback(() => {
    const bridge = desktopBridge();
    if (bridge) bridge.openLogin();
    else window.open("/masuk?next=/notch/terhubung", "_blank", "noopener");
  }, []);

  useEffect(() => {
    primeAudio();
    const bridge = desktopBridge();
    const unsubscribe = bridge?.onCommand((command) => {
      if (command === "plan") setMode("plan");
      if (command === "open-workspace") void openWorkspace();
    });

    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode("plan");
      } else if (e.key === "Escape") {
        setMode((m) => (m === "working" ? m : "idle"));
      }
    }
    // Klik ke aplikasi lain menutup panel, kecuali saat dialog pilih file sedang terbuka
    function onBlur() {
      if (!filePicker.active) setMode((m) => (m === "working" || m === "result" ? m : "idle"));
    }
    function onFocus() {
      filePicker.end();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe?.();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [openWorkspace]);

  // ---- Menyeret Notch: selama diseret jendela mengikuti kursor, lalu menempel ke tepi terdekat
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const canDrag = notchMode === "peek" || notchMode === "idle";

  function endDrag() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.active) {
      suppressClick.current = true;
      setDragging(false);
      desktopBridge()?.dragEnd();
    }
  }

  const dragProps: HTMLAttributes<HTMLDivElement> = {
    onPointerDown(e) {
      if (!desktopBridge() || e.button !== 0 || !canDrag) return;
      dragRef.current = { x: e.screenX, y: e.screenY, active: false };
    },
    onPointerMove(e) {
      const d = dragRef.current;
      if (!d || d.active || Math.hypot(e.screenX - d.x, e.screenY - d.y) < DRAG_THRESHOLD) return;
      d.active = true;
      // Tangkap pointer baru setelah benar-benar menyeret, agar klik biasa tetap sampai ke tombol
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      desktopBridge()?.dragStart();
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onClickCapture(e) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return (
    <Notch
      user={user}
      mode={dragging ? "idle" : notchMode}
      dock={dock}
      onDockChange={(d) => {
        setDock(d);
        desktopBridge()?.setDock(d);
      }}
      dragging={dragging}
      dragProps={dragProps}
      soundOn={soundOn}
      onSoundChange={(on) => {
        setSoundOn(on);
        try {
          localStorage.setItem(SOUND_KEY, on ? "on" : "off");
        } catch {
          // penyimpanan lokal tidak tersedia: pengaturan berlaku sampai Notch dimuat ulang
        }
      }}
      onModeChange={(m) => {
        if (m === "plan") setPlanError(null);
        setMode(m === "reminder" || m === "peek" || !user ? "idle" : m);
      }}
      files={data.files}
      todos={todos}
      uploading={data.uploading}
      reminder={activeReminder}
      plan={plan}
      planError={planError}
      onUpload={data.uploadFiles}
      onDeleteFile={data.deleteFile}
      onGenerate={generate}
      onAddTodo={addTodo}
      onAcc={data.acc}
      onSnooze={data.snooze}
      onOpenWorkspace={openWorkspace}
      onLogin={login}
      onLogout={logout}
      onWake={() => setHovered(true)}
    />
  );
}
