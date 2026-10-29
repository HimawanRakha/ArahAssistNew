import { getCurrentUser } from "@/lib/auth";
import { LandingHero, LandingRibbons } from "@/components/landing/LandingHero";
import { InstallGuide } from "@/components/landing/InstallGuide";

const FLOW = [
  {
    time: "08.50",
    title: "Taruh file sementara di Notch",
    body: "Klik Notch di atas layar, tarik Laporan_Bab3.pdf dan Desain_UI.png ke rak file. Keduanya menunggu di sana sebagai bahan kerja hari ini.",
  },
  {
    time: "08.52",
    title: "Ketik rencana seperti mengirim pesan",
    body: "“Jam 10.00 revisi laporan bab 3, jam 14.00 rapikan desain UI, jam 19.00 rapat evaluasi tim.” Tanpa formulir, tanpa kolom satu per satu.",
  },
  {
    time: "08.53",
    title: "AI menyusun To-Do List permanen",
    body: "Tiga baris tugas berjam muncul berurutan di Workspace. Laporan_Bab3.pdf tertempel di tugas pertama, Desain_UI.png di tugas kedua.",
  },
  {
    time: "10.00",
    title: "Notch mengingatkan, kamu cukup ACC",
    body: "Pengingat muncul di atas layar dengan bunyi halus. ACC mengubah status tugas jadi sedang dikerjakan, Snooze menundanya sebentar.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-kabut p-2 sm:p-3">
      <LandingHero signedIn={!!user} />
      <LandingRibbons />

      <main>
        <section id="alur" aria-labelledby="alur-judul" className="mt-2 scroll-mt-3 rounded-[34px] bg-malam text-kertas sm:mt-3 sm:rounded-[48px]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 id="alur-judul" className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
                Satu pagi bersama Arah Assist
              </h2>
              <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-kabut">Empat langkah, dari file berserakan sampai tugas yang sedang dikerjakan. Semuanya terjadi di Notch di atas layar, tanpa membuka browser.</p>
            </div>

            <ol className="relative">
              {FLOW.map((step, i) => (
                <li key={step.time} className="relative grid grid-cols-[4.25rem_2rem_1fr] pb-10 last:pb-0">
                  <span className="tabular pt-0.5 text-right text-lg font-bold text-kabut">{step.time}</span>
                  <span className="relative flex justify-center">
                    {i < FLOW.length - 1 && <span aria-hidden className="absolute bottom-[-2.5rem] top-2 w-[2px] bg-arus/60" />}
                    <span aria-hidden className={`relative mt-1.5 h-4 w-4 rounded-full border-[3px] border-arus ${i === FLOW.length - 1 ? "bg-arus" : "bg-malam"}`} />
                  </span>
                  <div className="pl-2">
                    <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-kabut">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <InstallGuide />

        <section id="peran" aria-labelledby="peran-judul" className="mt-2 scroll-mt-3 rounded-[34px] bg-kertas px-4 py-24 sm:mt-3 sm:rounded-[48px] sm:px-8">
          <div className="mx-auto max-w-6xl">
          <h2 id="peran-judul" className="max-w-[20ch] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Yang sementara di atas, yang penting tetap tinggal.
          </h2>
          <div className="mt-12 grid gap-3 md:grid-cols-2">
            <div className="rounded-[28px] bg-malam p-8 text-kertas sm:p-10">
              <span className="inline-flex h-9 w-28 items-center justify-center rounded-b-[14px] bg-kertas text-[13px] font-semibold text-malam">Notch</span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">Pusat input cepat dan rak transit</h3>
              <ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed text-kabut">
                <li>File sementara dengan masa simpan 24 jam, dibersihkan otomatis agar penyimpanan tetap ramping.</li>
                <li>Aplikasi desktop yang selalu di atas jendela lain. Buka input rencana dari aplikasi apa pun dengan Alt Space.</li>
                <li>Pengingat ACC dan Snooze yang muncul tepat di jam tugas.</li>
              </ul>
            </div>
            <div className="rounded-[28px] bg-panel p-8 sm:p-10">
              <span className="inline-flex h-9 items-center rounded-t-[14px] bg-kertas px-4 text-[13px] font-semibold">Workspace</span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">To-Do List permanen yang memanjang ke bawah</h3>
              <ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed text-redup">
                <li>Setiap tugas punya jam, lampiran file, dan status: Menunggu, Sedang dikerjakan, atau Selesai.</li>
                <li>Tidak hilang saat berganti hari sampai kamu mencentang selesai atau menghapusnya.</li>
                <li>Satu tab map per hari, lengkap dengan cincin ketercapaian dan tombol Aktifkan reminder di setiap tugas.</li>
              </ul>
            </div>
          </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-redup sm:px-8">
          <span className="font-semibold text-malam">Arah Assist</span>
          <span>Penunjuk arah produktivitas dan fokus harianmu.</span>
          <span className="sm:ml-auto">ARAH ASSIST 2026</span>
        </div>
      </footer>
    </div>
  );
}
