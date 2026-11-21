import { z } from 'zod';
import { idSchema } from '@/utils/schemaDasar';

/** Nilai kosong dari form/query string dianggap tidak diisi. */
const opsional = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

/** Tanggal berformat YYYY-MM-DD. */
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.');

/** Schema filter daftar perubahan (semua dari query string). */
export const filterPerubahanSchema = z.object({
  q: z.string().trim().max(100, 'Kata kunci maksimal 100 karakter.').default(''),
  tipe: opsional(z.enum(['CR', 'B'])),
  dari: opsional(tanggal),
  sampai: opsional(tanggal),
  developer: opsional(z.string().trim().max(150)),
  dokumentasi: opsional(z.enum(['sudah', 'belum'])),
  modul_id: opsional(idSchema),
  repo_id: opsional(idSchema),
  halaman: z.preprocess((v) => (v === '' || v == null ? 1 : v), z.coerce.number().int().min(1).default(1)),
});

/** Schema permintaan riwayat sebuah modul/menu/halaman. */
export const riwayatSchema = z.object({
  tingkat: z.enum(['modul', 'menu', 'halaman']),
  id: idSchema,
});
