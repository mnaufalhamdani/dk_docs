import { bukaKoneksi } from './_koneksi.mjs';

const namaDb = process.env.DB_NAME ?? 'dk_docs';

/** Kolom info repo yang ditambahkan pada tabel `repo` (semua opsional). */
const KOLOM_BARU = ['url_git', 'url_beta', 'url_live'];

/** SQL tabel repo_teknologi (sama dengan schema.sql); IF NOT EXISTS agar aman diulang. */
const SQL_TABEL = `
CREATE TABLE IF NOT EXISTS repo_teknologi (
  id           BIGINT UNSIGNED NOT NULL,
  repo_id      BIGINT UNSIGNED NOT NULL,
  nama         VARCHAR(100) NOT NULL,
  versi        VARCHAR(50)  NULL,
  sumber_file  VARCHAR(255) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repo_teknologi (repo_id, nama),
  CONSTRAINT fk_repo_teknologi_repo FOREIGN KEY (repo_id) REFERENCES repo (id) ON DELETE CASCADE
) ENGINE=InnoDB`;

/** Apakah kolom sudah ada di tabel `repo` (dicek lewat information_schema agar jalan di MySQL maupun MariaDB). */
async function kolomAda(conn, kolom) {
  const [baris] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
    [namaDb, 'repo', kolom],
  );
  return Number(baris[0].n) > 0;
}

/** Menambah kolom URL pada tabel repo dan membuat tabel repo_teknologi; aman dijalankan berulang. */
async function main() {
  const conn = await bukaKoneksi();
  try {
    for (const kolom of KOLOM_BARU) {
      // kolom sudah ada (migrasi pernah dijalankan): lewati
      if (await kolomAda(conn, kolom)) {
        console.log(`Kolom repo.${kolom} sudah ada, dilewati.`);
        continue;
      }
      await conn.query(`ALTER TABLE repo ADD COLUMN \`${kolom}\` VARCHAR(500) NULL AFTER branch_utama`);
      console.log(`Kolom repo.${kolom} ditambahkan.`);
    }
    await conn.query(SQL_TABEL);
    console.log('Tabel repo_teknologi siap (dibuat bila belum ada).');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:migrasi-info-repo gagal:', error.message);
  process.exit(1);
});
