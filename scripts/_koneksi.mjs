import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Membuka koneksi tunggal ke server MySQL dari .env.
 * - pakaiDb false: tanpa memilih database; namaDb: pakai database selain DB_NAME (misal salinan uji).
 * ID BIGINT dibaca sebagai string (bigNumberStrings) dan tanggal sebagai string.
 */
export async function bukaKoneksi({ pakaiDb = true, multi = false, namaDb = null } = {}) {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: pakaiDb ? (namaDb ?? process.env.DB_NAME ?? 'dk_docs') : undefined,
    charset: 'utf8mb4',
    multipleStatements: multi,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}
