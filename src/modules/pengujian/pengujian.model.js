import 'server-only';
import { bacaDaftarJson } from '@/utils/jsonKolom';

/** Membaca kolom JSON berisi objek (MariaDB mengembalikan teks); isi rusak dianggap objek kosong. */
function bacaObjekJson(nilai) {
  if (nilai == null) return {};
  if (typeof nilai !== 'string') return nilai;
  try {
    return JSON.parse(nilai);
  } catch {
    // isi rusak: anggap kosong agar halaman tetap terbuka
    return {};
  }
}

/**
 * Model pengujian (Uji CR): tabel pengujian, pengujian_poin, pengujian_poin_target, pengujian_putaran,
 * pengujian_putaran_repo, pengujian_putaran_sel, dan pembacaan skenario untuk menghitung status.
 * Semua id baru dibuat idGen (tanpa AUTO_INCREMENT); kolom menu_kunci (generated) tidak pernah diisi.
 */
export function buatPengujianModel({ db, idGen }) {
  /** Kondisi tambahan "hanya satu pengujian" untuk query yang juga dipakai tanpa filter (daftar semua CR). */
  const kondisi = (kolom, pengujianId) => (pengujianId ? { sql: `${kolom} = ?`, params: [pengujianId] } : { sql: '1 = 1', params: [] });

  return {
    // ---------- pengujian ----------

    /** Daftar Uji CR terbaru beserta jumlah poin dan nomor putaran terakhir. */
    daftar(batas) {
      return db.rows(
        `SELECT p.id, p.cr_id, p.created_at,
                (SELECT COUNT(*) FROM pengujian_poin x WHERE x.pengujian_id = p.id) AS jumlah_poin,
                (SELECT MAX(u.nomor) FROM pengujian_putaran u WHERE u.pengujian_id = p.id) AS putaran_terakhir
         FROM pengujian p ORDER BY p.id DESC LIMIT ?`,
        [batas],
      );
    },
    /** Satu pengujian berdasarkan id, atau null. */
    byId(id, conn) {
      return db.first('SELECT id, cr_id, blueprint_mentah, created_at, updated_at FROM pengujian WHERE id = ?', [id], conn);
    },
    /** Satu pengujian berdasarkan CR ID (tanpa membedakan huruf besar/kecil menurut collation), atau null. */
    byCrId(crId, conn) {
      return db.first('SELECT id, cr_id FROM pengujian WHERE cr_id = ?', [crId], conn);
    },
    /** Baris perubahan lokal (hasil Sync) untuk nomor tertentu, dengan atau tanpa awalan CR/B; null bila belum di-Sync. */
    tipePerubahan(nomorPolos) {
      return db.first('SELECT tipe, nomor FROM perubahan WHERE nomor IN (?, ?, ?) LIMIT 1', [nomorPolos, `CR${nomorPolos}`, `B${nomorPolos}`]);
    },
    /** Menyimpan pengujian baru; mengembalikan id. */
    async buat({ cr_id, blueprint_mentah }, conn) {
      const id = idGen.generate();
      await db.exec('INSERT INTO pengujian (id, cr_id, blueprint_mentah) VALUES (?, ?, ?)', [id, cr_id, blueprint_mentah], conn);
      return id;
    },

    // ---------- poin dan target ----------

    /** Menyimpan satu poin blueprint; mengembalikan id. */
    async buatPoin({ pengujian_id, nomor, isi, ditambah_putaran }, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_poin (id, pengujian_id, nomor, isi, ditambah_putaran) VALUES (?, ?, ?, ?, ?)',
        [id, pengujian_id, nomor, isi, ditambah_putaran],
        conn,
      );
      return id;
    },
    /** Menyimpan target poin (modul saja bila menu_id null); menu_kunci dihitung database. */
    async buatTarget({ pengujian_poin_id, modul_id, menu_id }, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_poin_target (id, pengujian_poin_id, modul_id, menu_id) VALUES (?, ?, ?, ?)',
        [id, pengujian_poin_id, modul_id, menu_id ?? null],
        conn,
      );
      return id;
    },
    /** Poin sebuah pengujian terurut menurut nomor. */
    poinByPengujian(pengujianId) {
      return db.rows('SELECT id, nomor, isi, ditambah_putaran FROM pengujian_poin WHERE pengujian_id = ? ORDER BY nomor', [pengujianId]);
    },
    /** Target semua poin sebuah pengujian beserta nama modul/menu dan info repo. */
    targetByPengujian(pengujianId) {
      return db.rows(
        `SELECT t.pengujian_poin_id AS poin_id, t.modul_id, t.menu_id, m.nama AS modul_nama, mn.nama AS menu_nama,
                m.repo_id, r.kode AS repo_kode, r.nama AS repo_nama, r.platform, r.branch_utama
         FROM pengujian_poin_target t
         JOIN pengujian_poin p ON p.id = t.pengujian_poin_id
         JOIN modul m ON m.id = t.modul_id
         LEFT JOIN menu mn ON mn.id = t.menu_id
         JOIN repo r ON r.id = m.repo_id
         WHERE p.pengujian_id = ? ORDER BY t.id`,
        [pengujianId],
      );
    },

    // ---------- putaran ----------

    /** Apakah unique_id sudah dipakai sebuah putaran. */
    async uniqueIdPutaranAda(uniqueId, conn) {
      return Boolean(await db.first('SELECT 1 AS ada FROM pengujian_putaran WHERE unique_id = ? LIMIT 1', [uniqueId], conn));
    },
    /** Menyimpan putaran uji; mengembalikan id. */
    async buatPutaran({ pengujian_id, nomor, unique_id, keterangan }, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_putaran (id, pengujian_id, nomor, unique_id, keterangan) VALUES (?, ?, ?, ?, ?)',
        [id, pengujian_id, nomor, unique_id, keterangan ?? null],
        conn,
      );
      return id;
    },
    /** Menyimpan data putaran per repo (prompt-nya dirujuk lewat sesi_prompt_id). */
    async buatPutaranRepo({ pengujian_putaran_id, repo_id, sesi_prompt_id }, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_putaran_repo (id, pengujian_putaran_id, repo_id, sesi_prompt_id) VALUES (?, ?, ?, ?)',
        [id, pengujian_putaran_id, repo_id, sesi_prompt_id],
        conn,
      );
      return id;
    },
    /** Menyimpan satu sel (poin x repo) yang diuji pada sebuah putaran. */
    async buatPutaranSel({ pengujian_putaran_id, pengujian_poin_id, repo_id }, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_putaran_sel (id, pengujian_putaran_id, pengujian_poin_id, repo_id) VALUES (?, ?, ?, ?)',
        [id, pengujian_putaran_id, pengujian_poin_id, repo_id],
        conn,
      );
      return id;
    },
    /** Putaran sebuah pengujian terurut menurut nomor. */
    putaranByPengujian(pengujianId) {
      return db.rows('SELECT id, nomor, unique_id, keterangan, created_at FROM pengujian_putaran WHERE pengujian_id = ? ORDER BY nomor', [pengujianId]);
    },
    /** Data per putaran per repo (repo, sesi prompt, hash HEAD, tools, waktu impor) untuk sebuah pengujian. */
    async putaranRepoByPengujian(pengujianId) {
      const baris = await db.rows(
        `SELECT pr.pengujian_putaran_id AS putaran_id, pr.repo_id, pr.sesi_prompt_id, pr.branch, pr.hash_head, pr.diimpor_pada,
                pr.tools_belum_tersedia, r.kode AS repo_kode, r.nama AS repo_nama, r.platform
         FROM pengujian_putaran_repo pr
         JOIN pengujian_putaran u ON u.id = pr.pengujian_putaran_id
         JOIN repo r ON r.id = pr.repo_id
         WHERE u.pengujian_id = ? ORDER BY r.nama`,
        [pengujianId],
      );
      return baris.map((b) => ({ ...b, tools_belum_tersedia: bacaDaftarJson(b.tools_belum_tersedia) }));
    },

    // ---------- versi PDF ----------

    /** Semua versi PDF sebuah pengujian, terbaru lebih dulu (ringkasan_status sudah berupa objek). */
    async pdfByPengujian(pengujianId) {
      const baris = await db.rows(
        'SELECT id, versi, putaran_tercakup, path_file, ringkasan_status, created_at FROM pengujian_pdf WHERE pengujian_id = ? ORDER BY versi DESC',
        [pengujianId],
      );
      return baris.map((b) => ({ ...b, ringkasan_status: bacaObjekJson(b.ringkasan_status) }));
    },
    /** Satu versi PDF beserta pengujian pemiliknya (untuk nama berkas), atau null. */
    pdfById(id) {
      return db.first(
        `SELECT f.id, f.pengujian_id, f.versi, f.path_file, p.cr_id
         FROM pengujian_pdf f JOIN pengujian p ON p.id = f.pengujian_id WHERE f.id = ?`,
        [id],
      );
    },
    /** Nomor versi PDF berikutnya (maksimum + 1; versi lama tidak pernah ditimpa). */
    async versiPdfBerikut(pengujianId) {
      const baris = await db.first('SELECT COALESCE(MAX(versi), 0) + 1 AS versi FROM pengujian_pdf WHERE pengujian_id = ?', [pengujianId]);
      return Number(baris.versi);
    },
    /** Menghapus catatan sebuah versi PDF (dipakai bila pembuatan berkasnya gagal). */
    hapusPdf(id) {
      return db.exec('DELETE FROM pengujian_pdf WHERE id = ?', [id]);
    },
    /** Mencatat sebuah versi PDF; mengembalikan id. */
    async buatPdf({ pengujian_id, versi, putaran_tercakup, path_file, ringkasan_status }) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_pdf (id, pengujian_id, versi, putaran_tercakup, path_file, ringkasan_status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, pengujian_id, versi, putaran_tercakup, path_file, JSON.stringify(ringkasan_status)],
      );
      return id;
    },

    // ---------- catatan keputusan per sel ----------

    /** Semua catatan keputusan sebuah pengujian (per poin x repo). */
    catatanByPengujian(pengujianId) {
      return db.rows(
        `SELECT c.pengujian_poin_id AS poin_id, c.repo_id, c.catatan, c.updated_at
         FROM pengujian_catatan c JOIN pengujian_poin p ON p.id = c.pengujian_poin_id
         WHERE p.pengujian_id = ?`,
        [pengujianId],
      );
    },
    /** Menyimpan catatan sel; bila sudah ada untuk (poin, repo) yang sama, isinya diganti (UNIQUE uq_pcatatan). */
    upsertCatatan({ poin_id, repo_id, catatan }) {
      return db.exec(
        `INSERT INTO pengujian_catatan (id, pengujian_poin_id, repo_id, catatan) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE catatan = VALUES(catatan)`,
        [idGen.generate(), poin_id, repo_id, catatan],
      );
    },
    /** Menghapus catatan sel (catatan dikosongkan). */
    hapusCatatan({ poin_id, repo_id }) {
      return db.exec('DELETE FROM pengujian_catatan WHERE pengujian_poin_id = ? AND repo_id = ?', [poin_id, repo_id]);
    },

    // ---------- impor hasil uji ----------

    /** Putaran berdasarkan unique_id beserta pengujian pemiliknya, atau null. */
    putaranByUniqueId(uniqueId, conn) {
      return db.first(
        `SELECT u.id, u.pengujian_id, u.nomor, u.unique_id, p.cr_id
         FROM pengujian_putaran u JOIN pengujian p ON p.id = u.pengujian_id WHERE u.unique_id = ?`,
        [uniqueId],
        conn,
      );
    },
    /** Data putaran-repo berdasarkan putaran dan kode repo, atau null bila repo tidak termasuk putaran itu. */
    putaranRepoByKode(putaranId, kodeRepo, conn) {
      return db.first(
        `SELECT pr.id, pr.repo_id, pr.sesi_prompt_id, pr.diimpor_pada, r.kode AS repo_kode, r.nama AS repo_nama
         FROM pengujian_putaran_repo pr JOIN repo r ON r.id = pr.repo_id
         WHERE pr.pengujian_putaran_id = ? AND r.kode = ?`,
        [putaranId, kodeRepo],
        conn,
      );
    },
    /** Poin yang ditugaskan pada sebuah putaran untuk satu repo (id dan nomor). */
    poinDitugaskan(putaranId, repoId, conn) {
      return db.rows(
        `SELECT pp.id, pp.nomor
         FROM pengujian_putaran_sel s JOIN pengujian_poin pp ON pp.id = s.pengujian_poin_id
         WHERE s.pengujian_putaran_id = ? AND s.repo_id = ?`,
        [putaranId, repoId],
        conn,
      );
    },
    /** Nama berkas bukti semua skenario sebuah putaran-repo (untuk membersihkan berkas lama saat impor ulang). */
    async buktiPutaranRepo(putaranId, repoId, conn) {
      const baris = await db.rows('SELECT bukti FROM pengujian_skenario WHERE pengujian_putaran_id = ? AND repo_id = ?', [putaranId, repoId], conn);
      return baris.flatMap((b) => bacaDaftarJson(b.bukti));
    },
    /** Menghapus hasil (skenario dan analisis perubahan) sebuah putaran-repo sebelum diisi ulang. */
    async hapusHasilRepo(putaranId, repoId, conn) {
      await db.exec('DELETE FROM pengujian_skenario WHERE pengujian_putaran_id = ? AND repo_id = ?', [putaranId, repoId], conn);
      await db.exec('DELETE FROM pengujian_perubahan WHERE pengujian_putaran_id = ? AND repo_id = ?', [putaranId, repoId], conn);
    },
    /** Menyimpan satu skenario hasil uji; mengembalikan id. */
    async tambahSkenario(s, conn) {
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO pengujian_skenario
           (id, pengujian_putaran_id, repo_id, pengujian_poin_id, kode, nama, tipe, jenis, langkah, hasil_diharapkan, hasil_aktual, status, catatan, bukti)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, s.putaran_id, s.repo_id, s.poin_id, s.kode, s.nama, s.tipe, s.jenis, s.langkah, s.hasil_diharapkan, s.hasil_aktual, s.status, s.catatan, JSON.stringify(s.bukti)],
        conn,
      );
      return id;
    },
    /** Menyimpan satu entri analisis perubahan; mengembalikan id. */
    async tambahPerubahan(p, conn) {
      const id = idGen.generate();
      await db.exec(
        'INSERT INTO pengujian_perubahan (id, pengujian_putaran_id, repo_id, pengujian_poin_id, kategori, ringkasan, file) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, p.putaran_id, p.repo_id, p.poin_id, p.kategori, p.ringkasan, JSON.stringify(p.file)],
        conn,
      );
      return id;
    },
    /** Mengisi data hasil impor pada putaran-repo (hash HEAD, branch, pernyataan tools, waktu impor). */
    isiPutaranRepo({ id, branch, hash_head, tools_belum_tersedia }, conn) {
      return db.exec(
        'UPDATE pengujian_putaran_repo SET branch = ?, hash_head = ?, tools_belum_tersedia = ?, diimpor_pada = NOW() WHERE id = ?',
        [branch, hash_head, JSON.stringify(tools_belum_tersedia), id],
        conn,
      );
    },
    /** Semua skenario sebuah pengujian beserta nomor putaran dan info repo. */
    async skenarioByPengujian(pengujianId) {
      const baris = await db.rows(
        `SELECT c.id, c.pengujian_putaran_id AS putaran_id, u.nomor AS putaran_nomor, c.repo_id, c.pengujian_poin_id AS poin_id,
                c.kode, c.nama, c.tipe, c.jenis, c.langkah, c.hasil_diharapkan, c.hasil_aktual, c.status, c.catatan, c.bukti
         FROM pengujian_skenario c JOIN pengujian_putaran u ON u.id = c.pengujian_putaran_id
         WHERE u.pengujian_id = ? ORDER BY u.nomor, c.kode`,
        [pengujianId],
      );
      return baris.map((b) => ({ ...b, bukti: bacaDaftarJson(b.bukti) }));
    },
    /** Semua entri analisis perubahan sebuah pengujian beserta nomor putaran. */
    async perubahanByPengujian(pengujianId) {
      const baris = await db.rows(
        `SELECT x.id, x.pengujian_putaran_id AS putaran_id, u.nomor AS putaran_nomor, x.repo_id, x.pengujian_poin_id AS poin_id,
                x.kategori, x.ringkasan, x.file
         FROM pengujian_perubahan x JOIN pengujian_putaran u ON u.id = x.pengujian_putaran_id
         WHERE u.pengujian_id = ? ORDER BY u.nomor, x.id`,
        [pengujianId],
      );
      return baris.map((b) => ({ ...b, file: bacaDaftarJson(b.file) }));
    },
    /** Satu skenario beserta info untuk membentuk path bukti (pengujian, nomor putaran, kode repo), atau null. */
    skenarioUntukBukti(skenarioId) {
      return db.first(
        `SELECT c.id, c.bukti, u.pengujian_id, u.nomor AS putaran_nomor, r.kode AS repo_kode
         FROM pengujian_skenario c
         JOIN pengujian_putaran u ON u.id = c.pengujian_putaran_id
         JOIN repo r ON r.id = c.repo_id
         WHERE c.id = ?`,
        [skenarioId],
      );
    },

    // ---------- bahan perhitungan status (satu pengujian, atau semua bila pengujianId kosong) ----------

    /** Sel yang terlibat: pasangan (poin, repo) yang diturunkan dari modul.repo_id pada target poin. */
    targetRepo(pengujianId = null) {
      const k = kondisi('p.pengujian_id', pengujianId);
      return db.rows(
        `SELECT DISTINCT p.pengujian_id, t.pengujian_poin_id AS poin_id, m.repo_id
         FROM pengujian_poin_target t
         JOIN pengujian_poin p ON p.id = t.pengujian_poin_id
         JOIN modul m ON m.id = t.modul_id
         WHERE ${k.sql}`,
        k.params,
      );
    },
    /** Sel yang diuji pada tiap putaran. */
    selPutaran(pengujianId = null) {
      const k = kondisi('u.pengujian_id', pengujianId);
      return db.rows(
        `SELECT u.pengujian_id, s.pengujian_putaran_id AS putaran_id, u.nomor AS putaran_nomor,
                s.pengujian_poin_id AS poin_id, s.repo_id
         FROM pengujian_putaran_sel s JOIN pengujian_putaran u ON u.id = s.pengujian_putaran_id
         WHERE ${k.sql}`,
        k.params,
      );
    },
    /** Status skenario yang terkait poin blueprint (skenario di luar blueprint tidak memengaruhi sel). */
    statusSkenario(pengujianId = null) {
      const k = kondisi('u.pengujian_id', pengujianId);
      return db.rows(
        `SELECT u.pengujian_id, c.pengujian_putaran_id AS putaran_id, c.pengujian_poin_id AS poin_id, c.repo_id, c.status
         FROM pengujian_skenario c JOIN pengujian_putaran u ON u.id = c.pengujian_putaran_id
         WHERE c.pengujian_poin_id IS NOT NULL AND ${k.sql}`,
        k.params,
      );
    },

    // ---------- pilihan target untuk form ----------

    /** Semua modul beserta nama repo-nya. */
    modulDenganRepo() {
      return db.rows(
        `SELECT m.id, m.nama, r.nama AS repo_nama
         FROM modul m JOIN repo r ON r.id = m.repo_id ORDER BY r.nama, m.nama`,
      );
    },
    /** Semua menu (id, modul pemilik, nama). */
    semuaMenu() {
      return db.rows('SELECT id, modul_id, nama FROM menu ORDER BY urutan, nama');
    },
    /** Modul tertentu beserta info repo yang dipakai prompt (kode, platform, branch). */
    modulBerepo(modulIds) {
      // tidak ada id: hindari IN () kosong yang error
      if (modulIds.length === 0) return Promise.resolve([]);
      return db.rows(
        `SELECT m.id, m.nama, m.repo_id, r.kode AS repo_kode, r.nama AS repo_nama, r.platform, r.branch_utama
         FROM modul m JOIN repo r ON r.id = m.repo_id WHERE m.id IN (?)`,
        [modulIds],
      );
    },
    /** Menu tertentu (id, modul pemilik, nama) untuk memeriksa bahwa menu milik modul yang dipilih. */
    menuByIds(menuIds) {
      // tidak ada id: hindari IN () kosong yang error
      if (menuIds.length === 0) return Promise.resolve([]);
      return db.rows('SELECT id, modul_id, nama FROM menu WHERE id IN (?)', [menuIds]);
    },
  };
}
