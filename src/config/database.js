import 'server-only';
import mysql from 'mysql2/promise';

/** Membuat connection pool ke database dashboard (dk_docs) dari variabel lingkungan. */
function buatPool() {
  return mysql.createPool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'dk_docs',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // tanggal sebagai string agar aman dikirim ke komponen client
    // ID BIGINT (17-18 digit) melebihi Number.MAX_SAFE_INTEGER: wajib dibaca sebagai string,
    // kalau tidak angkanya berubah diam-diam. Efek samping: COUNT(*) juga berupa string.
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

/**
 * Mengambil pool tunggal. Disimpan di globalThis supaya hot reload saat dev
 * tidak membuat pool baru berulang kali (yang akan menghabiskan koneksi).
 */
export function ambilPool() {
  // pool belum ada (start pertama atau setelah proses baru): buat sekali saja
  if (!globalThis.__dkDocsPool) globalThis.__dkDocsPool = buatPool();
  return globalThis.__dkDocsPool;
}

/**
 * Membungkus pool menjadi helper kecil yang dipakai semua *.model.js.
 * Parameter `conn` opsional: isi dengan koneksi transaksi agar query ikut transaksi.
 */
export function buatDb(pool) {
  /** Menjalankan query dan mengembalikan hasil mentah (parameterized lewat placeholder ?). */
  async function jalankan(sql, params = [], conn = null) {
    const [hasil] = await (conn ?? pool).query(sql, params);
    return hasil;
  }

  return {
    /** SELECT banyak baris. */
    rows: (sql, params, conn) => jalankan(sql, params, conn),
    /** SELECT satu baris pertama, atau null bila kosong. */
    async first(sql, params, conn) {
      const baris = await jalankan(sql, params, conn);
      return baris[0] ?? null;
    },
    /** INSERT/UPDATE/DELETE; mengembalikan ResultSetHeader (insertId, affectedRows). */
    exec: (sql, params, conn) => jalankan(sql, params, conn),
    /** Menjalankan fn dalam satu transaksi; rollback otomatis bila fn melempar error. */
    async transaction(fn) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const hasil = await fn(conn);
        await conn.commit();
        return hasil;
      } catch (error) {
        // ada yang gagal di tengah: batalkan semua perubahan agar data tidak setengah tersimpan
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
  };
}
