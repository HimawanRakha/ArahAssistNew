import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Download, Settings2 } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Mascot } from "@/components/Mascot";
import { NOTCH_DOWNLOAD_SIZE, NOTCH_DOWNLOAD_URL } from "@/lib/download";

const STEPS: { title: string; body: ReactNode; visual?: ReactNode }[] = [
  {
    title: "Unduh installer",
    body: (
      <>
        Klik tombol unduh untuk mendapatkan <b className="font-semibold text-malam">ArahAssist-Notch-Setup.exe</b> (
        {NOTCH_DOWNLOAD_SIZE}).
      </>
    ),
  },
  {
    title: "Jalankan file yang terunduh",
    body: "Pemasangan berjalan otomatis tanpa perlu memilih apa pun. Karena aplikasi belum bersertifikat, Windows mungkin menampilkan peringatan “Windows protected your PC”. Lanjutkan dengan:",
    visual: (
      <span className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
        <Chip>More info</Chip>
        <ArrowRight size={15} aria-hidden className="text-redup" />
        <Chip>Run anyway</Chip>
      </span>
    ),
  },
  {
    title: "Masuk sekali di Notch",
    body: "Notch muncul sebagai kapsul kecil di tengah atas layar. Arahkan kursor ke sana, klik “Masuk untuk memakai Notch”, lalu masuk dengan akun yang sama seperti di website ini.",
    visual: (
      <span aria-hidden className="mt-3 inline-flex h-9 items-center gap-2 rounded-b-[18px] bg-[#111215] pl-1.5 pr-4 text-[12.5px] font-semibold text-kertas shadow-md">
        <span className="satin-chip flex h-6 w-9 items-center justify-center rounded-full">
          <Mascot bare size={18} />
        </span>
        Masuk untuk memakai Notch
      </span>
    ),
  },
  {
    title: "Selesai, Notch menyala sendiri",
    body: "Setiap laptop dinyalakan, Notch langsung siap di tepi layar. Fitur ini bisa dimatikan kapan saja.",
    visual: (
      <span className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
        <Chip>
          <Settings2 size={14} aria-hidden /> Pengaturan Notch
        </Chip>
        <ArrowRight size={15} aria-hidden className="text-redup" />
        <Chip>Nyalakan saat Windows menyala</Chip>
      </span>
    ),
  },
];

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-malam shadow-[0_1px_2px_rgba(12,29,50,0.08)] ring-1 ring-kabut">
      {children}
    </span>
  );
}

/** Tutorial pemasangan Notch desktop beserta tombol unduh installer */
export function InstallGuide() {
  return (
    <section
      id="pasang"
      aria-labelledby="pasang-judul"
      className="mt-2 scroll-mt-3 rounded-[34px] bg-kertas px-4 py-20 sm:mt-3 sm:rounded-[48px] sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <LogoMark size={56} animated />
          <h2 id="pasang-judul" className="mt-6 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Pasang Notch di Windows
          </h2>
          <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-redup">
            Sekali pasang, Notch menyala sendiri setiap laptop dibuka dan langsung terhubung ke Workspace-mu.
          </p>
          <a
            href={NOTCH_DOWNLOAD_URL}
            className="mt-7 inline-flex h-14 items-center gap-3 rounded-full bg-arus pl-6 pr-2 text-[15px] font-bold text-white shadow-[0_18px_40px_-18px_rgba(0,90,140,0.7)] transition-transform hover:-translate-y-0.5"
          >
            <Download size={18} aria-hidden />
            Unduh untuk Windows
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <ArrowDown size={18} aria-hidden />
            </span>
          </a>
          <p className="mt-3 text-[13px] text-redup">Windows 10 dan 11, 64-bit. Ukuran {NOTCH_DOWNLOAD_SIZE}.</p>
        </div>

        <div>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-[26px] bg-panel p-5 sm:p-6">
                <span className="tabular flex h-11 w-11 items-center justify-center rounded-full bg-malam text-[15px] font-bold text-kertas">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-[18px] font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 max-w-[56ch] text-[15px] leading-relaxed text-redup">{step.body}</p>
                  {step.visual}
                </div>
              </li>
            ))}
          </ol>
          <ul className="mt-5 grid gap-2 text-[14px] leading-relaxed text-redup sm:grid-cols-2">
            <li className="rounded-[20px] border border-kabut px-4 py-3">
              <b className="font-semibold text-malam">Alt + Space</b> membuka kolom rencana dari aplikasi mana pun.
            </li>
            <li className="rounded-[20px] border border-kabut px-4 py-3">
              <b className="font-semibold text-malam">Seret Notch</b> ke tepi kiri atau kanan layar untuk memindahkannya.
            </li>
            <li className="rounded-[20px] bg-malam px-4 py-3 text-kabut sm:col-span-2">
              <b className="font-semibold text-kertas">Di HP?</b> Buka website ini, pasang ke layar utama (di iPhone: Bagikan,
              lalu Tambahkan ke Layar Utama), masuk, lalu tekan <b className="font-semibold text-kertas">Aktifkan notifikasi</b>{" "}
              di Workspace. Pengingat akan muncul sebagai notifikasi dengan tombol ACC dan Snooze.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
