import { z } from 'zod';
import { idSchema } from '@/utils/schemaDasar';

/** Teks tunggal dari query string (parameter berulang diambil yang pertama). */
const teksTunggal = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().max(40));

/** Daftar id repo dari teks "1,2,3"; id yang tidak valid membatalkan seluruh daftar (jatuh ke "semua repo"). */
const daftarRepo = z.preprocess(
  (v) => {
    // menerima "1,2", parameter berulang (?repo=1&repo=2), maupun array id dari filter yang sudah dinormalisasi
    const daftar = (Array.isArray(v) ? v : [v]).flatMap((s) => (typeof s === 'string' ? s.split(',') : []));
    return daftar.map((s) => s.trim()).filter(Boolean);
  },
  z.array(idSchema).max(50),
);

/**
 * Schema filter dashboard dari query string. Setiap kolom memakai `.catch` sehingga nilai rusak
 * jatuh ke bawaan (halaman tetap tampil), bukan menghasilkan error 400.
 */
export const filterDashboardSchema = z.object({
  repo: daftarRepo.catch([]),
  dari: teksTunggal.catch(''),
  sampai: teksTunggal.catch(''),
  lihat: teksTunggal.catch(''),
});
