import fs from 'node:fs';
import path from 'node:path';
import { bukaKoneksi } from './_koneksi.mjs';

// Menambah skema fitur Uji CR (Fase 6): 10 tabel pengujian* dan nilai 'pengujian' pada ENUM sesi_prompt.jenis.
// Aman dijalankan berulang (CREATE TABLE IF NOT EXISTS dan MODIFY ENUM yang sama). Jalankan SETELAH db:init.

/** Jumlah tabel pengujian* yang diharapkan setelah skrip selesai. */
const JUMLAH_TABEL = 10;

/** Membaca berkas SQL tambahan dari root project. */
function bacaSql() {
  return fs.readFileSync(path.join(process.cwd(), 'schema_uji_cr.sql'), 'utf8');
}

/** Menjalankan schema_uji_cr.sql lalu memastikan semua tabel pengujian* terbentuk. */
async function main() {
  const conn = await bukaKoneksi({ multi: true });
  try {
    await conn.query(bacaSql());
    const [tabel] = await conn.query("SHOW TABLES LIKE 'pengujian%'");
    // jumlah tidak sesuai: skema tidak lengkap, hentikan dengan pesan jelas
    if (tabel.length !== JUMLAH_TABEL) throw new Error(`Tabel pengujian* ada ${tabel.length}, seharusnya ${JUMLAH_TABEL}.`);
    console.log(`Skema Uji CR siap (${tabel.length} tabel pengujian*).`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('db:uji-cr gagal:', e.message);
  process.exit(1);
});
