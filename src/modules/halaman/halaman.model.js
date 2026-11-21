import 'server-only';

/** Mengubah kolom file_utama (JSON atau teks JSON, tergantung server DB) menjadi array. */
function bacaFileUtama(nilai) {
  if (nilai == null) return [];
  // MariaDB mengembalikan JSON sebagai teks, MySQL sudah berupa objek
  if (typeof nilai === 'string') {
    try {
      const hasil = JSON.parse(nilai);
      return Array.isArray(hasil) ? hasil : [];
    } catch {
      // isi rusak: anggap kosong agar halaman tetap bisa dibuka dan diperbaiki lewat form
      return [];
    }
  }
  return Array.isArray(nilai) ? nilai : [];
}

/** Menormalkan satu baris halaman dari database. */
function rapikan(baris) {
  return baris ? { ...baris, file_utama: bacaFileUtama(baris.file_utama) } : null;
}

/** Model halaman: query tabel `halaman` dan `halaman_kata_kunci`. */
export function buatHalamanModel({ db, idGen }) {
  return {
    /** Halaman dalam satu menu, terurut. */
    async byMenu(menuId) {
      const baris = await db.rows('SELECT * FROM halaman WHERE menu_id = ? ORDER BY urutan, id', [menuId]);
      return baris.map(rapikan);
    },
    /** Satu halaman berdasarkan id, atau null. */
    async byId(id, conn) {
      return rapikan(await db.first('SELECT * FROM halaman WHERE id = ?', [id], conn));
    },
    /** Satu halaman berdasarkan (menu, kode), atau null. */
    async byKode(menuId, kode, conn) {
      return rapikan(await db.first('SELECT * FROM halaman WHERE menu_id = ? AND kode = ?', [menuId, kode], conn));
    },
    /** Membuat halaman sebagai stub; urutan otomatis di akhir. Mengembalikan id baru. */
    async buat(data, conn) {
      const akhir = await db.first(
        'SELECT COALESCE(MAX(urutan), 0) AS maks FROM halaman WHERE menu_id = ?',
        [data.menu_id],
        conn,
      );
      // id dibuat oleh generator (tanpa AUTO_INCREMENT)
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO halaman (id, menu_id, kode, nama, jenis, route, file_utama, urutan, is_stub)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, data.menu_id, data.kode, data.nama, data.jenis, data.route, JSON.stringify(data.file_utama ?? []), Number(akhir.maks) + 1],
        conn,
      );
      return id;
    },
    /** Mengubah data halaman. */
    ubah(id, data, conn) {
      return db.exec(
        'UPDATE halaman SET kode = ?, nama = ?, jenis = ?, route = ?, file_utama = ? WHERE id = ?',
        [data.kode, data.nama, data.jenis, data.route, JSON.stringify(data.file_utama ?? []), id],
        conn,
      );
    },
    /** Menghapus halaman (poin, gambar, dan versi ikut terhapus oleh FK cascade). */
    hapus(id, conn) {
      return db.exec('DELETE FROM halaman WHERE id = ?', [id], conn);
    },
    /** Daftar kata kunci halaman sebagai array teks. */
    async kataKunciByHalaman(halamanId) {
      const baris = await db.rows('SELECT kata_kunci FROM halaman_kata_kunci WHERE halaman_id = ? ORDER BY kata_kunci', [halamanId]);
      return baris.map((b) => b.kata_kunci);
    },
    /** Mengganti seluruh kata kunci halaman dengan daftar baru. */
    async gantiKataKunci(halamanId, daftar, conn) {
      await db.exec('DELETE FROM halaman_kata_kunci WHERE halaman_id = ?', [halamanId], conn);
      // daftar kosong: cukup hapus
      if (daftar.length === 0) return;
      await db.exec(
        'INSERT INTO halaman_kata_kunci (id, halaman_id, kata_kunci) VALUES ?',
        [daftar.map((k) => [idGen.generate(), halamanId, k])],
        conn,
      );
    },
    /** Menandai halaman sudah punya dokumentasi (bukan stub lagi). */
    tandaiBukanStub(id, conn) {
      return db.exec('UPDATE halaman SET is_stub = 0 WHERE id = ?', [id], conn);
    },
  };
}
