import "server-only";
import { z } from "zod";

export type PlanFile = { id: string; fileName: string };

export type ExtractedTask = {
  title: string;
  /** Tanggal lokal pengguna, YYYY-MM-DD */
  date: string;
  /** Jam lokal pengguna, HH:MM, atau null jika tidak disebut */
  time: string | null;
  fileIds: string[];
};

export type ExtractResult = {
  tasks: ExtractedTask[];
  mode: "gemini" | "lokal";
  note?: string;
};

const taskSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z
        .string()
        .regex(/^\d{1,2}:\d{2}$/)
        .nullable()
        .optional(),
      fileIds: z.array(z.string()).default([]),
    }),
  ),
});

const SYSTEM_PROMPT = `Kamu adalah asisten perencanaan harian di aplikasi Arah Assist.
Tugasmu: memecah kalimat rencana pengguna (bahasa Indonesia santai) menjadi daftar tugas terpisah.

Aturan:
- Setiap aktivitas menjadi satu tugas. Judul tugas singkat, jelas, diawali kata kerja, huruf awal kapital, tanpa jam di dalam judul, tanpa kata "hari ini" dan tanpa menyebut file.
- "date" adalah tanggal lokal format YYYY-MM-DD. Default ke tanggal hari ini. "besok" = hari ini + 1, "lusa" = + 2, nama hari = tanggal terdekat ke depan.
- "time" format 24 jam HH:MM. "jam 9" = 09:00, "jam 1 siang" = 13:00, "jam 7 malam" = 19:00, "jam 4 sore" = 16:00. Jika tidak ada jam, isi null.
- "fileIds": pilih ID file dari daftar file di rak Notch yang relevan dengan tugas itu (cocokkan nama file dengan topik tugas, atau jenis file yang disebut seperti PDF/gambar). Satu file biasanya hanya untuk satu tugas yang paling relevan. Jangan mengarang ID.
- Urutkan tugas sesuai waktu.`;

export async function extractTasks(
  text: string,
  files: PlanFile[],
  today: string,
  weekday: string,
): Promise<ExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      tasks: localExtract(text, files, today),
      mode: "lokal",
      note: "GEMINI_API_KEY belum diisi, memakai pemecah rencana lokal.",
    };
  }

  try {
    const tasks = await geminiExtract(apiKey, text, files, today, weekday);
    const validIds = new Set(files.map((f) => f.id));
    return {
      mode: "gemini",
      tasks: tasks.map((t) => ({
        title: capitalize(t.title.trim()),
        date: t.date,
        time: t.time ? normalizeTime(t.time) : null,
        fileIds: t.fileIds.filter((id) => validIds.has(id)),
      })),
    };
  } catch (err) {
    console.error("[arah] Gemini gagal, memakai pemecah lokal:", err);
    return {
      tasks: localExtract(text, files, today),
      mode: "lokal",
      note: "Gemini sedang tidak bisa dihubungi, memakai pemecah rencana lokal.",
    };
  }
}

// Urutan model dicoba bergantian. Ketersediaan model Gemini bisa naik-turun (503 high demand),
// jadi satu model saja terlalu rapuh untuk demo. Bisa diganti lewat GEMINI_MODEL (pisahkan dengan koma).
const DEFAULT_MODELS = "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash";
/** Jika model yang sedang dicoba belum menjawab, model berikutnya ikut dijalankan setelah jeda ini */
const HEDGE_MS = 6_000;
const TOTAL_TIMEOUT_MS = 30_000;

async function geminiExtract(
  apiKey: string,
  text: string,
  files: PlanFile[],
  today: string,
  weekday: string,
) {
  const models = (process.env.GEMINI_MODEL || DEFAULT_MODELS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const fileList = files.length
    ? files.map((f) => `- id: ${f.id} | nama: ${f.fileName}`).join("\n")
    : "(rak kosong)";

  const prompt = `Hari ini: ${weekday}, ${today}.
File di rak Notch:
${fileList}

Rencana pengguna:
"""${text}"""`;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          tasks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                date: { type: "STRING" },
                time: { type: "STRING", nullable: true },
                fileIds: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["title", "date", "fileIds"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  });

  const callModel = (model: string) => async (signal: AbortSignal) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal,
      },
    );
    if (!res.ok) {
      throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = await res.json();
    const raw: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!raw) throw new Error(`${model}: respons kosong`);
    const tasks = taskSchema.parse(JSON.parse(raw)).tasks;
    console.info(`[arah] rencana dipecah oleh ${model}`);
    return tasks.map((t) => ({ ...t, time: t.time ?? null }));
  };

  return hedged(models.map(callModel), HEDGE_MS, TOTAL_TIMEOUT_MS);
}

/**
 * Menjalankan tugas satu per satu: tugas berikutnya dimulai segera jika yang sebelumnya gagal,
 * atau ikut berjalan paralel jika yang sebelumnya belum selesai setelah hedgeMs. Hasil sukses pertama dipakai,
 * permintaan lain dibatalkan.
 */
function hedged<T>(
  tasks: ((signal: AbortSignal) => Promise<T>)[],
  hedgeMs: number,
  totalMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const controllers: AbortController[] = [];
    const errors: unknown[] = [];
    let next = 0;
    let running = 0;
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const overall = setTimeout(
      () => finish(new AggregateError(errors, "Gemini tidak menjawab dalam batas waktu")),
      totalMs,
    );

    function finish(error: unknown, value?: T) {
      if (settled) return;
      settled = true;
      clearTimeout(overall);
      clearTimeout(hedgeTimer);
      controllers.forEach((c) => c.abort());
      if (error) reject(error);
      else resolve(value as T);
    }

    function launch() {
      clearTimeout(hedgeTimer);
      if (settled || next >= tasks.length) return;
      const controller = new AbortController();
      controllers.push(controller);
      const task = tasks[next++];
      running++;
      task(controller.signal).then(
        (value) => finish(null, value),
        (error) => {
          running--;
          errors.push(error);
          if (next < tasks.length) launch();
          else if (running === 0) finish(new AggregateError(errors, "Semua model Gemini gagal"));
        },
      );
      if (next < tasks.length) hedgeTimer = setTimeout(launch, hedgeMs);
    }

    launch();
  });
}

function normalizeTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(h, 23)).padStart(2, "0")}:${String(Math.min(m, 59)).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Pemecah rencana lokal (tanpa AI). Cukup untuk kalimat seperti
// "jam 09.00 beresin laporan, jam 13.00 rapat kelompok, terus jam 16.00 cicil desain UI".
// ---------------------------------------------------------------------------

const TIME_RE = /\b(?:jam|pukul|pkl\.?)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam)?/i;
const CONNECTORS =
  /^(?:(?:hari ini|nanti|terus|trus|lalu|kemudian|habis itu|abis itu|setelah itu|dan|sama|lanjut)\b|[,\s])+/i;

function localExtract(text: string, files: PlanFile[], today: string): ExtractedTask[] {
  const segments = text
    .split(/\n|;|,|\.(?!\d)|\b(?:terus|trus|lalu|kemudian|habis itu|abis itu|setelah itu)\b/i)
    .map((s) => s.trim())
    .filter((s) => s.replace(CONNECTORS, "").trim().length > 2);

  const tasks = segments.map((segment) => {
    let date = today;
    if (/\blusa\b/i.test(segment)) date = shiftDate(today, 2);
    else if (/\bbesok\b/i.test(segment)) date = shiftDate(today, 1);

    let time: string | null = null;
    const match = segment.match(TIME_RE);
    if (match) {
      let hour = Number(match[1]);
      const minute = Number(match[2] ?? 0);
      const part = match[3]?.toLowerCase();
      if ((part === "siang" && hour < 11) || ((part === "sore" || part === "malam") && hour < 12)) {
        hour += 12;
      }
      time = normalizeTime(`${hour}:${minute}`);
    }

    const title = segment
      .replace(TIME_RE, " ")
      .replace(/\b(?:hari ini|besok|lusa)\b/gi, " ")
      .replace(/\b(?:pakai|pake|dengan|bareng)\s+(?:file|berkas)\b.*$/i, " ")
      .replace(/\bdi notch\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(CONNECTORS, "")
      .trim();

    return { title: capitalize(title || segment), date, time, fileIds: [] as string[], segment };
  });

  // Tempelkan setiap file ke tugas dengan kecocokan kata terbanyak
  for (const file of files) {
    const tokens = fileTokens(file.fileName);
    let best = -1;
    let bestScore = 0;
    tasks.forEach((task, index) => {
      const haystack = task.segment.toLowerCase();
      const compact = haystack.replace(/\s+/g, "");
      const score = tokens.reduce((sum, token) => {
        if (new RegExp(`\\b${escapeRe(token)}\\b`).test(haystack)) return sum + 2;
        if (token.length >= 4 && compact.includes(token)) return sum + 1;
        return sum;
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (best >= 0) tasks[best].fileIds.push(file.id);
  }

  return tasks.map(({ title, date, time, fileIds }) => ({ title, date, time, fileIds }));
}

function fileTokens(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  const words = base.split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !/^\d+$/.test(w));
  const extWords: Record<string, string[]> = {
    pdf: ["pdf"],
    png: ["gambar", "png"],
    jpg: ["gambar", "foto", "jpg"],
    jpeg: ["gambar", "foto"],
    docx: ["dokumen", "word"],
    pptx: ["slide", "presentasi", "ppt"],
    xlsx: ["excel", "spreadsheet"],
  };
  return [...new Set([...words, ...(extWords[ext] ?? [])])];
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
