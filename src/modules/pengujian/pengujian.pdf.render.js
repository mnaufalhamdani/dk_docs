import 'server-only';
import PDFDocument from 'pdfkit';
import { DAFTAR_KATEGORI_PERUBAHAN } from '@/enums';
import { LABEL_STATUS } from './pengujian.laporan';

// Penggambar laporan PDF Uji CR dengan pdfkit (tanpa browser headless). Urutan isi baku, A4, Bahasa Indonesia.

const KIRI = 40;
const LEBAR = 515;
const TINGGI_HALAMAN = 842;
const MARGIN_BAWAH = 50;
const TEKS = '#111827';
const REDUP = '#6b7280';
const GARIS = '#d1d5db';
const LATAR_HEAD = '#f3f4f6';
const WARNA_STATUS = { PASS: '#15803d', FAIL: '#b91c1c', BLOCKED: '#b45309', NOT_EXECUTED: '#b45309', BELUM: '#6b7280' };

/** Nama tampil kategori analisis perubahan. */
const NAMA_KATEGORI = { matches: 'Matches', supporting: 'Supporting', outside: 'Outside', risky: 'Risky' };

/** Mengganti karakter di luar jangkauan font standar PDF (Latin-1) agar tidak tampil sebagai sampah. */
function aman(teks) {
  return String(teks ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\t\n\r\x20-\x7E\u00A0-\u00FF]/g, '?');
}

/** Pindah ke halaman baru bila sisa ruang di halaman ini kurang dari `tinggi`. */
function pastikanRuang(doc, tinggi) {
  if (doc.y + tinggi > TINGGI_HALAMAN - MARGIN_BAWAH) doc.addPage();
  doc.x = KIRI;
}

/** Teks biasa satu paragraf. */
function para(doc, teks, { tebal = false, ukuran = 9, warna = TEKS, indent = 0 } = {}) {
  doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(ukuran).fillColor(warna).text(aman(teks), KIRI + indent, undefined, { width: LEBAR - indent });
  doc.x = KIRI;
}

/** Butir daftar dengan tanda "-". */
function butir(doc, teks, indent = 0) {
  para(doc, `- ${teks}`, { indent: 8 + indent });
}

/** Judul bagian bernomor, dengan garis di bawahnya. */
function judulBagian(doc, teks) {
  pastikanRuang(doc, 60);
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEKS).text(aman(teks), KIRI, undefined, { width: LEBAR });
  doc.moveTo(KIRI, doc.y + 1).lineTo(KIRI + LEBAR, doc.y + 1).strokeColor(GARIS).stroke();
  doc.moveDown(0.5);
}

/** Anak judul (tebal, ukuran sedang). */
function anakJudul(doc, teks) {
  pastikanRuang(doc, 40);
  doc.moveDown(0.3);
  para(doc, teks, { tebal: true, ukuran: 10 });
  doc.moveDown(0.1);
}

/** Satu baris berwarna: label status (tebal berwarna) diikuti teks biasa. */
function barisStatus(doc, status, teks, indent = 0) {
  pastikanRuang(doc, 16);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(WARNA_STATUS[status]).text(LABEL_STATUS[status], KIRI + indent, undefined, { continued: true, width: LEBAR - indent });
  doc.font('Helvetica').fillColor(TEKS).text(aman(`  ${teks}`), { width: LEBAR - indent });
  doc.x = KIRI;
}

/** Hitungan per status dalam satu baris berwarna, mis. "Poin:  PASS 2  FAIL 1". */
function barisHitungan(doc, judul, hitungan, urutan) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TEKS).text(`${judul}:`, KIRI, undefined, { continued: true });
  urutan.forEach((s, i) => {
    doc.font('Helvetica-Bold').fillColor(WARNA_STATUS[s]).text(`   ${LABEL_STATUS[s]} ${hitungan[s] ?? 0}`, { continued: i < urutan.length - 1 });
  });
  doc.x = KIRI;
}

// ---------- 1. judul dan metadata ----------

function bagianJudul(doc, l) {
  doc.font('Helvetica-Bold').fontSize(18).fillColor(TEKS).text('Laporan Pengujian CR', KIRI, 40, { width: LEBAR });
  para(doc, l.cr_id, { tebal: true, ukuran: 12 });
  doc.moveDown(0.3);
  para(doc, `Versi PDF: v${l.versi}    Putaran tercakup: 1 sampai ${l.putaran_tercakup}    Dibuat: ${l.tanggal}`);
  doc.moveDown(0.3);
  anakJudul(doc, 'Repo');
  if (l.repo.length === 0) para(doc, 'Belum ada repo terlibat.', { warna: REDUP });
  for (const r of l.repo) {
    // repo yang hasilnya belum diimpor belum punya branch dan hash HEAD
    butir(doc, `${r.nama} (${r.kode}) - branch ${r.branch ?? '-'} - HEAD ${r.hash_head ?? '-'}`);
  }
  doc.moveDown(0.3);
  para(doc, 'Dokumen ini adalah potret kondisi saat dibuat, bukan dokumen final, dan tidak memuat kesimpulan lulus atau gagal.', { warna: REDUP, ukuran: 8 });
}

// ---------- 2. ringkasan, 3. tools ----------

function bagianRingkasan(doc, l) {
  judulBagian(doc, '1. Ringkasan');
  barisHitungan(doc, 'Poin', l.hitungan_poin, ['PASS', 'FAIL', 'BLOCKED', 'BELUM']);
  doc.moveDown(0.3);
  barisHitungan(doc, 'Skenario (hasil terbaru)', l.hitungan_skenario, ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED']);
  doc.moveDown(0.3);
  para(doc, `Catatan keputusan tersimpan: ${l.catatan_keputusan}`, { warna: REDUP });
}

function bagianTools(doc, l) {
  judulBagian(doc, '2. Pernyataan tools yang belum tersedia');
  // agen tidak menyatakan ada tools yang belum tersedia (atau belum ada hasil yang diimpor)
  if (l.tools.length === 0) return para(doc, 'Tidak ada pernyataan tools yang belum tersedia.', { warna: REDUP });
  for (const t of l.tools) {
    anakJudul(doc, `Putaran ${t.putaran_nomor} - ${t.repo_nama}`);
    for (const x of t.tools) butir(doc, [x.nama, x.dibutuhkan_untuk && `untuk ${x.dibutuhkan_untuk}`, x.saran_pemasangan && `saran: ${x.saran_pemasangan}`].filter(Boolean).join(' - '));
  }
}

// ---------- 4. blueprint dan matriks ----------

/** Menggambar baris tabel matriks pada posisi y dan mengembalikan tingginya. */
function barisMatriks(doc, { y, kolom, sel, tebal, latar }) {
  doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
  const tinggi = Math.max(...sel.map((c, i) => doc.heightOfString(aman(c.teks), { width: kolom[i].lebar - 8 }))) + 8;
  if (latar) doc.rect(KIRI, y, LEBAR, tinggi).fill(latar);
  let x = KIRI;
  sel.forEach((c, i) => {
    doc.font(tebal || c.status ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(c.status ? WARNA_STATUS[c.status] : TEKS).text(aman(c.teks), x + 4, y + 4, { width: kolom[i].lebar - 8 });
    x += kolom[i].lebar;
  });
  doc.moveTo(KIRI, y + tinggi).lineTo(KIRI + LEBAR, y + tinggi).strokeColor(GARIS).stroke();
  return tinggi;
}

function tabelMatriks(doc, l) {
  const lebarStatus = 80;
  const lebarPoin = 215;
  const lebarRepo = Math.max(50, (LEBAR - lebarPoin - lebarStatus) / Math.max(1, l.repos.length));
  const kolom = [{ lebar: lebarPoin }, ...l.repos.map(() => ({ lebar: lebarRepo })), { lebar: lebarStatus }];
  const head = [{ teks: 'Poin' }, ...l.repos.map((r) => ({ teks: r.nama })), { teks: 'Status poin' }];
  const gambarHead = () => {
    pastikanRuang(doc, 40);
    doc.y += barisMatriks(doc, { y: doc.y, kolom, sel: head, tebal: true, latar: LATAR_HEAD });
  };
  gambarHead();
  for (const p of l.baris) {
    const sel = [
      { teks: `${p.nomor}. ${p.isi}` },
      ...l.repos.map((r) => (p.sel[r.id] ? { teks: LABEL_STATUS[p.sel[r.id]], status: p.sel[r.id] } : { teks: '-' })),
      { teks: LABEL_STATUS[p.status], status: p.status },
    ];
    doc.font('Helvetica').fontSize(8);
    const perkiraan = doc.heightOfString(aman(sel[0].teks), { width: lebarPoin - 8 }) + 8;
    // baris tidak muat di sisa halaman: lanjut ke halaman baru dengan kepala tabel diulang
    if (doc.y + perkiraan > TINGGI_HALAMAN - MARGIN_BAWAH) {
      doc.addPage();
      gambarHead();
    }
    doc.y += barisMatriks(doc, { y: doc.y, kolom, sel });
  }
  doc.x = KIRI;
}

function bagianBlueprint(doc, l) {
  judulBagian(doc, '3. Ringkasan blueprint dan matriks poin x repo');
  anakJudul(doc, 'Poin blueprint');
  for (const p of l.blueprint) {
    para(doc, `${p.nomor}. ${p.isi}`, { indent: 4 });
    for (const t of p.target) para(doc, `target: ${t}`, { warna: REDUP, ukuran: 8, indent: 18 });
  }
  anakJudul(doc, 'Matriks poin x repo');
  tabelMatriks(doc, l);
}

// ---------- 5. analisis perubahan, 6. riwayat ----------

function bagianAnalisis(doc, l) {
  judulBagian(doc, '4. Analisis perubahan');
  for (const kategori of DAFTAR_KATEGORI_PERUBAHAN) {
    anakJudul(doc, NAMA_KATEGORI[kategori]);
    const daftar = l.analisis[kategori];
    if (daftar.length === 0) para(doc, '-', { warna: REDUP, indent: 8 });
    for (const a of daftar) {
      const asal = `[putaran ${a.putaran_nomor} - ${a.repo_nama}${a.poin_nomor ? ` - poin ${a.poin_nomor}` : ''}]`;
      butir(doc, `${asal} ${a.ringkasan}${a.file.length ? ` (${a.file.join(', ')})` : ''}`);
    }
  }
}

function bagianRiwayat(doc, l) {
  judulBagian(doc, '5. Riwayat singkat per poin');
  for (const p of l.riwayat) {
    for (const r of p.per_repo) butir(doc, `Poin ${p.nomor} (${r.repo_nama}): ${r.teks || 'belum ada putaran'}`);
  }
}

// ---------- 7. skenario terbaru, 8. detail FAIL ----------

/** Satu skenario lengkap: judul bertanda status, langkah, diharapkan vs aktual, catatan, dan bukti. */
function blokSkenario(doc, s, { tampilkanAsal = false } = {}) {
  pastikanRuang(doc, 70);
  barisStatus(doc, s.status, `${s.kode} - ${s.nama}`);
  const asal = tampilkanAsal ? ` - ${s.repo_nama}${s.poin_nomor ? ` - poin ${s.poin_nomor}` : ' - di luar blueprint'}` : '';
  para(doc, `${s.tipe} / ${s.jenis} - putaran ${s.putaran_nomor}${asal}`, { warna: REDUP, ukuran: 8, indent: 10 });
  s.langkah.forEach((l, i) => para(doc, `${i + 1}. ${l}`, { ukuran: 8, indent: 14 }));
  if (s.hasil_diharapkan) para(doc, `Diharapkan: ${s.hasil_diharapkan}`, { ukuran: 8, indent: 10 });
  if (s.hasil_aktual) para(doc, `Aktual: ${s.hasil_aktual}`, { ukuran: 8, indent: 10 });
  if (s.catatan) para(doc, `Analisis/catatan: ${s.catatan}`, { ukuran: 8, indent: 10 });
  if (s.catatan_keputusan) para(doc, `Catatan keputusan: ${s.catatan_keputusan}`, { ukuran: 8, indent: 10, tebal: true });
  if (s.bukti.length) para(doc, `Bukti: ${s.bukti.map((b) => b.nama).join(', ')}`, { ukuran: 8, indent: 10, warna: REDUP });
  doc.moveDown(0.4);
}

function bagianSkenario(doc, l) {
  judulBagian(doc, '6. Skenario hasil terbaru per sel');
  for (const sel of l.terbaru.perSel) {
    anakJudul(doc, `Poin ${sel.poin_nomor} - ${sel.repo_nama}`);
    if (sel.skenario.length === 0) para(doc, 'Belum ada skenario.', { warna: REDUP, indent: 8 });
    for (const s of sel.skenario) blokSkenario(doc, s);
  }
  if (l.terbaru.luar.length > 0) {
    anakJudul(doc, 'Di luar blueprint');
    for (const s of l.terbaru.luar) blokSkenario(doc, s, { tampilkanAsal: true });
  }
}

function bagianFail(doc, l) {
  judulBagian(doc, '7. Detail FAIL dan alasan skenario tertahan');
  anakJudul(doc, 'Skenario FAIL (termasuk yang pernah terjadi)');
  if (l.fail.length === 0) para(doc, 'Tidak ada skenario FAIL.', { warna: REDUP, indent: 8 });
  for (const s of l.fail) blokSkenario(doc, s, { tampilkanAsal: true });
  anakJudul(doc, 'Alasan BLOCKED / NOT EXECUTED (hasil terbaru)');
  if (l.tertahan.length === 0) para(doc, 'Tidak ada skenario BLOCKED atau NOT EXECUTED.', { warna: REDUP, indent: 8 });
  for (const s of l.tertahan) {
    barisStatus(doc, s.status, `${s.kode} - ${s.nama} (${s.repo_nama}, putaran ${s.putaran_nomor})`);
    para(doc, [s.hasil_aktual, s.catatan].filter(Boolean).join(' - ') || 'Alasan tidak dicatat.', { ukuran: 8, indent: 10 });
  }
}

// ---------- 9. lampiran bukti ----------

function bagianLampiran(doc, l, gambar) {
  judulBagian(doc, '8. Lampiran bukti');
  const ada = l.lampiran.filter((x) => gambar.has(x.path));
  if (ada.length === 0) return para(doc, 'Tidak ada gambar bukti.', { warna: REDUP });
  for (const x of ada) {
    const img = doc.openImage(gambar.get(x.path));
    const lebar = Math.min(LEBAR, img.width);
    const tinggi = Math.min(360, (img.height * lebar) / img.width);
    pastikanRuang(doc, tinggi + 24);
    para(doc, `${x.nama} - ${x.label}`, { ukuran: 8, warna: REDUP });
    const y = doc.y + 2;
    doc.image(img, KIRI, y, { fit: [lebar, tinggi] });
    doc.y = y + tinggi + 8;
    doc.x = KIRI;
  }
}

/** Nomor halaman "CR - vN - Halaman i dari n" di kaki tiap halaman. */
function kakiHalaman(doc, l) {
  const rentang = doc.bufferedPageRange();
  for (let i = 0; i < rentang.count; i += 1) {
    doc.switchToPage(rentang.start + i);
    // margin bawah dinolkan agar teks kaki tidak memicu halaman baru
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(REDUP).text(aman(`${l.cr_id} - v${l.versi} - Halaman ${i + 1} dari ${rentang.count}`), KIRI, TINGGI_HALAMAN - 30, { width: LEBAR, align: 'center', lineBreak: false });
  }
}

/**
 * Menggambar laporan menjadi PDF. `gambar` = Map path -> Buffer gambar (sudah dikecilkan).
 * Mengembalikan Promise<Buffer>.
 */
export function renderPdf(laporan, gambar) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: MARGIN_BAWAH, left: KIRI, right: 40 }, bufferPages: true, info: { Title: `Pengujian ${laporan.cr_id} v${laporan.versi}`, Producer: 'DK Docs' } });
    const bagian = [];
    doc.on('data', (c) => bagian.push(c));
    doc.on('end', () => resolve(Buffer.concat(bagian)));
    doc.on('error', reject);
    try {
      bagianJudul(doc, laporan);
      bagianRingkasan(doc, laporan);
      bagianTools(doc, laporan);
      bagianBlueprint(doc, laporan);
      bagianAnalisis(doc, laporan);
      bagianRiwayat(doc, laporan);
      bagianSkenario(doc, laporan);
      bagianFail(doc, laporan);
      bagianLampiran(doc, laporan, gambar);
      kakiHalaman(doc, laporan);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
