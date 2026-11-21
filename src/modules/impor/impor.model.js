import 'server-only';

/** Model impor: tabel impor_hasil, status sesi, pencarian kandidat dependensi, dampak, dan audit. */
export function buatImporModel({ db, idGen }) {
  return {
    // ---------- impor_hasil & sesi ----------

    /** Menyimpan JSON mentah hasil agen; mengembalikan id (string). */
    async buat(sesiId, jsonMentah, conn) {
      const id = idGen.generate();
      await db.exec('INSERT INTO impor_hasil (id, sesi_prompt_id, json_mentah) VALUES (?, ?, ?)', [id, sesiId, jsonMentah], conn);
      return id;
    },
    /** Satu impor beserta sesi, repo, dan perubahan terkait; null bila tidak ada. */
    byId(id, conn) {
      return db.first(
        `SELECT i.id, i.json_mentah, i.status, i.created_at,
                s.id AS sesi_id, s.unique_id, s.jenis, s.status AS sesi_status, s.perubahan_id,
                r.id AS repo_id, r.kode AS repo_kode, r.nama AS repo_nama, r.branch_utama,
                r.hash_audit_terakhir, r.tanggal_audit_terakhir,
                p.tipe AS perubahan_tipe, p.nomor AS perubahan_nomor
         FROM impor_hasil i
         JOIN sesi_prompt s ON s.id = i.sesi_prompt_id
         JOIN repo r ON r.id = s.repo_id
         LEFT JOIN perubahan p ON p.id = s.perubahan_id
         WHERE i.id = ?`,
        [id],
        conn,
      );
    },
    /** Impor terbaru untuk halaman daftar (opsional difilter per unique_id). */
    daftar(uniqueId, batas) {
      // hasil uji (jenis pengujian) dikelola di halaman Uji CR dan tidak punya halaman review, jadi tidak ikut daftar
      const where = uniqueId ? "WHERE s.jenis <> 'pengujian' AND s.unique_id = ?" : "WHERE s.jenis <> 'pengujian'";
      return db.rows(
        `SELECT i.id, i.status, i.created_at, s.unique_id, s.jenis, r.nama AS repo_nama
         FROM impor_hasil i JOIN sesi_prompt s ON s.id = i.sesi_prompt_id JOIN repo r ON r.id = s.repo_id
         ${where} ORDER BY i.id DESC LIMIT ?`,
        uniqueId ? [uniqueId, batas] : [batas],
      );
    },
    /** Mengubah status impor. */
    ubahStatus(id, status, conn) {
      return db.exec('UPDATE impor_hasil SET status = ? WHERE id = ?', [status, id], conn);
    },
    /** Mengubah status sesi prompt. */
    ubahStatusSesi(sesiId, status, conn) {
      return db.exec('UPDATE sesi_prompt SET status = ? WHERE id = ?', [status, sesiId], conn);
    },

    // ---------- kandidat dependensi (dibatasi pada satu repo) ----------

    /** Modul di repo yang cocok dengan nama/kode/alias. */
    cariModul(repoId, nama) {
      return db.rows(
        `SELECT DISTINCT m.id, m.nama, m.kode FROM modul m LEFT JOIN modul_alias a ON a.modul_id = m.id
         WHERE m.repo_id = ? AND (m.nama = ? OR m.kode = ? OR a.alias = ?) LIMIT 10`,
        [repoId, nama, nama, nama],
      );
    },
    /** Menu di repo yang cocok dengan nama/kode/route/alias. */
    cariMenu(repoId, nama, route) {
      return db.rows(
        `SELECT DISTINCT mn.id, mn.nama, mn.kode, m.nama AS modul_nama
         FROM menu mn JOIN modul m ON m.id = mn.modul_id LEFT JOIN menu_alias a ON a.menu_id = mn.id
         WHERE m.repo_id = ? AND (mn.nama = ? OR mn.kode = ? OR a.alias = ? OR (? IS NOT NULL AND mn.route = ?)) LIMIT 10`,
        [repoId, nama, nama, nama, route, route],
      );
    },
    /** Halaman di repo yang cocok dengan route, atau (bila route kosong) nama/kata kunci. */
    cariHalaman(repoId, nama, route) {
      return db.rows(
        `SELECT DISTINCT h.id, h.nama, h.kode, mn.nama AS menu_nama
         FROM halaman h JOIN menu mn ON mn.id = h.menu_id JOIN modul m ON m.id = mn.modul_id
         LEFT JOIN halaman_kata_kunci k ON k.halaman_id = h.id
         WHERE m.repo_id = ? AND ((? IS NOT NULL AND h.route = ?) OR (? IS NULL AND (h.nama = ? OR k.kata_kunci = ?))) LIMIT 10`,
        [repoId, route, route, route, nama, nama],
      );
    },
    /** Memastikan entitas milik repo (dipakai memverifikasi target_id kiriman klien). */
    async milikRepo(tingkat, id, repoId, conn) {
      const sql = {
        modul: 'SELECT 1 AS ok FROM modul WHERE id = ? AND repo_id = ?',
        menu: 'SELECT 1 AS ok FROM menu mn JOIN modul m ON m.id = mn.modul_id WHERE mn.id = ? AND m.repo_id = ?',
        halaman: 'SELECT 1 AS ok FROM halaman h JOIN menu mn ON mn.id = h.menu_id JOIN modul m ON m.id = mn.modul_id WHERE h.id = ? AND m.repo_id = ?',
      }[tingkat];
      return Boolean(await db.first(sql, [id, repoId], conn));
    },

    // ---------- penerapan ----------

    /** Menambah dependensi satu tingkat (duplikat diabaikan). */
    tambahDependensi(tingkat, dariId, keId, keterangan, conn) {
      const tabel = {
        modul: ['dependensi_modul', 'modul_id', 'ke_modul_id'],
        menu: ['dependensi_menu', 'menu_id', 'ke_menu_id'],
        halaman: ['dependensi_halaman', 'halaman_id', 'ke_halaman_id'],
      }[tingkat];
      return db.exec(`INSERT IGNORE INTO ${tabel[0]} (id, ${tabel[1]}, ${tabel[2]}, keterangan) VALUES (?, ?, ?, ?)`, [idGen.generate(), dariId, keId, keterangan], conn);
    },
    /** Menambah kata kunci halaman (duplikat diabaikan). */
    tambahKataKunciHalaman(halamanId, kataKunci, conn) {
      return db.exec('INSERT IGNORE INTO halaman_kata_kunci (id, halaman_id, kata_kunci) VALUES (?, ?, ?)', [idGen.generate(), halamanId, kataKunci], conn);
    },
    /** Mencatat dampak perubahan CR/B (kolom *_kunci generated tidak diisi; duplikat diabaikan). */
    tambahDampak(d, conn) {
      return db.exec(
        'INSERT IGNORE INTO perubahan_dampak (id, perubahan_id, modul_id, menu_id, halaman_id, impor_hasil_id) VALUES (?, ?, ?, ?, ?, ?)',
        [idGen.generate(), d.perubahan_id, d.modul_id, d.menu_id ?? null, d.halaman_id ?? null, d.impor_hasil_id],
        conn,
      );
    },
    /** Mencatat satu audit bugfix; mengembalikan id. */
    async buatAudit(a, conn) {
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO audit_bugfix (id, repo_id, hash_awal, hash_akhir, tanggal_awal, tanggal_akhir, ringkasan, sesi_prompt_id)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [id, a.repo_id, a.hash_awal, a.hash_akhir, a.tanggal_awal, a.ringkasan, a.sesi_prompt_id],
        conn,
      );
      return id;
    },
    /** Mencatat dampak audit bugfix (duplikat diabaikan). */
    tambahDampakAudit(d, conn) {
      return db.exec(
        'INSERT IGNORE INTO audit_bugfix_dampak (id, audit_bugfix_id, modul_id, menu_id, halaman_id) VALUES (?, ?, ?, ?, ?)',
        [idGen.generate(), d.audit_bugfix_id, d.modul_id, d.menu_id ?? null, d.halaman_id ?? null],
        conn,
      );
    },
    /** Memperbarui acuan audit repo (hanya dipanggil setelah Simpan). */
    perbaruiAuditRepo(repoId, hash, conn) {
      return db.exec('UPDATE repo SET hash_audit_terakhir = ?, tanggal_audit_terakhir = NOW() WHERE id = ?', [hash, repoId], conn);
    },
  };
}
