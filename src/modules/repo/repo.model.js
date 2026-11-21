import 'server-only';

/** Model repo: semua query tabel `repo` dan `repo_teknologi`. */
export function buatRepoModel({ db, idGen }) {
  return {
    /** Semua repo beserta jumlah modul-nya. */
    semua() {
      return db.rows(
        `SELECT r.*, (SELECT COUNT(*) FROM modul m WHERE m.repo_id = r.id) AS jumlah_modul
         FROM repo r ORDER BY r.nama`,
      );
    },
    /** Satu repo berdasarkan id, atau null. */
    byId(id) {
      return db.first('SELECT * FROM repo WHERE id = ?', [id]);
    },
    /** Satu repo berdasarkan kode, atau null. */
    byKode(kode) {
      return db.first('SELECT * FROM repo WHERE kode = ?', [kode]);
    },
    /** Membuat repo; mengembalikan id baru (string). */
    async buat(data) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO repo (id, kode, nama, platform, branch_utama, url_git, url_beta, url_live) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.kode, data.nama, data.platform, data.branch_utama, data.url_git ?? null, data.url_beta ?? null, data.url_live ?? null],
      );
      return id;
    },
    /** Mengubah data repo. */
    ubah(id, data) {
      return db.exec(
        'UPDATE repo SET kode = ?, nama = ?, platform = ?, branch_utama = ?, url_git = ?, url_beta = ?, url_live = ? WHERE id = ?',
        [data.kode, data.nama, data.platform, data.branch_utama, data.url_git ?? null, data.url_beta ?? null, data.url_live ?? null, id],
      );
    },
    /** Menghapus repo. */
    hapus(id) {
      return db.exec('DELETE FROM repo WHERE id = ?', [id]);
    },
    /** Jumlah modul milik repo (dipakai untuk mencegah penghapusan). */
    async hitungModul(id) {
      const baris = await db.first('SELECT COUNT(*) AS jumlah FROM modul WHERE repo_id = ?', [id]);
      return Number(baris.jumlah);
    },

    // ---------- teknologi repo ----------

    /** Teknologi tercatat sebuah repo, terurut nama. */
    teknologiByRepo(repoId, conn) {
      return db.rows('SELECT id, repo_id, nama, versi, sumber_file, created_at, updated_at FROM repo_teknologi WHERE repo_id = ? ORDER BY nama', [repoId], conn);
    },
    /** Satu entri teknologi berdasarkan id, atau null. */
    teknologiById(id) {
      return db.first('SELECT * FROM repo_teknologi WHERE id = ?', [id]);
    },
    /**
     * Upsert pada (repo_id, nama): membuat entri baru atau memperbarui versi dan sumber file,
     * sekaligus menyegarkan updated_at (UNIQUE tidak membedakan huruf besar-kecil).
     */
    simpanTeknologi(repoId, data, conn) {
      return db.exec(
        `INSERT INTO repo_teknologi (id, repo_id, nama, versi, sumber_file) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE versi = VALUES(versi), sumber_file = VALUES(sumber_file), updated_at = CURRENT_TIMESTAMP`,
        [idGen.generate(), repoId, data.nama, data.versi ?? null, data.sumber_file ?? null],
        conn,
      );
    },
    /** Mengubah satu entri teknologi (koreksi manual). */
    ubahTeknologi(id, data) {
      return db.exec(
        'UPDATE repo_teknologi SET nama = ?, versi = ?, sumber_file = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.nama, data.versi ?? null, data.sumber_file ?? null, id],
      );
    },
    /** Repo yang punya URL beta atau live (id, kode, nama, kedua URL), untuk pengecekan health. */
    repoDenganUrl() {
      return db.rows('SELECT id, kode, nama, url_beta, url_live FROM repo WHERE url_beta IS NOT NULL OR url_live IS NOT NULL ORDER BY nama');
    },
    /** Menghapus satu entri teknologi. */
    hapusTeknologi(id) {
      return db.exec('DELETE FROM repo_teknologi WHERE id = ?', [id]);
    },
  };
}
