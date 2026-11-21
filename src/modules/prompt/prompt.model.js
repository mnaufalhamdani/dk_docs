import 'server-only';
import { bacaDaftarJson } from '@/utils/jsonKolom';

/** Model prompt: tabel sesi_prompt, sesi_prompt_modul, dan pembacaan registry untuk isi prompt. */
export function buatPromptModel({ db, idGen }) {
  return {
    // ---------- sesi ----------

    /** Apakah unique_id sudah dipakai sesi mana pun. */
    async uniqueIdAda(uniqueId, conn) {
      return Boolean(await db.first('SELECT 1 AS ada FROM sesi_prompt WHERE unique_id = ? LIMIT 1', [uniqueId], conn));
    },
    /** Menyimpan satu sesi (satu repo); mengembalikan id. */
    async buatSesi(data, conn) {
      // id dibuat oleh generator (tanpa AUTO_INCREMENT)
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO sesi_prompt (id, unique_id, repo_id, jenis, perubahan_id, isi_prompt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.unique_id, data.repo_id, data.jenis, data.perubahan_id ?? null, data.isi_prompt],
        conn,
      );
      return id;
    },
    /** Mengaitkan modul target ke sesi. */
    tambahModulSesi(sesiId, modulId, conn) {
      return db.exec('INSERT IGNORE INTO sesi_prompt_modul (sesi_prompt_id, modul_id) VALUES (?, ?)', [sesiId, modulId], conn);
    },
    /** Semua sesi dengan unique_id tertentu (satu per repo) beserta info repo dan perubahan. */
    sesiByUniqueId(uniqueId) {
      return db.rows(
        `SELECT s.*, r.kode AS repo_kode, r.nama AS repo_nama, p.tipe AS perubahan_tipe, p.nomor AS perubahan_nomor
         FROM sesi_prompt s
         JOIN repo r ON r.id = s.repo_id
         LEFT JOIN perubahan p ON p.id = s.perubahan_id
         WHERE s.unique_id = ? ORDER BY r.nama`,
        [uniqueId],
      );
    },
    /** Satu sesi berdasarkan (unique_id, kode repo), atau null. */
    sesiByUniqueRepo(uniqueId, kodeRepo, conn) {
      return db.first(
        `SELECT s.*, r.kode AS repo_kode, r.nama AS repo_nama, p.nomor AS perubahan_nomor
         FROM sesi_prompt s JOIN repo r ON r.id = s.repo_id LEFT JOIN perubahan p ON p.id = s.perubahan_id
         WHERE s.unique_id = ? AND r.kode = ?`,
        [uniqueId, kodeRepo],
        conn,
      );
    },
    /** Sesi terbaru (satu baris per unique_id) untuk halaman daftar prompt. */
    daftarSesi(batas) {
      return db.rows(
        `SELECT s.unique_id, s.jenis, MAX(s.created_at) AS dibuat,
                GROUP_CONCAT(DISTINCT r.nama ORDER BY r.nama SEPARATOR ', ') AS repo_nama,
                GROUP_CONCAT(DISTINCT s.status ORDER BY s.status SEPARATOR ', ') AS status,
                MAX(p.nomor) AS perubahan_nomor, MAX(p.tipe) AS perubahan_tipe
         FROM sesi_prompt s JOIN repo r ON r.id = s.repo_id LEFT JOIN perubahan p ON p.id = s.perubahan_id
         GROUP BY s.unique_id, s.jenis ORDER BY dibuat DESC, s.unique_id DESC LIMIT ?`,
        [batas],
      );
    },

    // ---------- bahan isi prompt ----------

    /** Semua modul dalam repo. */
    modulRepo(repoId) {
      return db.rows('SELECT id, kode, nama, path_kode, ringkasan, is_stub FROM modul WHERE repo_id = ? ORDER BY nama', [repoId]);
    },
    /** Semua menu dalam repo. */
    menuRepo(repoId) {
      return db.rows(
        `SELECT mn.id, mn.modul_id, mn.kode, mn.nama, mn.pola, mn.route, mn.path_kode, mn.ringkasan, mn.is_stub
         FROM menu mn JOIN modul m ON m.id = mn.modul_id WHERE m.repo_id = ? ORDER BY mn.urutan, mn.nama`,
        [repoId],
      );
    },
    /** Semua halaman dalam repo (file_utama sudah berupa array). */
    async halamanRepo(repoId) {
      const baris = await db.rows(
        `SELECT h.id, h.menu_id, h.kode, h.nama, h.jenis, h.route, h.file_utama, h.is_stub
         FROM halaman h JOIN menu mn ON mn.id = h.menu_id JOIN modul m ON m.id = mn.modul_id
         WHERE m.repo_id = ? ORDER BY h.urutan, h.id`,
        [repoId],
      );
      return baris.map((h) => ({ ...h, file_utama: bacaDaftarJson(h.file_utama) }));
    },
    /** Poin dokumentasi milik halaman pada modul-modul tertentu. */
    poinByModulIds(modulIds) {
      // tidak ada modul: tidak ada poin (IN () kosong akan error)
      if (modulIds.length === 0) return Promise.resolve([]);
      return db.rows(
        `SELECT p.id, p.halaman_id, p.bagian, p.isi, p.urutan
         FROM poin_dokumentasi p JOIN halaman h ON h.id = p.halaman_id JOIN menu mn ON mn.id = h.menu_id
         WHERE mn.modul_id IN (?) ORDER BY p.urutan, p.id`,
        [modulIds],
      );
    },
    /** Tautan CR/B (aktif/pending) milik poin pada modul-modul tertentu, untuk penanda di prompt. */
    tautanByModulIds(modulIds) {
      // tidak ada modul: tidak ada tautan (IN () kosong akan error)
      if (modulIds.length === 0) return Promise.resolve([]);
      return db.rows(
        `SELECT pp.poin_id, pp.status, pr.tipe, pr.nomor
         FROM poin_perubahan pp
         JOIN perubahan pr ON pr.id = pp.perubahan_id
         JOIN poin_dokumentasi p ON p.id = pp.poin_id
         JOIN halaman h ON h.id = p.halaman_id JOIN menu mn ON mn.id = h.menu_id
         WHERE mn.modul_id IN (?) AND pp.status IN ('aktif','pending')
         ORDER BY pp.id`,
        [modulIds],
      );
    },
    /** Alias database dan kata kunci modul-modul tertentu. */
    aliasModul(modulIds) {
      if (modulIds.length === 0) return Promise.resolve([]);
      return db.rows('SELECT modul_id, alias, jenis FROM modul_alias WHERE modul_id IN (?) ORDER BY alias', [modulIds]);
    },
  };
}
