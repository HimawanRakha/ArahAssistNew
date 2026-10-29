// Membuat installer Windows untuk Notch desktop: dist-desktop/ArahAssist-Notch-Setup.exe
//
// Isi folder desktop/ disalin ke folder sementara di luar proyek sebelum dipaketkan. Notch tidak
// memakai dependency apa pun, sedangkan electron-builder akan ikut membawa node_modules proyek web
// (Next.js, React, ...) bila dijalankan dari dalam repo ini, sehingga installer membengkak ratusan MB.
import { createRequire } from "node:module";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const builder = require("electron-builder");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electronVersion = require("electron/package.json").version;
const stage = mkdtempSync(path.join(tmpdir(), "arah-notch-"));

try {
  cpSync(path.join(root, "desktop"), stage, { recursive: true });
  const { version } = JSON.parse(readFileSync(path.join(stage, "package.json"), "utf8"));
  console.log(`[notch] membuat installer v${version} (Electron ${electronVersion})`);

  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget("nsis", builder.Arch.x64),
    projectDir: stage,
    config: {
      appId: "id.arahassist.notch",
      productName: "Arah Assist Notch",
      electronVersion,
      // Hanya paket bahasa yang dipakai dan kompresi maksimum agar installer lebih kecil
      electronLanguages: ["id", "en-US"],
      compression: "maximum",
      directories: { app: stage, output: path.join(root, "dist-desktop"), buildResources: path.join(stage, "assets") },
      win: { icon: path.join(stage, "assets", "icon.png"), artifactName: "ArahAssist-Notch-Setup.${ext}" },
      nsis: {
        oneClick: true,
        perMachine: false,
        runAfterFinish: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: "Arah Assist Notch",
      },
    },
  });
  console.log("[notch] selesai: dist-desktop/ArahAssist-Notch-Setup.exe");
} finally {
  rmSync(stage, { recursive: true, force: true });
}
