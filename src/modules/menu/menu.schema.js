import { z } from 'zod';
import { DAFTAR_POLA_MENU } from '@/enums';
import { idSchema, teksOpsional, kodeOpsional, daftarTeks } from '@/utils/schemaDasar';

/** Schema membuat menu. Kode kosong dibuat otomatis dari nama. */
export const buatMenuSchema = z.object({
  modul_id: idSchema,
  kode: kodeOpsional,
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  route: teksOpsional(300),
  path_kode: teksOpsional(500),
  ringkasan: teksOpsional(300),
  pola: z.enum(DAFTAR_POLA_MENU).default('lainnya'),
  alias_database: daftarTeks,
  kata_kunci: daftarTeks,
  buat_halaman_standar: z.boolean().optional().default(false),
});

/** Schema mengubah menu (modul induk tidak bisa dipindah). */
export const ubahMenuSchema = buatMenuSchema.omit({ modul_id: true, buat_halaman_standar: true }).extend({ id: idSchema });
