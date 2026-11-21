import { z } from 'zod';
import { MODE_ANALISIS } from '@/enums';

/** Bilangan bulat positif yang dikirim sebagai angka atau teks angka dari form. */
const bilanganPositif = z.coerce.number().int('Harus bilangan bulat.').min(1, 'Minimal 1.').max(100000, 'Terlalu besar.');

/** Schema perubahan pengaturan; semua kunci opsional agar bisa diubah sebagian. */
export const ubahPengaturanSchema = z.object({
  batas_karakter_poin: bilanganPositif.optional(),
  batas_kalimat_poin: bilanganPositif.optional(),
  ukuran_kelompok_blueprint: bilanganPositif.optional(),
  mode_analisis_blueprint: z.enum(MODE_ANALISIS).optional(),
  mode_rapikan_bahasa: z.enum(MODE_ANALISIS).optional(),
});
