import 'server-only';

/** Model blueprint: tabel blueprint, blueprint_poin, blueprint_poin_target, blueprint_kelompok, dan bahan pencocokan. */
export function buatBlueprintModel({ db, idGen }) {
  return {
    // ---------- blueprint ----------

    /** Blueprint terbaru beserta jumlah poin, kelompok, dan prompt. */
    daftar(batas) {
      return db.rows(
        `SELECT b.id, b.judul, b.created_at, r.nama AS repo_nama,
           (SELECT COUNT(*) FROM blueprint_poin p WHERE p.blueprint_id = b.id) AS jumlah_poin,
           (SELECT COUNT(*) FROM blueprint_kelompok k WHERE k.blueprint_id = b.id) AS jumlah_kelompok,
           (SELECT COUNT(*) FROM blueprint_kelompok k WHERE k.blueprint_id = b.id AND k.sesi_prompt_id IS NOT NULL) AS jumlah_prompt
         FROM blueprint b JOIN repo r ON r.id = b.repo_id ORDER BY b.id DESC LIMIT ?`,
        [batas],
      );
    },
    /** Satu blueprint beserta repo-nya, atau null. */
    byId(id, conn) {
      return db.first(
        `SELECT b.*, r.kode AS repo_kode, r.nama AS repo_nama, r.branch_utama
         FROM blueprint b JOIN repo r ON r.id = b.repo_id WHERE b.id = ?`,
        [id],
        conn,
      );
    },
    /** Membuat blueprint; mengembalikan id. */
    async buat(data, conn) {
      const id = idGen.generate();
      await db.exec('INSERT INTO blueprint (id, repo_id, judul, isi_mentah) VALUES (?, ?, ?, ?)', [id, data.repo_id, data.judul, data.isi_mentah], conn);
      return id;
    },
    /** Menghapus blueprint (poin, target, dan kelompok ikut terhapus oleh FK cascade). */
    hapus(id) {
      return db.exec('DELETE FROM blueprint WHERE id = ?', [id]);
    },

    // ---------- poin & target ----------

    /** Poin blueprint terurut nomor. */
    poinByBlueprint(blueprintId, conn) {
      return db.rows('SELECT id, nomor, isi, kelompok_id FROM blueprint_poin WHERE blueprint_id = ? ORDER BY nomor', [blueprintId], conn);
    },
    /**
     * Mengganti seluruh poin (nomor 1..n). Kelompok ikut dihapus karena isinya tidak lagi valid;
     * target poin terhapus lewat FK cascade. Mengembalikan array { id, nomor, isi }.
     */
    async gantiPoin(blueprintId, daftarIsi, conn) {
      await db.exec('DELETE FROM blueprint_kelompok WHERE blueprint_id = ?', [blueprintId], conn);
      await db.exec('DELETE FROM blueprint_poin WHERE blueprint_id = ?', [blueprintId], conn);
      const hasil = [];
      for (const [i, isi] of daftarIsi.entries()) {
        const id = idGen.generate();
        await db.exec('INSERT INTO blueprint_poin (id, blueprint_id, nomor, isi) VALUES (?, ?, ?, ?)', [id, blueprintId, i + 1, isi], conn);
        hasil.push({ id, nomor: i + 1, isi });
      }
      return hasil;
    },
    /** Semua target (modul/menu/halaman) poin sebuah blueprint beserta namanya. */
    targetByBlueprint(blueprintId) {
      return db.rows(
        `SELECT t.blueprint_poin_id, p.nomor, t.modul_id, mo.nama AS modul_nama, t.menu_id, mn.nama AS menu_nama,
                t.halaman_id, h.nama AS halaman_nama, t.peran
         FROM blueprint_poin_target t
         JOIN blueprint_poin p ON p.id = t.blueprint_poin_id
         JOIN modul mo ON mo.id = t.modul_id
         LEFT JOIN menu mn ON mn.id = t.menu_id
         LEFT JOIN halaman h ON h.id = t.halaman_id
         WHERE p.blueprint_id = ? ORDER BY p.nomor, t.id`,
        [blueprintId],
      );
    },
    /** Mengganti seluruh target poin dalam blueprint. Kolom *_kunci (generated) tidak diisi. */
    async gantiTarget(blueprintId, baris, conn) {
      await db.exec(
        'DELETE t FROM blueprint_poin_target t JOIN blueprint_poin p ON p.id = t.blueprint_poin_id WHERE p.blueprint_id = ?',
        [blueprintId],
        conn,
      );
      for (const b of baris) {
        await db.exec(
          'INSERT IGNORE INTO blueprint_poin_target (id, blueprint_poin_id, modul_id, menu_id, halaman_id, peran) VALUES (?, ?, ?, ?, ?, ?)',
          [idGen.generate(), b.poin_id, b.modul_id, b.menu_id ?? null, b.halaman_id ?? null, b.peran],
          conn,
        );
      }
    },

    // ---------- kelompok ----------

    /** Menghapus semua kelompok blueprint (poin.kelompok_id otomatis NULL). */
    hapusKelompok(blueprintId, conn) {
      return db.exec('DELETE FROM blueprint_kelompok WHERE blueprint_id = ?', [blueprintId], conn);
    },
    /** Membuat satu kelompok; mengembalikan id. */
    async buatKelompok(k, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO blueprint_kelompok (id, blueprint_id, modul_id, urutan, alasan_urutan) VALUES (?, ?, ?, ?, ?)',
        [id, k.blueprint_id, k.modul_id, k.urutan, k.alasan],
        conn,
      );
      return id;
    },
    /** Menempatkan poin (menurut nomor) ke sebuah kelompok. */
    setKelompokPoin(blueprintId, kelompokId, nomor, conn) {
      // tidak ada nomor: tidak ada yang diubah (IN () kosong akan error)
      if (nomor.length === 0) return Promise.resolve(null);
      return db.exec('UPDATE blueprint_poin SET kelompok_id = ? WHERE blueprint_id = ? AND nomor IN (?)', [kelompokId, blueprintId, nomor], conn);
    },
    /** Kelompok terurut beserta nama modul dan unique_id prompt (bila sudah dibuat). */
    kelompokByBlueprint(blueprintId, conn) {
      return db.rows(
        `SELECT k.id, k.modul_id, k.urutan, k.alasan_urutan, k.sesi_prompt_id, mo.nama AS modul_nama, s.unique_id
         FROM blueprint_kelompok k JOIN modul mo ON mo.id = k.modul_id LEFT JOIN sesi_prompt s ON s.id = k.sesi_prompt_id
         WHERE k.blueprint_id = ? ORDER BY k.urutan`,
        [blueprintId],
        conn,
      );
    },
    /** Mengaitkan kelompok dengan sesi prompt hasil pembuatan. */
    setSesiKelompok(kelompokId, sesiId, conn) {
      return db.exec('UPDATE blueprint_kelompok SET sesi_prompt_id = ? WHERE id = ?', [sesiId, kelompokId], conn);
    },
    /** Prompt tiap kelompok (terurut) untuk halaman hasil. */
    promptByBlueprint(blueprintId) {
      return db.rows(
        `SELECT k.id AS kelompok_id, k.urutan, k.alasan_urutan, mo.nama AS modul_nama,
                s.id AS sesi_id, s.unique_id, s.isi_prompt, s.status, r.kode AS repo_kode, r.nama AS repo_nama
         FROM blueprint_kelompok k
         JOIN modul mo ON mo.id = k.modul_id
         JOIN sesi_prompt s ON s.id = k.sesi_prompt_id
         JOIN repo r ON r.id = s.repo_id
         WHERE k.blueprint_id = ? ORDER BY k.urutan`,
        [blueprintId],
      );
    },

    // ---------- bahan pencocokan & urutan ----------

    /** Alias modul (database & kata kunci) seluruh repo. */
    aliasModulRepo(repoId) {
      return db.rows('SELECT a.modul_id, a.alias FROM modul_alias a JOIN modul m ON m.id = a.modul_id WHERE m.repo_id = ?', [repoId]);
    },
    /** Alias menu (database & kata kunci) seluruh repo. */
    aliasMenuRepo(repoId) {
      return db.rows(
        'SELECT a.menu_id, a.alias FROM menu_alias a JOIN menu mn ON mn.id = a.menu_id JOIN modul m ON m.id = mn.modul_id WHERE m.repo_id = ?',
        [repoId],
      );
    },
    /** Kata kunci halaman seluruh repo. */
    kataKunciHalamanRepo(repoId) {
      return db.rows(
        `SELECT k.halaman_id, k.kata_kunci FROM halaman_kata_kunci k
         JOIN halaman h ON h.id = k.halaman_id JOIN menu mn ON mn.id = h.menu_id JOIN modul m ON m.id = mn.modul_id WHERE m.repo_id = ?`,
        [repoId],
      );
    },
    /** Dependensi antar modul dalam repo (dipakai menentukan urutan). */
    dependensiModulRepo(repoId) {
      return db.rows('SELECT d.modul_id, d.ke_modul_id FROM dependensi_modul d JOIN modul m ON m.id = d.modul_id WHERE m.repo_id = ?', [repoId]);
    },
  };
}
