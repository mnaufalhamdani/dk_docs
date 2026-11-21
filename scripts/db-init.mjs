import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bukaKoneksi } from './_koneksi.mjs';

const lokasiSchema = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema.sql');
const namaDb = process.env.DB_NAME ?? 'dk_docs';

/** Mengecek apakah tabel `repo` sudah ada di database (tanda skema sudah terpasang). */
async function skemaSudahAda(conn) {
  const [baris] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
    [namaDb, 'repo'],
  );
  return Number(baris[0].n) > 0;
}

/** Menjalankan schema.sql apa adanya, kecuali skema sudah terpasang. */
async function main() {
  const conn = await bukaKoneksi({ pakaiDb: false, multi: true });
  try {
    // skema sudah ada: jangan dijalankan lagi (CREATE TABLE tanpa IF NOT EXISTS akan gagal / menimpa)
    if (await skemaSudahAda(conn)) {
      console.log(`Skema ${namaDb} sudah terpasang, db:init dilewati. Data tidak diubah.`);
      return;
    }
    await conn.query(await readFile(lokasiSchema, 'utf8'));
    console.log(`Skema ${namaDb} berhasil dibuat dari schema.sql.`);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('db:init gagal:', error.message);
  process.exit(1);
});
