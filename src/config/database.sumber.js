import 'server-only';
import mysql from 'mysql2/promise';

/** Apakah variabel koneksi minimal untuk database sumber sudah diisi. */
export function sumberTerkonfigurasi() {
  return Boolean(process.env.SUMBER_DB_HOST && process.env.SUMBER_DB_NAME);
}

/**
 * Membuat pool ke database sumber CR/B. Hanya untuk membaca: setiap koneksi baru
 * dipaksa READ ONLY di sisi session sebagai pengaman tambahan di atas hak user database.
 */
function buatPoolSumber() {
  const pool = mysql.createPool({
    host: process.env.SUMBER_DB_HOST,
    port: Number(process.env.SUMBER_DB_PORT ?? 3306),
    user: process.env.SUMBER_DB_USER ?? '',
    password: process.env.SUMBER_DB_PASSWORD ?? '',
    database: process.env.SUMBER_DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 5,
    dateStrings: true,
  });
  // pool.pool = pool callback-style di bawah wrapper promise; event 'connection' ada di sana
  pool.pool.on('connection', (koneksi) => {
    koneksi.query('SET SESSION TRANSACTION READ ONLY');
  });
  return pool;
}

/**
 * Mengambil pool sumber tunggal (disimpan di globalThis agar hot reload tidak
 * membuat pool berulang). Mengembalikan null bila koneksi sumber belum dikonfigurasi.
 */
export function ambilPoolSumber() {
  // variabel .env belum diisi: biarkan pemanggil menampilkan pesan "belum dikonfigurasi"
  if (!sumberTerkonfigurasi()) return null;
  if (!globalThis.__dkDocsPoolSumber) globalThis.__dkDocsPoolSumber = buatPoolSumber();
  return globalThis.__dkDocsPoolSumber;
}
