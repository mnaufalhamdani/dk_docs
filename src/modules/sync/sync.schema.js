import { z } from 'zod';
import { idSchema, idOpsional, teksOpsional } from '@/utils/schemaDasar';

/** Schema sync: tipe sumber dan nomor CR/B. */
export const sumberSchema = z.object({
  tipe: z.enum(['CR', 'B'], { message: 'Tipe harus CR atau B.' }),
  nomor: z
    .string()
    .trim()
    .min(4, 'Nomor terlalu pendek.')
    .max(25, 'Nomor terlalu panjang.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Nomor hanya boleh huruf, angka, "-" atau "_".'),
});

/** Daftar sumber_id pesan (teks pendek) yang dipilih user. */
const daftarSumberId = z.array(z.string().trim().min(1).max(100)).max(5000);

/**
 * Schema simpan sync: sumber + pilihan user.
 * simpan_ids = pesan baru yang dicentang (tidak dikirim: simpan semua yang baru),
 * perbarui_ids = pesan berubah yang akan diperbarui, hapus_ids = pesan hilang yang akan dihapus.
 */
export const simpanSyncSchema = sumberSchema.extend({
  simpan_ids: daftarSumberId.optional(),
  perbarui_ids: daftarSumberId.optional(),
  hapus_ids: daftarSumberId.optional(),
});

/** Schema pemetaan manual nama mentah ke modul (dan menu bila perlu). */
export const petakanSchema = z.object({
  modul_sumber: teksOpsional(200),
  menu_sumber: teksOpsional(200),
  modul_id: idSchema,
  menu_id: idOpsional,
});

/** Schema menambah modul baru dari nama mentah lalu memetakannya. */
export const tambahModulSchema = z.object({
  repo_id: idSchema,
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  path_kode: teksOpsional(500),
  modul_sumber: teksOpsional(200),
  menu_sumber: teksOpsional(200),
});
