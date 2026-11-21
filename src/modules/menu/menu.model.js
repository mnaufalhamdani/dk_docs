import 'server-only';

/** Model menu: query tabel `menu` dan `menu_alias`. */
export function buatMenuModel({ db, idGen }) {
  return {
    /** Menu dalam satu modul beserta jumlah halaman. */
    byModul(modulId) {
      return db.rows(
        `SELECT mn.*, (SELECT COUNT(*) FROM halaman h WHERE h.menu_id = mn.id) AS jumlah_halaman
         FROM menu mn WHERE mn.modul_id = ? ORDER BY mn.urutan, mn.nama`,
        [modulId],
      );
    },
    /** Satu menu berdasarkan id, atau null. */
    byId(id, conn) {
      return db.first('SELECT * FROM menu WHERE id = ?', [id], conn);
    },
    /** Satu menu berdasarkan (modul, kode), atau null. */
    byKode(modulId, kode, conn) {
      return db.first('SELECT * FROM menu WHERE modul_id = ? AND kode = ?', [modulId, kode], conn);
    },
    /** Membuat menu sebagai stub; urutan otomatis di akhir. Mengembalikan id baru. */
    async buat(data, conn) {
      const akhir = await db.first(
        'SELECT COALESCE(MAX(urutan), 0) AS maks FROM menu WHERE modul_id = ?',
        [data.modul_id],
        conn,
      );
      // id dibuat oleh generator (tanpa AUTO_INCREMENT)
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO menu (id, modul_id, kode, nama, route, path_kode, ringkasan, pola, urutan, is_stub)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, data.modul_id, data.kode, data.nama, data.route, data.path_kode, data.ringkasan, data.pola, Number(akhir.maks) + 1],
        conn,
      );
      return id;
    },
    /** Mengubah data menu. */
    ubah(id, data, conn) {
      return db.exec(
        'UPDATE menu SET kode = ?, nama = ?, route = ?, path_kode = ?, ringkasan = ?, pola = ? WHERE id = ?',
        [data.kode, data.nama, data.route, data.path_kode, data.ringkasan, data.pola, id],
        conn,
      );
    },
    /** Menghapus menu. */
    hapus(id, conn) {
      return db.exec('DELETE FROM menu WHERE id = ?', [id], conn);
    },
    /** Jumlah halaman dalam menu (dipakai untuk mencegah penghapusan). */
    async hitungHalaman(id) {
      const baris = await db.first('SELECT COUNT(*) AS jumlah FROM halaman WHERE menu_id = ?', [id]);
      return Number(baris.jumlah);
    },
    /** Semua alias menu sebagai array { alias, jenis }. */
    aliasByMenu(menuId) {
      return db.rows('SELECT alias, jenis FROM menu_alias WHERE menu_id = ? ORDER BY alias', [menuId]);
    },
    /** Mengganti seluruh alias satu jenis milik menu dengan daftar baru. */
    async gantiAlias(menuId, jenis, daftar, conn) {
      await db.exec('DELETE FROM menu_alias WHERE menu_id = ? AND jenis = ?', [menuId, jenis], conn);
      // tidak ada alias baru: cukup hapus
      if (daftar.length === 0) return;
      await db.exec(
        'INSERT INTO menu_alias (id, menu_id, alias, jenis) VALUES ?',
        [daftar.map((alias) => [idGen.generate(), menuId, alias, jenis])],
        conn,
      );
    },
    /** Menambah satu alias bila belum ada (duplikat diabaikan oleh UNIQUE KEY). */
    tambahAlias(menuId, alias, jenis, conn) {
      return db.exec(
        'INSERT IGNORE INTO menu_alias (id, menu_id, alias, jenis) VALUES (?, ?, ?, ?)',
        [idGen.generate(), menuId, alias, jenis],
        conn,
      );
    },
    /** Menandai menu sudah punya dokumentasi (bukan stub lagi). */
    tandaiBukanStub(id, conn) {
      return db.exec('UPDATE menu SET is_stub = 0 WHERE id = ?', [id], conn);
    },
  };
}
