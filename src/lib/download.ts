/**
 * Tautan unduh installer Notch untuk Windows. Bawaan: aset versi terbaru di GitHub Releases repo ini
 * (unggah dist-desktop/ArahAssist-Notch-Setup.exe ke release dengan nama file yang sama).
 * Bisa diganti lewat env NEXT_PUBLIC_NOTCH_DOWNLOAD_URL.
 */
export const NOTCH_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_NOTCH_DOWNLOAD_URL ||
  "https://github.com/HimawanRakha/ArahAssistNew/releases/latest/download/ArahAssist-Notch-Setup.exe";

export const NOTCH_DOWNLOAD_SIZE = "±110 MB";
