// Pemformat teks markdown untuk bagian-bagian prompt (fungsi murni, tanpa akses database).

import { DAFTAR_BAGIAN } from '@/enums';

/** Menggabungkan beberapa potongan info menjadi satu baris "(a: x, b: y)" tanpa nilai kosong. */
export function atribut(pasangan) {
  const isi = pasangan.filter(([, nilai]) => nilai).map(([k, v]) => `${k}: ${v}`);
  return isi.length ? ` (${isi.join(', ')})` : '';
}

/** Mengelompokkan array menurut kunci tertentu ke dalam Map. */
export function kelompokkan(daftar, kunci) {
  const peta = new Map();
  for (const item of daftar) peta.set(item[kunci], [...(peta.get(item[kunci]) ?? []), item]);
  return peta;
}

/**
 * Awalan penanda satu poin di prompt: "[id: ...]" bila id diketahui, "[CR ...]"/"[B ...]" untuk tiap CR/B
 * terkait, dan "[PENDING]" bila ada tautan pending. Mengembalikan teks berakhir spasi, atau '' bila tanpa penanda.
 */
function penandaPoin(p) {
  const tanda = [];
  if (p.id) tanda.push(`[id: ${p.id}]`);
  for (const x of p.tautan ?? []) tanda.push(`[${x.tipe} ${x.nomor}]`);
  // minimal satu CR/B menahan poin ini: agen diminta tidak menyentuhnya
  if ((p.tautan ?? []).some((x) => x.status === 'pending')) tanda.push('[PENDING]');
  return tanda.length ? `${tanda.join(' ')} ` : '';
}

/** Poin satu halaman, dikelompokkan per bagian sesuai urutan bagian standar. */
function formatPoin(poinHalaman) {
  const baris = [];
  for (const bagian of DAFTAR_BAGIAN) {
    const isi = poinHalaman.filter((p) => p.bagian === bagian);
    if (isi.length === 0) continue;
    baris.push(`- ${bagian}:`);
    for (const p of isi) baris.push(`  - ${penandaPoin(p)}${p.isi}`);
  }
  return baris;
}

/** Satu halaman lengkap beserta poinnya. */
export function formatHalaman(h, poinHalaman) {
  const baris = [`##### Halaman: ${h.nama}${atribut([['id_halaman', h.kode], ['jenis', h.jenis], ['route', h.route]])}`];
  if (h.file_utama.length) baris.push(`- file_utama: ${h.file_utama.join(', ')}`);
  const poin = formatPoin(poinHalaman);
  baris.push(...(poin.length ? poin : ['- (belum didokumentasikan)']));
  return baris;
}

/** Satu menu lengkap beserta halaman-halamannya. */
export function formatMenu(m, halamanMenu, poinPerHalaman) {
  const baris = [`#### Menu: ${m.nama}${atribut([['id_menu', m.kode], ['pola', m.pola], ['route', m.route]])}`];
  if (m.path_kode) baris.push(`- path_kode: ${m.path_kode}`);
  if (m.ringkasan) baris.push(`- ringkasan: ${m.ringkasan}`);
  if (halamanMenu.length === 0) baris.push('- (belum ada halaman terdaftar)');
  for (const h of halamanMenu) baris.push(...formatHalaman(h, poinPerHalaman.get(h.id) ?? []));
  return baris;
}

/**
 * Dokumentasi LENGKAP (modul -> menu -> halaman -> poin) untuk modul-modul yang ditentukan.
 * `data` = { modul, menu, halaman, poin } hasil query repo; `modulIds` = modul yang ditampilkan lengkap.
 */
export function formatDokumentasi(data, modulIds) {
  const pilihan = data.modul.filter((m) => modulIds.includes(m.id));
  // tidak ada modul terpilih: beri petunjuk agar agen membaca dari kode
  if (pilihan.length === 0) return '(Tidak ada modul terkait yang terdaftar. Tentukan modul dan menu langsung dari kode.)';

  const menuPerModul = kelompokkan(data.menu, 'modul_id');
  const halamanPerMenu = kelompokkan(data.halaman, 'menu_id');
  const poinPerHalaman = kelompokkan(data.poin, 'halaman_id');

  const baris = [];
  for (const m of pilihan) {
    baris.push(`### Modul: ${m.nama}${atribut([['id_modul', m.kode]])}`);
    if (m.path_kode) baris.push(`- path_kode: ${m.path_kode}`);
    if (m.ringkasan) baris.push(`- ringkasan: ${m.ringkasan}`);
    if (m.is_stub) baris.push('- (belum didokumentasikan)');
    for (const mn of menuPerModul.get(m.id) ?? []) baris.push(...formatMenu(mn, halamanPerMenu.get(mn.id) ?? [], poinPerHalaman));
    baris.push('');
  }
  return baris.join('\n').trim();
}

/**
 * Daftar ringkas modul/menu/halaman (hanya kode dan nama) di luar modul yang ditampilkan lengkap,
 * sebagai daftar id yang valid untuk `bergantung_pada` dan id_modul/id_menu/id_halaman.
 */
export function formatDaftarRingkas(data, modulIdsLengkap) {
  const sisa = data.modul.filter((m) => !modulIdsLengkap.includes(m.id));
  // semua modul sudah tampil lengkap: tidak ada yang perlu diringkas
  if (sisa.length === 0) return '(Tidak ada modul lain.)';

  const menuPerModul = kelompokkan(data.menu, 'modul_id');
  const halamanPerMenu = kelompokkan(data.halaman, 'menu_id');
  const baris = [];
  for (const m of sisa) {
    const menu = menuPerModul.get(m.id) ?? [];
    // modul tanpa menu: satu baris untuk modulnya saja
    if (menu.length === 0) {
      baris.push(`- ${m.kode} "${m.nama}"${m.is_stub ? ' (stub)' : ''}`);
      continue;
    }
    for (const mn of menu) {
      const halaman = (halamanPerMenu.get(mn.id) ?? []).map((h) => h.kode).join(', ');
      baris.push(`- ${m.kode} "${m.nama}" > ${mn.kode} "${mn.nama}"${mn.route ? ` [${mn.route}]` : ''}${halaman ? ` [halaman: ${halaman}]` : ''}`);
    }
  }
  return baris.join('\n');
}

/** Teknologi yang sudah tercatat di repo sebagai daftar poin, atau penjelasan bila belum ada. */
export function formatTeknologi(daftar) {
  // belum ada catatan: agent perlu tahu bahwa ini pengisian pertama
  if (!daftar || daftar.length === 0) return '(Belum ada teknologi tercatat. Ini pengisian pertama: isi `teknologi`.)';
  return daftar.map((x) => `- ${x.nama}${x.versi ? ` ${x.versi}` : ''}${x.sumber_file ? ` (${x.sumber_file})` : ''}`).join('\n');
}

/** Pesan pengerjaan dari database sumber sebagai daftar poin teks. */
export function formatPesan(pesan) {
  // belum ada pesan tersimpan: jelaskan agar agen tidak mengira ada konteks yang hilang
  if (pesan.length === 0) return '(Belum ada pesan pengerjaan tersimpan.)';
  return pesan
    .map((p) => {
      const asal = [p.modul_sumber, p.menu_sumber].filter(Boolean).join(' / ');
      return `- [${p.tanggal ?? '-'}] ${p.user_name ?? '-'}: ${p.pesan.replace(/\s+/g, ' ').trim()}${asal ? ` (modul: ${asal})` : ''}`;
    })
    .join('\n');
}

/** Info modul target untuk prompt dokumentasi baru (nama, id, path, alias, menu yang sudah terdaftar). */
export function formatModulTarget(data, modulIds, alias) {
  const menuPerModul = kelompokkan(data.menu, 'modul_id');
  return data.modul
    .filter((m) => modulIds.includes(m.id))
    .map((m) => {
      const aliasModul = alias.filter((a) => a.modul_id === m.id).map((a) => a.alias);
      const menu = (menuPerModul.get(m.id) ?? []).map((mn) => mn.kode).join(', ');
      return [
        `- ${m.nama}${atribut([['id_modul', m.kode], ['path_kode', m.path_kode]])}`,
        aliasModul.length ? `  - alias: ${aliasModul.join(', ')}` : null,
        menu ? `  - menu yang sudah terdaftar: ${menu}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}
