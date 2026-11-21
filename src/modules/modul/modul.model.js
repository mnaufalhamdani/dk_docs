import 'server-only';

/** Model modul: query tabel `modul` dan `modul_alias`. */
export function buatModulModel({ db, idGen }) {
  return {
    /** Modul dalam satu repo beserta jumlah menu. */
    byRepo(repoId) {
      return db.rows(
        `SELECT m.*, (SELECT COUNT(*) FROM menu mn WHERE mn.modul_id = m.id) AS jumlah_menu
         FROM modul m WHERE m.repo_id = ? ORDER BY m.nama`,
        [repoId],
      );
    },
    /** Satu modul berdasarkan id, atau null. */
    byId(id, conn) {
      return db.first('SELECT * FROM modul WHERE id = ?', [id], conn);
    },
    /** Satu modul berdasarkan (repo, kode), atau null. */
    byKode(repoId, kode, conn) {
      return db.first('SELECT * FROM modul WHERE repo_id = ? AND kode = ?', [repoId, kode], conn);
    },
    /** Membuat modul sebagai stub (belum didokumentasikan); mengembalikan id baru. */
    async buat(data, conn) {
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO modul (id, repo_id, kode, nama, path_kode, ringkasan, is_stub)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [id, data.repo_id, data.kode, data.nama, data.path_kode, data.ringkasan],
        conn,
      );
      return id;
    },
    /** Mengubah data modul. */
    ubah(id, data, conn) {
      return db.exec(
        'UPDATE modul SET kode = ?, nama = ?, path_kode = ?, ringkasan = ? WHERE id = ?',
        [data.kode, data.nama, data.path_kode, data.ringkasan, id],
        conn,
      );
    },
    /** Menghapus modul. */
    hapus(id) {
      return db.exec('DELETE FROM modul WHERE id = ?', [id]);
    },
    /** Jumlah menu dalam modul (dipakai untuk mencegah penghapusan). */
    async hitungMenu(id) {
      const baris = await db.first('SELECT COUNT(*) AS jumlah FROM menu WHERE modul_id = ?', [id]);
      return Number(baris.jumlah);
    },
    /** Semua alias modul sebagai array { alias, jenis }. */
    aliasByModul(modulId) {
      return db.rows('SELECT alias, jenis FROM modul_alias WHERE modul_id = ? ORDER BY alias', [modulId]);
    },
    /** Mengganti seluruh alias satu jenis milik modul dengan daftar baru. */
    async gantiAlias(modulId, jenis, daftar, conn) {
      await db.exec('DELETE FROM modul_alias WHERE modul_id = ? AND jenis = ?', [modulId, jenis], conn);
      // tidak ada alias baru: cukup hapus, tidak perlu INSERT kosong
      if (daftar.length === 0) return;
      await db.exec(
        'INSERT INTO modul_alias (id, modul_id, alias, jenis) VALUES ?',
        [daftar.map((alias) => [idGen.generate(), modulId, alias, jenis])],
        conn,
      );
    },
    /** Menambah satu alias bila belum ada (duplikat diabaikan oleh UNIQUE KEY). */
    tambahAlias(modulId, alias, jenis, conn) {
      return db.exec('INSERT IGNORE INTO modul_alias (id, modul_id, alias, jenis) VALUES (?, ?, ?, ?)', [idGen.generate(), modulId, alias, jenis], conn);
    },
    /** Menandai modul sudah punya dokumentasi (bukan stub lagi). */
    tandaiBukanStub(id, conn) {
      return db.exec('UPDATE modul SET is_stub = 0 WHERE id = ?', [id], conn);
    },
  };
}
