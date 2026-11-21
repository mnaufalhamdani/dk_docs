// Pemformat teks markdown untuk prompt blueprint (template D). Fungsi murni.

import { atribut, kelompokkan, formatMenu, formatHalaman } from '@/modules/prompt/prompt.dokumen';

/** Teks tidak ada isi: ditampilkan sebagai penanda kosong agar placeholder tidak hilang begitu saja. */
const KOSONG = '(tidak ada)';

/** Menjorokkan baris lanjutan poin bertingkat agar rapi di bawah nomornya. */
function indentLanjutan(isi, awalan) {
  return isi.split('\n').map((b, i) => (i === 0 ? b : `${' '.repeat(awalan.length)}${b}`)).join('\n');
}

/** Seluruh poin blueprint (sudah dirapikan) bernomor, sebagai konteks. */
export function formatBlueprintLengkap(poin) {
  return poin
    .map((p) => {
      const awalan = `${p.nomor}. `;
      return `${awalan}${indentLanjutan(p.isi, awalan)}`;
    })
    .join('\n');
}

/** Poin yang dikerjakan di prompt ini, lengkap dengan modul terkaitnya bila ada. */
export function formatPoinDitugaskan(poin) {
  return poin
    .map((p) => {
      const awalan = `Poin ${p.nomor}: `;
      const terkait = p.terkait.length ? `\n  (terkait modul: ${p.terkait.join(', ')}; hanya konteks)` : '';
      return `${awalan}${indentLanjutan(p.isi, awalan)}${terkait}`;
    })
    .join('\n');
}

/** Poin kelompok lain yang menyentuh modul ini sebagai konteks (tidak dikerjakan di sini). */
export function formatPoinTerkait(daftar) {
  if (daftar.length === 0) return KOSONG;
  return daftar.map((p) => `- Poin ${p.nomor} (dikerjakan di prompt ${p.urutan}, modul ${p.modul}): ${p.isi.replace(/\s+/g, ' ')}`).join('\n');
}

/** Jalur berkas laporan dari kelompok-kelompok yang dikerjakan sebelumnya. */
export function formatJalurLaporan(sebelumnya, kodeRepo) {
  if (sebelumnya.length === 0) return 'tidak ada';
  return sebelumnya.map((k) => `- Prompt ${k.urutan} (${k.nama_modul}): doc-generated/blueprint_${kodeRepo}_${k.unique_id}.md`).join('\n');
}

/** Apakah modul punya dokumentasi (bukan stub dan minimal satu poin di halamannya). */
function modulTerdokumentasi(modul, menuModul, halamanPerMenu, poinPerHalaman) {
  if (modul.is_stub) return false;
  return menuModul.some((mn) => (halamanPerMenu.get(mn.id) ?? []).some((h) => (poinPerHalaman.get(h.id) ?? []).length > 0));
}

/** Judul menu dan halamannya saja (tanpa isi). */
function barisJudulMenu(menu, halaman) {
  const nama = halaman.map((h) => h.nama).join(', ');
  return `- ${menu.nama}${menu.route ? ` [${menu.route}]` : ''}${nama ? `: ${nama}` : ''}`;
}

/** Bagian dokumentasi lengkap untuk modul pemilik: hanya menu/halaman relevan, sisanya dikembalikan sebagai judul. */
function dokumentasiPemilik(modul, ctx) {
  const menuModul = ctx.menuPerModul.get(modul.id) ?? [];
  const judulLain = [];
  const baris = [`### Modul: ${modul.nama}${atribut([['id_modul', modul.kode]])}`];
  if (modul.path_kode) baris.push(`- path_kode: ${modul.path_kode}`);
  if (modul.ringkasan) baris.push(`- ringkasan: ${modul.ringkasan}`);

  // modul belum didokumentasikan: jangan menebak, arahkan agen membaca kode
  if (!modulTerdokumentasi(modul, menuModul, ctx.halamanPerMenu, ctx.poinPerHalaman)) {
    baris.push('- Belum ada dokumentasi, baca langsung dari kode.');
    for (const mn of menuModul) judulLain.push(barisJudulMenu(mn, ctx.halamanPerMenu.get(mn.id) ?? []));
    return { baris, judulLain };
  }

  let adaRelevan = false;
  for (const mn of menuModul) {
    const halamanMenu = ctx.halamanPerMenu.get(mn.id) ?? [];
    const menuDisebut = ctx.menuIds.has(mn.id);
    const halamanDisebut = halamanMenu.filter((h) => ctx.halamanIds.has(h.id));
    // menu tidak disebut sama sekali: cukup judulnya
    if (!menuDisebut && halamanDisebut.length === 0) {
      judulLain.push(barisJudulMenu(mn, halamanMenu));
      continue;
    }
    adaRelevan = true;
    // menu disebut utuh: semua halaman; kalau hanya halaman tertentu yang disebut: halaman itu saja
    baris.push(...formatMenu(mn, menuDisebut ? halamanMenu : halamanDisebut, ctx.poinPerHalaman));
  }
  if (!adaRelevan) baris.push('- (Tidak ada menu/halaman spesifik yang cocok dengan poin. Lihat daftar judul di bawah dan baca kode terkait.)');
  return { baris, judulLain };
}

/** Ringkasan singkat modul terkait (hanya konteks). */
function ringkasanTerkait(modul, ctx) {
  const menuModul = ctx.menuPerModul.get(modul.id) ?? [];
  const terdokumentasi = modulTerdokumentasi(modul, menuModul, ctx.halamanPerMenu, ctx.poinPerHalaman);
  const menu = menuModul.map((m) => m.nama).join(', ');
  return [
    `- ${modul.nama}${atribut([['id_modul', modul.kode]])}${modul.ringkasan ? `: ${modul.ringkasan}` : ''}`,
    menu ? `  - menu: ${menu}` : null,
    terdokumentasi ? null : '  - Belum ada dokumentasi, baca langsung dari kode.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Dokumentasi referensi satu kelompok.
 * Mengembalikan { relevan, lain }: `relevan` untuk "{{dokumentasi_relevan}}" (modul pemilik lengkap + modul terkait ringkas),
 * `lain` untuk "{{judul_menu_dan_halaman_lain}}" (judul menu/halaman lain di modul pemilik).
 */
export function formatDokumentasiRelevan(data, { pemilikId, terkaitIds, menuIds, halamanIds }) {
  const ctx = {
    menuPerModul: kelompokkan(data.menu, 'modul_id'),
    halamanPerMenu: kelompokkan(data.halaman, 'menu_id'),
    poinPerHalaman: kelompokkan(data.poin, 'halaman_id'),
    menuIds: new Set(menuIds),
    halamanIds: new Set(halamanIds),
  };
  const pemilik = data.modul.find((m) => m.id === pemilikId);
  const bagian = [];
  let judulLain = [];
  if (pemilik) {
    const hasil = dokumentasiPemilik(pemilik, ctx);
    bagian.push(hasil.baris.join('\n'));
    judulLain = hasil.judulLain;
  }
  const terkait = data.modul.filter((m) => terkaitIds.includes(m.id) && m.id !== pemilikId);
  if (terkait.length) bagian.push(`### Modul terkait (hanya ringkasan)\n${terkait.map((m) => ringkasanTerkait(m, ctx)).join('\n')}`);

  return {
    relevan: bagian.length ? bagian.join('\n\n') : '(Tidak ada modul yang terkait.)',
    lain: judulLain.length ? `### Menu dan halaman lain di modul ini (hanya judul)\n${judulLain.join('\n')}` : '',
  };
}

export { formatHalaman };
