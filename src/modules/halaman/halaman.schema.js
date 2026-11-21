import { z } from 'zod';
import { DAFTAR_JENIS_HALAMAN } from '@/enums';
import { idSchema, teksOpsional, kodeOpsional, daftarTeks } from '@/utils/schemaDasar';

/** Schema membuat halaman. Kode kosong dibuat otomatis dari nama. */
export const buatHalamanSchema = z.object({
  menu_id: idSchema,
  kode: kodeOpsional,
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  jenis: z.enum(DAFTAR_JENIS_HALAMAN).default('lainnya'),
  route: teksOpsional(300),
  file_utama: daftarTeks,
  kata_kunci: daftarTeks,
});

/** Schema mengubah halaman (menu induk tidak bisa dipindah). */
export const ubahHalamanSchema = buatHalamanSchema.omit({ menu_id: true }).extend({ id: idSchema });
