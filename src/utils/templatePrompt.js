import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Folder template prompt (berkas .md dengan placeholder {{nama}}). */
const FOLDER = path.join(/* turbopackIgnore: true */ process.cwd(), 'src', 'templates', 'prompts');

/** Membaca satu berkas template; nama hanya huruf/angka/underscore agar tidak bisa keluar folder. */
async function bacaBerkas(nama) {
  // nama tidak aman (mengandung / atau ..): tolak, ini selalu kesalahan pemrogram
  if (!/^[A-Za-z0-9_]+$/.test(nama)) throw new Error(`Nama template tidak valid: ${nama}`);
  return fs.readFile(path.join(/* turbopackIgnore: true */ FOLDER, `${nama}.md`), 'utf8');
}

/**
 * Mengganti placeholder {{nama}} dalam SATU putaran: isi nilai yang disisipkan
 * tidak diproses lagi (aman bila dokumentasi memuat teks mirip placeholder).
 */
function isiPlaceholder(teks, nilai) {
  return teks.replace(/\{\{(\w+)\}\}/g, (_, kunci) => {
    // placeholder tak punya nilai: pasti salah ketik di template atau pemanggil, jangan diam-diam kosong
    if (!(kunci in nilai)) throw new Error(`Placeholder {{${kunci}}} tidak punya nilai.`);
    return String(nilai[kunci] ?? '');
  });
}

/**
 * Merender template prompt. Blok bersama `aturan_tulis`, `aturan_poin`, dan `format_json` dimuat otomatis
 * dari berkas _aturan_tulis.md, _aturan_poin.md, dan _format_json.md (format_json juga berisi placeholder).
 */
export async function renderTemplate(nama, nilai) {
  const [templat, aturan, format, aturanPoin, aturanTeknologi] = await Promise.all([
    bacaBerkas(nama),
    bacaBerkas('_aturan_tulis'),
    bacaBerkas('_format_json'),
    bacaBerkas('_aturan_poin'),
    bacaBerkas('_aturan_teknologi'),
  ]);
  const gabungan = {
    ...nilai,
    aturan_tulis: aturan.trim(),
    aturan_poin: aturanPoin.trim(),
    aturan_teknologi: aturanTeknologi.trim(),
    format_json: isiPlaceholder(format, nilai).trim(),
  };
  return isiPlaceholder(templat, gabungan);
}
