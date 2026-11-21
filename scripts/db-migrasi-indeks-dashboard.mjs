import { bukaKoneksi } from './_koneksi.mjs';

const namaDb = process.env.DB_NAME ?? 'dk_docs';

/** Indeks tambahan untuk query beranda dashboard: [tabel, nama indeks, daftar kolom]. */
const DAFTAR_INDEKS = [
  // rentang tanggal CR/B (IN subquery pada tanggal) dan penanda Sync terakhir (MAX created_at)
  ['perubahan_pesan', 'idx_pesan_tanggal_perubahan', '(tanggal, perubahan_id)'],
  ['perubahan_pesan', 'idx_pesan_created', '(created_at)'],
  // filter repo CR/B: modul -> pesan terpetakan
  ['perubahan_pesan_peta', 'idx_peta_modul_pesan', '(modul_id, perubahan_pesan_id)'],
  // poin beta (jumlah dan terbaru) serta kelengkapan halaman (poin terakhir diubah per halaman)
  ['poin_dokumentasi', 'idx_poin_status_updated', '(status, updated_at)'],
  ['poin_dokumentasi', 'idx_poin_halaman_updated', '(halaman_id, updated_at)'],
  // poin pending per halaman
  ['poin_perubahan', 'idx_pp_status_halaman', '(status, halaman_id)'],
  // modul stub per repo
  ['modul', 'idx_modul_stub', '(is_stub, repo_id)'],
  // aktivitas dokumentasi terbaru dalam rentang tanggal
  ['halaman_versi', 'idx_versi_created', '(created_at)'],
];

/** Apakah indeks bernama itu sudah ada pada tabel (dicek lewat information_schema). */
async function indeksAda(conn, tabel, nama) {
  const [baris] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
    [namaDb, tabel, nama],
  );
  return Number(baris[0].n) > 0;
}

/** Menambah indeks dashboard yang belum ada; aman dijalankan berulang. */
async function main() {
  const conn = await bukaKoneksi();
  try {
    for (const [tabel, nama, kolom] of DAFTAR_INDEKS) {
      // indeks sudah ada (migrasi pernah dijalankan): lewati
      if (await indeksAda(conn, tabel, nama)) {
        console.log(`Indeks ${tabel}.${nama} sudah ada, dilewati.`);
        continue;
      }
      await conn.query(`ALTER TABLE \`${tabel}\` ADD INDEX \`${nama}\` ${kolom}`);
      console.log(`Indeks ${tabel}.${nama} ditambahkan.`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:migrasi-indeks-dashboard gagal:', error.message);
  process.exit(1);
});
