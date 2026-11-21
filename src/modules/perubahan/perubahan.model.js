import 'server-only';

/** Kolom yang boleh dipakai sebagai kunci riwayat (daftar putih; dirangkai langsung ke SQL). */
const KOLOM_RIWAYAT = Object.freeze({ modul: 'modul_id', menu: 'menu_id', halaman: 'halaman_id' });

/** Potongan SELECT yang sama untuk semua query riwayat perubahan. */
const SELECT_RIWAYAT = `p.id AS perubahan_id, p.tipe, p.nomor,
  COALESCE((SELECT MAX(x.tanggal) FROM perubahan_pesan x WHERE x.perubahan_id = p.id), p.created_at) AS tanggal,
  (SELECT x.pesan FROM perubahan_pesan x WHERE x.perubahan_id = p.id ORDER BY x.tanggal DESC, x.id DESC LIMIT 1) AS ringkasan`;

/** Kondisi SQL "perubahan sudah masuk dokumentasi": punya baris poin_perubahan atau perubahan_dampak. */
export const SUDAH_DOKUMENTASI = `EXISTS (SELECT 1 FROM poin_perubahan t WHERE t.perubahan_id = p.id)
  OR EXISTS (SELECT 1 FROM perubahan_dampak dd WHERE dd.perubahan_id = p.id)`;

/** Mengubah daftar id menjadi placeholder aman; array kosong dijaga di pemanggil. */
const ADA_ISI = (ids) => Array.isArray(ids) && ids.length > 0;

/**
 * Membangun klausa WHERE dan parameternya dari filter daftar perubahan.
 * Urutan parameter sengaja sama dengan urutan placeholder pada klausa.
 */
function bangunKondisi(f) {
  const where = [];
  const params = [];

  if (f.tipe) {
    where.push('p.tipe = ?');
    params.push(f.tipe);
  }
  // pencarian bebas: cocok pada nomor ATAU isi pesan (FULLTEXT bila memungkinkan)
  if (f.q) {
    const pesan = f.ekspresiFt
      ? 'EXISTS (SELECT 1 FROM perubahan_pesan m WHERE m.perubahan_id = p.id AND MATCH(m.pesan) AGAINST (? IN BOOLEAN MODE))'
      : 'EXISTS (SELECT 1 FROM perubahan_pesan m WHERE m.perubahan_id = p.id AND m.pesan LIKE ?)';
    where.push(`(p.nomor LIKE ? OR ${pesan})`);
    params.push(f.like, f.ekspresiFt ?? f.like);
  }

  // sudah masuk dokumentasi = punya tautan poin ATAU dampak dokumentasi; belum = kebalikannya
  if (f.dokumentasi) {
    where.push(f.dokumentasi === 'sudah' ? `(${SUDAH_DOKUMENTASI})` : `NOT (${SUDAH_DOKUMENTASI})`);
  }

  // filter tingkat pesan digabung dalam satu EXISTS agar berlaku pada pesan yang sama
  const pesan = [];
  if (f.developer) {
    pesan.push('m.user_name = ?');
    params.push(f.developer);
  }
  if (f.dari) {
    pesan.push('m.tanggal >= ?');
    params.push(`${f.dari} 00:00:00`);
  }
  if (f.sampai) {
    pesan.push('m.tanggal <= ?');
    params.push(`${f.sampai} 23:59:59`);
  }
  if (f.modul_id) {
    pesan.push('EXISTS (SELECT 1 FROM perubahan_pesan_peta pp WHERE pp.perubahan_pesan_id = m.id AND pp.modul_id = ?)');
    params.push(f.modul_id);
  }
  if (f.repo_id) {
    pesan.push('EXISTS (SELECT 1 FROM perubahan_pesan_peta pp JOIN modul mo ON mo.id = pp.modul_id WHERE pp.perubahan_pesan_id = m.id AND mo.repo_id = ?)');
    params.push(f.repo_id);
  }
  if (pesan.length > 0) {
    where.push(`EXISTS (SELECT 1 FROM perubahan_pesan m WHERE m.perubahan_id = p.id AND ${pesan.join(' AND ')})`);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** Model perubahan: semua query tabel perubahan, pesan, pemetaan, dampak, dan riwayat. */
export function buatPerubahanModel({ db, idGen }) {
  return {
    // ---------- penulisan (dipakai sync) ----------

    /** Satu perubahan berdasarkan (tipe, nomor), atau null. */
    byTipeNomor(tipe, nomor, conn) {
      return db.first('SELECT * FROM perubahan WHERE tipe = ? AND nomor = ?', [tipe, nomor], conn);
    },
    /** Mengambil id perubahan; membuatnya bila belum ada (aman dipanggil berulang). */
    async cariAtauBuat(tipe, nomor, conn) {
      // id baru hanya terpakai bila baris belum ada (duplikat diabaikan oleh UNIQUE KEY)
      await db.exec('INSERT IGNORE INTO perubahan (id, tipe, nomor) VALUES (?, ?, ?)', [idGen.generate(), tipe, nomor], conn);
      const baris = await db.first('SELECT id FROM perubahan WHERE tipe = ? AND nomor = ?', [tipe, nomor], conn);
      return baris.id;
    },
    /** Himpunan sumber_id pesan yang sudah tersimpan pada sebuah perubahan. */
    async sumberIdAda(perubahanId, conn) {
      const baris = await db.rows('SELECT sumber_id FROM perubahan_pesan WHERE perubahan_id = ?', [perubahanId], conn);
      return new Set(baris.map((b) => b.sumber_id));
    },
    /** Menyimpan satu pesan; mengembalikan id barunya. */
    async tambahPesan(perubahanId, p, conn) {
      const id = idGen.generate();
      await db.exec(
        `INSERT INTO perubahan_pesan (id, perubahan_id, sumber_id, pesan, user_id, user_name, tanggal, modul_sumber, menu_sumber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, perubahanId, p.sumber_id, p.pesan, p.user_id, p.user_name, p.tanggal, p.modul_sumber, p.menu_sumber],
        conn,
      );
      return id;
    },
    /** Pesan tersimpan sebuah perubahan (kolom yang dibutuhkan untuk membandingkan dengan sumber). */
    pesanLokal(perubahanId, conn) {
      return db.rows(
        'SELECT id, sumber_id, pesan, user_name, tanggal, modul_sumber, menu_sumber FROM perubahan_pesan WHERE perubahan_id = ? ORDER BY id',
        [perubahanId],
        conn,
      );
    },
    /** Mengubah isi satu pesan tersimpan mengikuti sumber. */
    ubahPesan(id, p, conn) {
      return db.exec(
        'UPDATE perubahan_pesan SET pesan = ?, user_id = ?, user_name = ?, tanggal = ?, modul_sumber = ?, menu_sumber = ? WHERE id = ?',
        [p.pesan, p.user_id, p.user_name, p.tanggal, p.modul_sumber, p.menu_sumber, id],
        conn,
      );
    },
    /** Menghapus pemetaan satu pesan (dipakai saat nama modul/menu mentahnya berubah di sumber). */
    hapusPetaPesan(pesanId, conn) {
      return db.exec('DELETE FROM perubahan_pesan_peta WHERE perubahan_pesan_id = ?', [pesanId], conn);
    },
    /** Menghapus beberapa pesan (pemetaan ikut terhapus oleh FK cascade). */
    hapusPesan(ids, conn) {
      // tidak ada yang dihapus (IN () kosong akan error)
      if (ids.length === 0) return Promise.resolve(null);
      return db.exec('DELETE FROM perubahan_pesan WHERE id IN (?)', [ids], conn);
    },
    /** Himpunan sumber_id pesan yang sengaja tidak disimpan user pada sebuah perubahan. */
    async sumberIdDiabaikan(perubahanId, conn) {
      const baris = await db.rows('SELECT sumber_id FROM perubahan_pesan_abaikan WHERE perubahan_id = ?', [perubahanId], conn);
      return new Set(baris.map((b) => b.sumber_id));
    },
    /** Mencatat pesan sumber yang diabaikan (duplikat diabaikan oleh UNIQUE KEY). */
    tambahAbaikan(perubahanId, sumberId, conn) {
      return db.exec(
        'INSERT IGNORE INTO perubahan_pesan_abaikan (id, perubahan_id, sumber_id) VALUES (?, ?, ?)',
        [idGen.generate(), perubahanId, sumberId],
        conn,
      );
    },
    /** Mencabut status diabaikan (saat pesan akhirnya dicentang dan disimpan). */
    hapusAbaikan(perubahanId, sumberIds, conn) {
      // tidak ada yang dicabut (IN () kosong akan error)
      if (sumberIds.length === 0) return Promise.resolve(null);
      return db.exec('DELETE FROM perubahan_pesan_abaikan WHERE perubahan_id = ? AND sumber_id IN (?)', [perubahanId, sumberIds], conn);
    },
    /** Menambah baris pemetaan (kolom *_kunci generated, tidak diisi). Duplikat diabaikan. */
    tambahPeta(pesanId, modulId, menuId, conn) {
      return db.exec(
        'INSERT IGNORE INTO perubahan_pesan_peta (id, perubahan_pesan_id, modul_id, menu_id) VALUES (?, ?, ?, ?)',
        [idGen.generate(), pesanId, modulId, menuId],
        conn,
      );
    },
    /** Modul yang punya alias database sama dengan nama mentah. */
    aliasModulCocok(nama, conn) {
      return db.rows("SELECT DISTINCT modul_id FROM modul_alias WHERE jenis = 'database' AND alias = ?", [nama], conn);
    },
    /** Menu yang punya alias database sama dengan nama mentah (beserta modul induknya). */
    aliasMenuCocok(nama, conn) {
      return db.rows(
        `SELECT DISTINCT a.menu_id, mn.modul_id FROM menu_alias a JOIN menu mn ON mn.id = a.menu_id
         WHERE a.jenis = 'database' AND a.alias = ?`,
        [nama],
        conn,
      );
    },
    /**
     * Pesan yang belum punya pemetaan. Filter opsional: perubahanId, dan/atau pasangan
     * nama mentah (modulSumber/menuSumber; null dibandingkan secara null-safe).
     */
    pesanBelumDipetakan(filter, conn) {
      const where = ['NOT EXISTS (SELECT 1 FROM perubahan_pesan_peta pp WHERE pp.perubahan_pesan_id = m.id)'];
      const params = [];
      if (filter.perubahanId) {
        where.push('m.perubahan_id = ?');
        params.push(filter.perubahanId);
      }
      if ('modulSumber' in filter) {
        where.push('m.modul_sumber <=> ? AND m.menu_sumber <=> ?');
        params.push(filter.modulSumber, filter.menuSumber ?? null);
      }
      return db.rows(`SELECT m.id, m.modul_sumber, m.menu_sumber FROM perubahan_pesan m WHERE ${where.join(' AND ')}`, params, conn);
    },
    /** Modul beserta nama repo untuk daftar id. */
    modulByIds(ids) {
      if (!ADA_ISI(ids)) return Promise.resolve([]);
      return db.rows('SELECT m.id, m.nama, r.nama AS repo_nama FROM modul m JOIN repo r ON r.id = m.repo_id WHERE m.id IN (?)', [ids]);
    },
    /** Menu untuk daftar id. */
    menuByIds(ids) {
      if (!ADA_ISI(ids)) return Promise.resolve([]);
      return db.rows('SELECT id, nama, modul_id FROM menu WHERE id IN (?)', [ids]);
    },

    // ---------- pembacaan ----------

    /** Daftar perubahan sesuai filter, terbaru dulu, dengan ringkasan agregat. */
    cari(filter, batas, offset) {
      const { sql, params } = bangunKondisi(filter);
      return db.rows(
        `SELECT p.id, p.tipe, p.nomor,
           (SELECT COUNT(*) FROM perubahan_pesan x WHERE x.perubahan_id = p.id) AS jumlah_pesan,
           (SELECT MAX(x.tanggal) FROM perubahan_pesan x WHERE x.perubahan_id = p.id) AS tanggal_terakhir,
           (SELECT GROUP_CONCAT(DISTINCT x.user_name ORDER BY x.user_name SEPARATOR ', ') FROM perubahan_pesan x WHERE x.perubahan_id = p.id) AS developer,
           (SELECT GROUP_CONCAT(DISTINCT mo.nama ORDER BY mo.nama SEPARATOR ', ')
              FROM perubahan_pesan x JOIN perubahan_pesan_peta pp ON pp.perubahan_pesan_id = x.id JOIN modul mo ON mo.id = pp.modul_id
              WHERE x.perubahan_id = p.id) AS modul_nama,
           (SELECT COUNT(*) FROM perubahan_pesan x WHERE x.perubahan_id = p.id
              AND NOT EXISTS (SELECT 1 FROM perubahan_pesan_peta pp WHERE pp.perubahan_pesan_id = x.id)) AS belum_dipetakan,
           (${SUDAH_DOKUMENTASI}) AS sudah_didokumentasi
         FROM perubahan p ${sql}
         ORDER BY tanggal_terakhir DESC, p.id DESC LIMIT ? OFFSET ?`,
        [...params, batas, offset],
      );
    },
    /** Jumlah perubahan yang cocok dengan filter (untuk paginasi). */
    async hitung(filter) {
      const { sql, params } = bangunKondisi(filter);
      const baris = await db.first(`SELECT COUNT(*) AS jumlah FROM perubahan p ${sql}`, params);
      return Number(baris.jumlah);
    },
    /** Nama developer unik (untuk pilihan filter). */
    async daftarDeveloper() {
      const baris = await db.rows('SELECT DISTINCT user_name FROM perubahan_pesan WHERE user_name IS NOT NULL ORDER BY user_name');
      return baris.map((b) => b.user_name);
    },
    /** Satu perubahan berdasarkan id, atau null. */
    byId(id) {
      return db.first('SELECT * FROM perubahan WHERE id = ?', [id]);
    },
    /** Semua pesan sebuah perubahan, urut waktu. */
    pesanByPerubahan(perubahanId) {
      return db.rows('SELECT * FROM perubahan_pesan WHERE perubahan_id = ? ORDER BY tanggal, id', [perubahanId]);
    },
    /** Semua pemetaan pesan sebuah perubahan beserta nama modul, repo, dan menu. */
    petaByPerubahan(perubahanId) {
      return db.rows(
        `SELECT pp.perubahan_pesan_id AS pesan_id, pp.modul_id, mo.nama AS modul_nama, r.id AS repo_id, r.nama AS repo_nama,
                pp.menu_id, mn.nama AS menu_nama
         FROM perubahan_pesan_peta pp
         JOIN perubahan_pesan x ON x.id = pp.perubahan_pesan_id
         JOIN modul mo ON mo.id = pp.modul_id
         JOIN repo r ON r.id = mo.repo_id
         LEFT JOIN menu mn ON mn.id = pp.menu_id
         WHERE x.perubahan_id = ?`,
        [perubahanId],
      );
    },
    /** Dampak (modul/menu/halaman yang benar-benar berubah) sebuah perubahan. */
    dampakByPerubahan(perubahanId) {
      return db.rows(
        `SELECT d.modul_id, mo.nama AS modul_nama, d.menu_id, mn.nama AS menu_nama, d.halaman_id, h.nama AS halaman_nama
         FROM perubahan_dampak d
         JOIN modul mo ON mo.id = d.modul_id
         LEFT JOIN menu mn ON mn.id = d.menu_id
         LEFT JOIN halaman h ON h.id = d.halaman_id
         WHERE d.perubahan_id = ?`,
        [perubahanId],
      );
    },

    // ---------- riwayat (modul / menu / halaman) ----------

    /** Perubahan yang tercatat sebagai dampak pada modul/menu/halaman. */
    riwayatDampak(tingkat, id) {
      const kolom = KOLOM_RIWAYAT[tingkat];
      return db.rows(
        `SELECT DISTINCT ${SELECT_RIWAYAT}, 'dampak' AS asal
         FROM perubahan_dampak d JOIN perubahan p ON p.id = d.perubahan_id
         WHERE d.${kolom} = ? LIMIT 100`,
        [id],
      );
    },
    /** Perubahan yang punya tautan poin (poin_perubahan) pada halaman, atau pada halaman-halaman di menu/modul. */
    riwayatTautan(tingkat, id) {
      // gabungan ke halaman disesuaikan tingkat; nama kolom berasal dari daftar putih di bawah (bukan input user)
      const sambung = {
        halaman: { join: '', kolom: 'pp.halaman_id' },
        menu: { join: 'JOIN halaman h ON h.id = pp.halaman_id', kolom: 'h.menu_id' },
        modul: { join: 'JOIN halaman h ON h.id = pp.halaman_id JOIN menu mn ON mn.id = h.menu_id', kolom: 'mn.modul_id' },
      }[tingkat];
      return db.rows(
        `SELECT DISTINCT ${SELECT_RIWAYAT}, 'dampak' AS asal
         FROM poin_perubahan pp ${sambung.join} JOIN perubahan p ON p.id = pp.perubahan_id
         WHERE ${sambung.kolom} = ? LIMIT 100`,
        [id],
      );
    },
    /** Perubahan yang hanya terpetakan (belum punya dampak) pada modul/menu. Halaman tidak punya pemetaan. */
    riwayatPeta(tingkat, id) {
      const kolom = KOLOM_RIWAYAT[tingkat];
      // pemetaan hanya ada sampai level menu
      if (tingkat === 'halaman') return Promise.resolve([]);
      return db.rows(
        `SELECT ${SELECT_RIWAYAT}, 'peta' AS asal
         FROM perubahan p
         WHERE EXISTS (SELECT 1 FROM perubahan_pesan x JOIN perubahan_pesan_peta pp ON pp.perubahan_pesan_id = x.id
                       WHERE x.perubahan_id = p.id AND pp.${kolom} = ?)
           AND NOT EXISTS (SELECT 1 FROM perubahan_dampak d WHERE d.perubahan_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM poin_perubahan t WHERE t.perubahan_id = p.id)
         LIMIT 100`,
        [id],
      );
    },
    /** Entri audit bugfix yang berdampak pada modul/menu/halaman. */
    riwayatAudit(tingkat, id) {
      const kolom = KOLOM_RIWAYAT[tingkat];
      return db.rows(
        `SELECT DISTINCT a.id AS audit_id, a.ringkasan, COALESCE(a.tanggal_akhir, a.created_at) AS tanggal
         FROM audit_bugfix_dampak ad JOIN audit_bugfix a ON a.id = ad.audit_bugfix_id
         WHERE ad.${kolom} = ? LIMIT 100`,
        [id],
      );
    },
  };
}
