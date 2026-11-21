import { z } from 'zod';
import { idSchema, teksOpsional, kodeOpsional, daftarTeks } from '@/utils/schemaDasar';

/** Schema membuat modul. Kode kosong dibuat otomatis dari nama. */
export const buatModulSchema = z.object({
  repo_id: idSchema,
  kode: kodeOpsional,
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  alias_database: daftarTeks,
  kata_kunci: daftarTeks,
});

/** Schema mengubah modul (repo tidak bisa dipindah). */
export const ubahModulSchema = buatModulSchema.omit({ repo_id: true }).extend({ id: idSchema });
