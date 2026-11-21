import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bukaKoneksi } from './_koneksi.mjs';
import { buatId } from './_idGen.mjs';

// Migrasi primary key dari INT AUTO_INCREMENT ke ID IdGenerator (BIGINT UNSIGNED).
// Langkah: (1) cadangkan semua data ke JSON, (2) hapus tabel lalu buat ulang dari schema.sql,
// (3) isi ulang dengan ID baru sambil memetakan semua foreign key dan id di snapshot versi.
//
// Pemakaian:
//   node scripts/db-migrasi-id.mjs                    migrasi database DB_NAME dari .env
//   node scripts/db-migrasi-id.mjs --db=dk_docs_uji   migrasi database lain (misal salinan uji)
//   node scripts/db-migrasi-id.mjs --dump=<berkas>    ulangi dari cadangan JSON (bila isi ulang gagal)

const FOLDER = path.dirname(fileURLToPath(import.meta.url));
const BERKAS_SKEMA = path.join(FOLDER, '..', 'schema.sql');
const FOLDER_CADANGAN = path.join(FOLDER, '..', 'backup');

/**
 * Daftar tabel dalam urutan isi (induk dulu). `fk`: kolom -> tabel yang dirujuk.
 * `tanpaId`: tabel tanpa kolom id (kunci komposit / kunci teks), baris disalin apa adanya.
 */
const TABEL = [
  { nama: 'repo', fk: {} },
  { nama: 'modul', fk: { repo_id: 'repo' } },
  { nama: 'modul_alias', fk: { modul_id: 'modul' } },
  { nama: 'menu', fk: { modul_id: 'modul' } },
  { nama: 'menu_alias', fk: { menu_id: 'menu' } },
  { nama: 'halaman', fk: { menu_id: 'menu' } },
  { nama: 'halaman_kata_kunci', fk: { halaman_id: 'halaman' } },
  { nama: 'poin_dokumentasi', fk: { halaman_id: 'halaman' } },
  { nama: 'gambar_halaman', fk: { halaman_id: 'halaman' } },
  { nama: 'dependensi_modul', fk: { modul_id: 'modul', ke_modul_id: 'modul' } },
  { nama: 'dependensi_menu', fk: { menu_id: 'menu', ke_menu_id: 'menu' } },
  { nama: 'dependensi_halaman', fk: { halaman_id: 'halaman', ke_halaman_id: 'halaman' } },
  { nama: 'perubahan', fk: {} },
  { nama: 'perubahan_pesan', fk: { perubahan_id: 'perubahan' } },
  { nama: 'perubahan_pesan_peta', fk: { perubahan_pesan_id: 'perubahan_pesan', modul_id: 'modul', menu_id: 'menu' } },
  { nama: 'sesi_prompt', fk: { repo_id: 'repo', perubahan_id: 'perubahan' } },
  { nama: 'sesi_prompt_modul', fk: { sesi_prompt_id: 'sesi_prompt', modul_id: 'modul' }, tanpaId: true },
  { nama: 'impor_hasil', fk: { sesi_prompt_id: 'sesi_prompt' } },
  { nama: 'perubahan_dampak', fk: { perubahan_id: 'perubahan', modul_id: 'modul', menu_id: 'menu', halaman_id: 'halaman', impor_hasil_id: 'impor_hasil' } },
  { nama: 'halaman_versi', fk: { halaman_id: 'halaman', sesi_prompt_id: 'sesi_prompt' }, snapshot: true },
  { nama: 'audit_bugfix', fk: { repo_id: 'repo', sesi_prompt_id: 'sesi_prompt' } },
  { nama: 'audit_bugfix_dampak', fk: { audit_bugfix_id: 'audit_bugfix', modul_id: 'modul', menu_id: 'menu', halaman_id: 'halaman' } },
  { nama: 'blueprint', fk: { repo_id: 'repo' } },
  { nama: 'blueprint_kelompok', fk: { blueprint_id: 'blueprint', modul_id: 'modul', sesi_prompt_id: 'sesi_prompt' } },
  { nama: 'blueprint_poin', fk: { blueprint_id: 'blueprint', kelompok_id: 'blueprint_kelompok' } },
  { nama: 'blueprint_poin_target', fk: { blueprint_poin_id: 'blueprint_poin', modul_id: 'modul', menu_id: 'menu', halaman_id: 'halaman' } },
  { nama: 'pengaturan', fk: {}, tanpaId: true },
];

const UKURAN_BATCH = 200;

/** Membaca argumen `--kunci=nilai` dari command line. */
function bacaArgumen(argv) {
  const hasil = {};
  for (const a of argv) {
    const cocok = a.match(/^--([a-z-]+)=(.+)$/);
    // hanya argumen berbentuk --kunci=nilai yang dikenali
    if (cocok) hasil[cocok[1]] = cocok[2];
  }
  return hasil;
}

/** Apakah database sudah memakai skema baru (kolom repo.id tanpa AUTO_INCREMENT). */
async function sudahSkemaBaru(conn) {
  const [baris] = await conn.query(
    "SELECT EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repo' AND COLUMN_NAME = 'id'",
  );
  // tabel repo belum ada: database kosong, tidak dianggap sudah baru
  if (baris.length === 0) return false;
  return !String(baris[0].extra).toLowerCase().includes('auto_increment');
}

/** Membaca seluruh isi semua tabel menjadi { tabel: [baris] }. */
async function bacaSemua(conn) {
  const data = {};
  for (const t of TABEL) {
    const urut = t.tanpaId ? '' : ' ORDER BY id';
    const [baris] = await conn.query(`SELECT * FROM \`${t.nama}\`${urut}`);
    data[t.nama] = baris;
  }
  return data;
}

/** Menulis cadangan JSON dan mengembalikan path-nya. */
function tulisCadangan(data, namaDb) {
  fs.mkdirSync(FOLDER_CADANGAN, { recursive: true });
  const cap = new Date().toISOString().replace(/[:.]/g, '-');
  const berkas = path.join(FOLDER_CADANGAN, `migrasi-id-${namaDb}-${cap}.json`);
  fs.writeFileSync(berkas, JSON.stringify(data));
  return berkas;
}

/** Menghapus semua tabel database aktif (kunci asing dimatikan sementara). */
async function hapusSemuaTabel(conn) {
  const [daftar] = await conn.query('SELECT TABLE_NAME AS nama FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const { nama } of daftar) await conn.query(`DROP TABLE IF EXISTS \`${nama}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
}

/** Membuat ulang skema dari schema.sql (tanpa CREATE DATABASE / USE) pada database aktif. */
async function buatSkemaBaru(conn) {
  const sql = fs
    .readFileSync(BERKAS_SKEMA, 'utf8')
    .replace(/CREATE DATABASE[\s\S]*?;/i, '')
    .replace(/^\s*USE\s+\w+;/im, '');
  await conn.query(sql);
}

/** Mengubah nilai kolom ke bentuk yang aman di-INSERT (objek JSON menjadi teks). */
function nilaiAman(v) {
  // MySQL 8 mengembalikan kolom JSON sebagai objek: simpan kembali sebagai teks JSON
  if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) return JSON.stringify(v);
  return v;
}

/** Peta id lama -> id baru untuk satu tabel; id baru dibuat sesuai urutan id lama. */
function buatPetaId(baris) {
  const peta = new Map();
  for (const b of baris) peta.set(String(b.id), buatId());
  return peta;
}

/** Mencari id baru dari id lama; error jelas bila referensi yatim (data lama rusak). */
function cariId(peta, tabelRef, idLama, konteks) {
  const baru = peta[tabelRef]?.get(String(idLama));
  // referensi tidak ditemukan: hentikan agar tidak ada relasi yang diam-diam putus
  if (!baru) throw new Error(`Referensi yatim: ${konteks} merujuk ${tabelRef}.id=${idLama} yang tidak ada.`);
  return baru;
}

/** Memetakan id poin di dalam snapshot versi; id poin yang sudah terhapus tetap diberi id baru yang konsisten. */
function petakanSnapshot(mentah, petaPoin) {
  const objek = typeof mentah === 'string' ? JSON.parse(mentah) : mentah;
  const poin = Array.isArray(objek?.poin) ? objek.poin : [];
  const baru = poin.map((p) => {
    const kunci = String(p.id);
    // poin lama yang sudah dihapus tidak ada di tabel: buat id baru sekali supaya antar-versi tetap konsisten
    if (!petaPoin.has(kunci)) petaPoin.set(kunci, buatId());
    return { ...p, id: petaPoin.get(kunci) };
  });
  return JSON.stringify({ ...objek, poin: baru });
}

/** Membentuk satu baris baru: id baru, foreign key dipetakan, kolom generated dibuang. */
function ubahBaris(t, b, peta) {
  const hasil = {};
  for (const [kolom, nilai] of Object.entries(b)) {
    // kolom *_kunci adalah generated column: tidak boleh diisi
    if (kolom.endsWith('_kunci')) continue;
    if (kolom === 'id' && !t.tanpaId) hasil.id = peta[t.nama].get(String(nilai));
    else if (t.fk[kolom] && nilai !== null) hasil[kolom] = cariId(peta, t.fk[kolom], nilai, `${t.nama}.${kolom}`);
    else if (t.snapshot && kolom === 'snapshot') hasil.snapshot = petakanSnapshot(nilai, peta.poin_dokumentasi);
    else hasil[kolom] = nilaiAman(nilai);
  }
  return hasil;
}

/** Memasukkan baris-baris sebuah tabel secara bertahap. */
async function isiTabel(conn, nama, baris) {
  // tabel kosong: tidak ada yang perlu dimasukkan
  if (baris.length === 0) return;
  const kolom = Object.keys(baris[0]);
  for (let i = 0; i < baris.length; i += UKURAN_BATCH) {
    const bagian = baris.slice(i, i + UKURAN_BATCH).map((b) => kolom.map((k) => b[k]));
    await conn.query(`INSERT INTO \`${nama}\` (${kolom.map((k) => `\`${k}\``).join(', ')}) VALUES ?`, [bagian]);
  }
}

/** Mengisi semua tabel dengan ID baru dalam satu transaksi. */
async function isiSemua(conn, data) {
  const peta = {};
  // semua peta id dibuat dulu per tabel (urutan id lama dipertahankan)
  for (const t of TABEL) if (!t.tanpaId) peta[t.nama] = buatPetaId(data[t.nama]);

  await conn.beginTransaction();
  try {
    // schema.sql sudah mengisi nilai bawaan pengaturan; kosongkan agar nilai lama yang dipakai
    await conn.query('DELETE FROM pengaturan');
    for (const t of TABEL) {
      await isiTabel(conn, t.nama, data[t.nama].map((b) => ubahBaris(t, b, peta)));
    }
    await conn.commit();
  } catch (error) {
    // gagal di tengah: batalkan isi; skema baru tetap ada dan bisa diulang dari cadangan
    await conn.rollback();
    throw error;
  }
}

/** Membandingkan jumlah baris tiap tabel dengan data asal; mengembalikan daftar masalah. */
async function verifikasi(conn, data) {
  const masalah = [];
  for (const t of TABEL) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t.nama}\``);
    if (Number(n) !== data[t.nama].length) masalah.push(`${t.nama}: harapan ${data[t.nama].length}, hasil ${n}`);
  }
  const [auto] = await conn.query("SELECT TABLE_NAME AS nama FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND EXTRA LIKE '%auto_increment%'");
  // masih ada AUTO_INCREMENT: skema baru tidak terpasang dengan benar
  if (auto.length > 0) masalah.push(`AUTO_INCREMENT tersisa di: ${auto.map((a) => a.nama).join(', ')}`);
  return masalah;
}

/** Menyiapkan data sumber: dari berkas cadangan (--dump) atau dari database lalu dicadangkan. */
async function siapkanData(conn, args, namaDb) {
  // dipakai untuk mengulang setelah gagal: data diambil dari cadangan, bukan dari database
  if (args.dump) return JSON.parse(fs.readFileSync(args.dump, 'utf8'));
  if (await sudahSkemaBaru(conn)) throw new Error('Database sudah memakai skema ID baru. Tidak ada yang perlu dimigrasi.');
  const data = await bacaSemua(conn);
  console.log(`Cadangan: ${tulisCadangan(data, namaDb)}`);
  return data;
}

/** Titik masuk: cadangkan, buat ulang skema, isi ulang, verifikasi. */
async function main() {
  const args = bacaArgumen(process.argv.slice(2));
  const namaDb = args.db ?? process.env.DB_NAME ?? 'dk_docs';
  const conn = await bukaKoneksi({ multi: true, namaDb });
  try {
    const data = await siapkanData(conn, args, namaDb);
    await hapusSemuaTabel(conn);
    await buatSkemaBaru(conn);
    await isiSemua(conn, data);
    const masalah = await verifikasi(conn, data);
    // ada selisih: laporkan keras, jangan dianggap berhasil
    if (masalah.length > 0) throw new Error(`Verifikasi gagal:\n- ${masalah.join('\n- ')}`);
    console.log(`Migrasi ID selesai pada database "${namaDb}" (${TABEL.length} tabel).`);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:migrasi-id gagal:', error.message);
  process.exit(1);
});
