# Arah Assist

Workspace harian berbasis AI yang terdiri dari dua bagian:

- **Notch desktop**: aplikasi Electron berbentuk kapsul yang menempel di tengah atas layar dan selalu di atas aplikasi lain. Di sinilah file sementara ditaruh, rencana diketik, dan pengingat ACC / Snooze muncul.
- **Workspace web**: website Next.js untuk melihat To-Do List permanen per hari (tab berbentuk map file) beserta ketercapaiannya. Dibuka dari tombol **Buka Workspace** di Notch.

Dibuat untuk UINIC 8.0 dan LOGICODIX 2026.

## Fitur

| Fitur | Di mana | Cara pakai |
| --- | --- | --- |
| 1. Rak file sementara | Notch desktop, tab **Rak file** | Tarik file dari File Explorer ke Notch (otomatis membuka rak) atau klik area unggah. Maks 4 MB per file, terhapus otomatis setelah 24 jam. File juga tampil di dock bawah Workspace web dan bisa ditarik ke kartu tugas. |
| 2. Quick plan input | Notch desktop, tab **Rencana** | `Alt + Space` dari aplikasi mana pun (atau klik Notch, atau `Ctrl + K` saat Notch aktif). Ketik rencana dengan bahasa santai, lalu **Buat To-Do List dengan AI** (`Ctrl + Enter`). |
| 3. To-Do List permanen | Workspace web | Satu tab map per hari (Terlewat, Hari ini, Besok, ..., Tanpa jam, Riwayat). Setiap tab berisi timeline tugas, metrik, dan cincin ketercapaian. Setiap kartu punya node selesai, jam, lampiran, status, tombol **Aktifkan reminder**, dan ikon **edit** untuk mengubah judul, tanggal, dan jam (pengingat yang aktif ikut pindah ke jam baru). |
| 4. Reminder ACC / Snooze | Notch desktop, otomatis | Saat jam tugas tiba, Notch melebar dengan bunyi halus walaupun browser tertutup. **ACC** mengubah status menjadi *Sedang dikerjakan (ACC)*. **Snooze** menunda 5, 10, atau 15 menit. |

Di desktop, Notch diam sebagai kapsul kecil hitam glassy berisi maskot yang berkedip dan jam, dan membesar ke bentuk normal saat kursor diarahkan ke sana. Notch bisa **diseret** ke tepi atas, kiri, atau kanan layar (posisi tersimpan), atau dipindah lewat tab **Pengaturan** (ikon gerigi) yang juga berisi bunyi pengingat dan tombol keluar. Tab **Dashboard** menampilkan jam besar, tanggal, dan zona waktu. Tugas juga bisa ditambah **manual** tanpa AI, lewat tombol **+** di atas daftar "Hari ini" pada panel Rencana di Notch, atau tombol **Tambah tugas** di Workspace. Notch punya 4 keadaan: Idle (jam, jumlah tugas aktif, jumlah file), File Shelf, Plan Input, dan Reminder Alert.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev                  # server web + API di http://localhost:3000
```

Di terminal kedua, jalankan Notch desktop:

```bash
npm run notch
```

Di Windows PowerShell yang memblokir skrip (`npm.ps1 cannot be loaded because running scripts is disabled`), pakai `npm.cmd run dev` dan `npm.cmd run notch`.

Notch muncul sebagai kapsul kecil di tengah atas layar. Arahkan kursor ke sana untuk memunculkan bentuk normalnya (jam, jumlah tugas aktif, jumlah file), klik untuk membuka panel. Saat pertama kali, klik **Masuk untuk memakai Notch**, login atau daftar, dan Notch langsung terhubung. Jika server belum berjalan, Notch menampilkan "Server Arah Assist belum berjalan" dan tersambung sendiri begitu server hidup. Untuk keluar dari Notch, klik kanan ikon Arah Assist di system tray lalu pilih **Keluar**.

Notch memuat halaman `/notch` dari server. Untuk memakai server yang sudah di-deploy, set `ARAH_URL` sebelum menjalankan:

```bash
ARAH_URL=https://arah-assist.vercel.app npm run notch
```

### Variabel lingkungan

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya, untuk deploy | Connection string Neon Postgres (pooled). Tabel dibuat otomatis saat koneksi pertama, tanpa langkah migrasi. Jika kosong, aplikasi memakai PGlite lokal di `./.data/pglite` (khusus development). |
| `GEMINI_API_KEY` | Disarankan | API key dari https://aistudio.google.com/apikey. Jika kosong atau Gemini gagal, rencana dipecah oleh parser lokal berbasis aturan, jadi demo tetap jalan. |
| `GEMINI_MODEL` | Tidak | Daftar model dipisah koma, default `gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash`. Jika model pertama sibuk atau belum menjawab dalam 6 detik, model berikutnya ikut dicoba dan jawaban tercepat dipakai. Setelah 30 detik tanpa jawaban, rencana dipecah oleh parser lokal. |
| `AUTH_SECRET` | Ya, di production | Rahasia penanda tangan cookie sesi (string acak 32 byte). |

### Installer Windows (Notch desktop)

```bash
npm run notch:dist
```

Hasilnya `dist-desktop/ArahAssist-Notch-Setup.exe` (±110 MB). Versi installer otomatis terhubung ke `https://arah-assist.vercel.app` dan menyala sendiri setiap Windows dinyalakan (bisa dimatikan di Pengaturan Notch atau menu tray).

Unggah installer agar tombol **Unduh untuk Windows** di website berfungsi:

1. Buka repo di GitHub, lalu **Releases** → **Draft a new release**.
2. Buat tag baru (misalnya `v1.0.0`), beri judul, lalu lampirkan `dist-desktop/ArahAssist-Notch-Setup.exe` dengan nama file yang sama persis.
3. Klik **Publish release** (bukan draft atau pre-release).

Tombol unduh memakai `https://github.com/HimawanRakha/ArahAssistNew/releases/latest/download/ArahAssist-Notch-Setup.exe`, jadi selalu mengarah ke release terbaru. Bisa diganti lewat env `NEXT_PUBLIC_NOTCH_DOWNLOAD_URL`.

### Deploy ke Vercel

1. Push repo ke GitHub, lalu import di Vercel.
2. Isi `DATABASE_URL`, `GEMINI_API_KEY`, dan `AUTH_SECRET` di Project Settings > Environment Variables.
3. Deploy. File di rak Notch disimpan di Postgres (base64), jadi aman di filesystem serverless Vercel.

## Arsitektur

- **Notch desktop** (`desktop/main.cjs`): jendela Electron transparan tanpa bingkai, `alwaysOnTop`, menempel di tepi atas layar utama. Ukuran jendela mengikuti keadaan Notch (kapsul kecil saat idle, lebih besar saat panel terbuka) agar tidak menghalangi klik ke aplikasi lain. Pintasan global `Alt + Space` (cadangan `Ctrl + Alt + Space` jika sudah dipakai sistem), ikon tray, dan jendela login. Tombol **Buka Workspace** membuat tautan masuk berumur 2 menit (`/api/auth/handoff`) lalu membukanya di browser default, jadi tidak perlu login dua kali.
- Notch desktop dan Workspace web saling sinkron setiap 15 detik dan setiap kali jendela kembali difokus.

- **Next.js 16** (App Router) + Tailwind CSS 4 + Motion untuk animasi Notch.
- **Drizzle ORM** di atas Neon serverless (HTTP), skema di `src/lib/db/schema.ts` mengikuti brief: `users`, `workspaces`, `todo_items`, `notch_temp_files`, `task_reminders`.
- **Auth**: email + kata sandi (bcrypt), sesi JWT di cookie httpOnly.
- **AI**: `src/lib/ai.ts` memanggil Gemini dengan JSON schema terstruktur. Gemini menerima daftar file di rak agar bisa memilih file yang relevan untuk tiap tugas.

```
desktop/
  main.cjs                aplikasi Electron (jendela Notch, posisi & seret, tray, pintasan)
  assets/                 ikon maskot (icon.png, tray.png) hasil render src/app/icon.svg
  preload.cjs             jembatan aman ke halaman /notch
src/
  app/
    page.tsx              landing + demo Notch
    masuk/, daftar/       login & register
    workspace/            Workspace web (tab per hari)
    notch/                isi jendela Notch desktop
    api/
      auth/               register, login, logout
      plan/               kalimat rencana -> AI -> todo_items + lampiran
      todos/[id]/         status, hapus, reminder (enable/disable/acc/snooze)
      files/[id]/         unggah, unduh, tempel ke tugas, hapus
  components/
    notch/                NotchShell (animasi), Notch (4 keadaan), NotchApp
    workspace/            WorkspaceApp, TaskTimeline, dayTabs
  lib/                    db, auth, ai, helper klien
```

## Palet

| Token | Hex | Peran |
| --- | --- | --- |
| Arus | `#007AAD` | Aksi utama, garis rute |
| Kabut | `#D9E2E9` | Permukaan sekunder, garis |
| Kertas | `#FFFBFC` | Latar |
| Malam | `#0C1D32` | Teks dan badan Notch |
