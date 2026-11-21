// Pemformat teks untuk prompt Uji CR (template uji_cr). Fungsi murni, tanpa akses database.

import { TOOLS_UJI, PROFIL_UJI_PLATFORM } from '@/enums';
import { atribut, kelompokkan, formatMenu } from '@/modules/prompt/prompt.dokumen';

/** Teks pengganti bila sebuah bagian tidak punya isi, agar placeholder tidak hilang begitu saja. */
const KOSONG = '(Tidak ada.)';

/** Nama tampil target: "Modul" atau "Modul / Menu". */
export function labelTargetUji(t) {
  return t.menu_nama ? `${t.modul_nama} / ${t.menu_nama}` : t.modul_nama;
}

/** Jenis pengujian (kunci TOOLS_UJI) yang relevan untuk sebuah platform repo. */
export function jenisUjiPlatform(platform) {
  return PROFIL_UJI_PLATFORM[platform] ?? PROFIL_UJI_PLATFORM.lainnya;
}

/** Daftar tools umum untuk platform repo, satu butir per jenis pengujian. */
export function formatToolsPlatform(platform) {
  return jenisUjiPlatform(platform)
    .map((kunci) => `- ${TOOLS_UJI[kunci].nama}: ${TOOLS_UJI[kunci].tools}. Contoh test executor: ${TOOLS_UJI[kunci].executor}.`)
    .join('\n');
}

/**
 * Poin yang ditugaskan pada satu repo, lengkap dengan target modul/menu-nya.
 * Isi poin bisa berbaris banyak (sub-butir), jadi baris lanjutan diberi indentasi.
 */
export function formatPoinDitugaskan(poin) {
  // tidak ada poin untuk repo ini: seharusnya tidak terjadi, tetapi jangan biarkan bagian kosong
  if (poin.length === 0) return KOSONG;
  return poin
    .map((p) => {
      const isi = p.isi.split('\n').map((b, i) => (i === 0 ? b : `  ${b}`)).join('\n');
      return `- Poin ${p.nomor}: ${isi}\n  - target: ${p.target.map(labelTargetUji).join('; ')}`;
    })
    .join('\n');
}

/** Langkah mengambil commit ber-CR ID di branch repo. */
export function formatBlokCommit(crId, branch) {
  return `Ambil commit ber-CR ID di branch ${branch}: \`git log ${branch} --grep="${crId}" --format="%H %s"\``;
}

/** Satu baris ringkas sebuah menu beserta kode halamannya. */
function barisMenuRingkas(mn, halamanMenu) {
  const halaman = halamanMenu.map((h) => h.kode).join(', ');
  return `- Menu: ${mn.nama}${atribut([['id_menu', mn.kode], ['route', mn.route]])}${halaman ? ` [halaman: ${halaman}]` : ''}`;
}

/** Dokumentasi satu modul: menu terpilih lengkap, menu lain ringkas (target modul saja = semua menu ringkas). */
function formatModulReferensi(m, ctx, menuTerpilih) {
  const baris = [`### Modul: ${m.nama}${atribut([['id_modul', m.kode]])}`];
  if (m.ringkasan) baris.push(`- ringkasan: ${m.ringkasan}`);
  for (const mn of ctx.menuPerModul.get(m.id) ?? []) {
    const halamanMenu = ctx.halamanPerMenu.get(mn.id) ?? [];
    // menu dipilih sebagai target: sertakan dokumentasi lengkap; selain itu cukup ringkas
    if (menuTerpilih.has(mn.id)) baris.push(...formatMenu(mn, halamanMenu, ctx.poinPerHalaman));
    else baris.push(barisMenuRingkas(mn, halamanMenu));
  }
  return baris;
}

/**
 * Dokumentasi referensi untuk target pada satu repo. `data` = { modul, menu, halaman, poin };
 * `target` = [{ modul_id, menu_id }]. Penanda id poin dibuang karena prompt uji tidak mengubah dokumentasi.
 */
export function formatDokumentasiReferensi(data, target) {
  const modulIds = new Set(target.map((t) => t.modul_id));
  const menuTerpilih = new Set(target.filter((t) => t.menu_id).map((t) => t.menu_id));
  const ctx = {
    menuPerModul: kelompokkan(data.menu, 'modul_id'),
    halamanPerMenu: kelompokkan(data.halaman, 'menu_id'),
    poinPerHalaman: kelompokkan(data.poin.map((p) => ({ ...p, id: null })), 'halaman_id'),
  };
  const baris = [];
  for (const m of data.modul.filter((x) => modulIds.has(x.id))) baris.push(...formatModulReferensi(m, ctx, menuTerpilih), '');
  // modul target belum terdaftar di registry: agen perlu membaca dari kode
  return baris.length ? baris.join('\n').trim() : '(Belum ada dokumentasi terdaftar untuk target ini. Tentukan dari kode.)';
}

/** Panjang maksimal kutipan hasil aktual/catatan putaran sebelumnya di prompt lanjutan. */
const MAKS_KUTIPAN = 300;

/** Meringkas teks multibaris menjadi satu baris pendek untuk dikutip di prompt. */
function kutip(teks) {
  const satuBaris = (teks ?? '').replace(/\s+/g, ' ').trim();
  return satuBaris.length > MAKS_KUTIPAN ? `${satuBaris.slice(0, MAKS_KUTIPAN)}...` : satuBaris;
}

/** Langkah mengambil commit untuk putaran lanjutan: hanya commit ber-CR ID sejak HEAD putaran sebelumnya. */
export function formatBlokCommitLanjutan(crId, branch, hashSebelumnya) {
  return `Ambil hanya commit ber-CR ID yang baru sejak putaran sebelumnya (HEAD saat itu: ${hashSebelumnya}): \`git log ${hashSebelumnya}..${branch} --grep="${crId}" --format="%H %s"\``;
}

/** Butir hasil sebelumnya untuk satu poin: skenario yang belum lulus beserta alasannya, dan yang sudah lulus. */
function butirHasilSebelumnya(sel) {
  // poin baru atau belum pernah berhasil diimpor: tidak ada hasil untuk dikutip
  if (sel.skenario.length === 0) return [`- Poin ${sel.poin_nomor}: ${sel.baru ? 'poin baru, belum pernah diuji.' : 'belum ada hasil pada putaran sebelumnya.'}`];
  const baris = [`- Poin ${sel.poin_nomor} (status terakhir: ${sel.status})`];
  for (const s of sel.skenario.filter((x) => x.status !== 'PASS')) {
    const alasan = [s.hasil_aktual && `aktual: ${kutip(s.hasil_aktual)}`, s.catatan && `catatan: ${kutip(s.catatan)}`].filter(Boolean).join('; ');
    baris.push(`  - ${s.kode} [${s.status}] ${s.nama}${alasan ? ` (${alasan})` : ''}`);
  }
  const lulus = sel.skenario.filter((x) => x.status === 'PASS').map((x) => x.kode);
  if (lulus.length > 0) baris.push(`  - sudah lulus sebelumnya: ${lulus.join(', ')}`);
  return baris;
}

/**
 * Blok "putaran lanjutan" untuk satu repo: hasil putaran sebelumnya pada sel yang diuji ulang,
 * HEAD putaran sebelumnya, dan penegasan bahwa hanya poin yang ditugaskan yang diuji.
 * `sel` = [{ poin_nomor, baru, status, skenario: [{ kode, nama, status, hasil_aktual, catatan }] }].
 */
export function formatBlokPutaranLanjutan({ nomor, hashSebelumnya, sel }) {
  const baris = [
    `## Putaran lanjutan (putaran ${nomor})`,
    'Ini uji ulang. Hanya poin yang ditugaskan di atas yang diuji; poin lain tidak perlu diuji ulang.',
    `HEAD pada putaran sebelumnya: ${hashSebelumnya ? `\`${hashSebelumnya}\`` : 'tidak tercatat (ambil semua commit ber-CR ID)'}.`,
    'Nomor poin sama dengan daftar di atas. Kode skenario boleh dipakai ulang karena putaran ini terpisah dari putaran sebelumnya.',
    '',
    '### Hasil putaran sebelumnya untuk poin yang diuji ulang',
    ...sel.flatMap(butirHasilSebelumnya),
  ];
  return baris.join('\n');
}

/**
 * Bentuk baku CR ID untuk disimpan dan dibandingkan: tanpa awalan CR atau B di depan angka
 * (mis. "CR202502030002" menjadi "202502030002"). ID yang bukan nomor (tidak diawali huruf lalu angka) dibiarkan.
 */
export function normalisasiCr(teks) {
  return String(teks ?? '').trim().replace(/^(CR|B)(?=\d)/i, '');
}

/**
 * Label CR di prompt dan PDF sesuai standar pesan commit: awalan tipe + nomor (mis. "CR202502030002").
 * `sumber` = baris perubahan lokal ({ tipe, nomor }) bila nomor itu sudah di-Sync; tanpanya dipakai awalan "CR".
 */
export function formatLabelCr(nomor, sumber = null) {
  const polos = normalisasiCr(nomor);
  // bukan nomor (mis. kode uji bebas): tampilkan apa adanya tanpa awalan
  if (!/^\d+$/.test(polos)) return polos;
  // nomor sumber sudah memuat awalan (mis. bugfix "B...") : pakai bentuk aslinya
  if (sumber && /^[A-Za-z]/.test(sumber.nomor)) return sumber.nomor;
  return `${sumber?.tipe ?? 'CR'}${polos}`;
}
