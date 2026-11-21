import 'server-only';
import { AppError } from '@/utils/appError';

/** Nama tabel/kolom dari konfigurasi hanya boleh huruf, angka, dan underscore (dipakai langsung di SQL). */
const IDENTIFIER_AMAN = /^[A-Za-z0-9_]+$/;

/** Membungkus identifier dengan backtick setelah dipastikan aman. */
function q(nama) {
  return `\`${nama}\``;
}

/** Mengumpulkan semua nilai string konfigurasi satu tipe (tabel + kolom) menjadi array datar. */
function nilaiKonfigurasi(cfg) {
  return [cfg.tabelPesan, cfg.tabelInduk, ...Object.values(cfg.kolomPesan), ...Object.values(cfg.kolomInduk)];
}

/** Teks kosong menjadi null, selain itu di-trim. */
function bersihkan(nilai) {
  if (nilai == null) return null;
  const teks = String(nilai).trim();
  return teks === '' ? null : teks;
}

/**
 * Model sync: SATU-SATUNYA tempat membaca database sumber CR/B (read-only).
 * Kontrak: ambilPesanPerNomor(tipe, nomor). Kelak sync.service.js (versi API)
 * mengimplementasikan fungsi yang sama dan ditukar lewat DI tanpa mengubah usecase.
 */
export function buatSyncModel({ poolSumber, sumberConfig }) {
  /**
   * Memeriksa apakah sumber siap dipakai untuk tipe tertentu.
   * Mengembalikan { siap, alasan } (bukan melempar) agar UI bisa menampilkan pesan ramah.
   */
  function periksa(tipe) {
    // koneksi sumber belum diisi di .env
    if (!poolSumber) return { siap: false, alasan: 'Koneksi database sumber belum diisi di .env (SUMBER_DB_*).' };
    const cfg = sumberConfig[tipe];
    if (!cfg) return { siap: false, alasan: `Konfigurasi sumber untuk tipe ${tipe} belum ada.` };
    const semua = nilaiKonfigurasi(cfg);
    // masih ada placeholder <ISI> atau nilai kosong
    if (semua.some((v) => typeof v !== 'string' || v === '' || v.includes('<ISI>'))) {
      return { siap: false, alasan: `Konfigurasi sumber ${tipe} di sumber.config.js belum diisi.` };
    }
    // nama tabel/kolom mengandung karakter berbahaya: tolak, jangan dirangkai ke SQL
    if (!semua.every((v) => IDENTIFIER_AMAN.test(v))) {
      return { siap: false, alasan: `Konfigurasi sumber ${tipe} memuat nama tabel/kolom yang tidak valid.` };
    }
    return { siap: true, alasan: null };
  }

  /** Menyusun SQL pembacaan pesan satu nomor beserta modul/menu mentah dari tabel induk. */
  function susunSql(cfg) {
    const p = cfg.kolomPesan;
    const i = cfg.kolomInduk;
    return `SELECT h.${q(p.sumber_id)} AS sumber_id, h.${q(p.nomor)} AS nomor, h.${q(p.pesan)} AS pesan,
                   h.${q(p.user_id)} AS user_id, h.${q(p.user_name)} AS user_name,
                   FROM_UNIXTIME(h.${q(p.tanggal)}) AS tanggal,
                   ind.${q(i.modul)} AS modul_sumber, ind.${q(i.menu)} AS menu_sumber
            FROM ${q(cfg.tabelPesan)} h
            LEFT JOIN ${q(cfg.tabelInduk)} ind ON ind.${q(i.nomor)} = h.${q(p.nomor)}
            WHERE h.${q(p.nomor)} = ?
            ORDER BY h.${q(p.sumber_id)}`;
  }

  return {
    /**
     * Ping ringan ke database sumber (SELECT 1) lewat pool yang sama dengan Sync, sesi READ ONLY.
     * Melempar error ber-kode agar pemanggil (health) bisa menerjemahkannya menjadi alasan singkat.
     */
    async ping() {
      // pool null: variabel SUMBER_DB_* belum diisi, tidak ada yang bisa dicek
      if (!poolSumber) throw Object.assign(new Error('sumber belum dikonfigurasi'), { code: 'SUMBER_BELUM_DIKONFIGURASI' });
      await poolSumber.query('SELECT 1 AS ok');
      return true;
    },
    /** Status kesiapan sumber untuk tipe tertentu: { siap, alasan }. */
    status: (tipe) => periksa(tipe),
    /** Semua pesan pengerjaan satu nomor dari sumber (array kosong bila tidak ada). */
    async ambilPesanPerNomor(tipe, nomor) {
      const status = periksa(tipe);
      // sumber belum siap: hentikan dengan pesan jelas
      if (!status.siap) throw new AppError(status.alasan, 400);

      const [baris] = await poolSumber.query(susunSql(sumberConfig[tipe]), [nomor]);
      return baris.map((b) => ({
        sumber_id: String(b.sumber_id),
        nomor: String(b.nomor),
        pesan: String(b.pesan ?? ''),
        user_id: b.user_id ?? null,
        user_name: bersihkan(b.user_name),
        tanggal: b.tanggal ?? null,
        modul_sumber: bersihkan(b.modul_sumber),
        menu_sumber: bersihkan(b.menu_sumber),
      }));
    },
  };
}
