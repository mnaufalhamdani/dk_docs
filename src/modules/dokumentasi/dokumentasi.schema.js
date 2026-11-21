import { z } from 'zod';
import { DAFTAR_BAGIAN, DAFTAR_STATUS_POIN, DAFTAR_LINGKUP_LIVE } from '@/enums';
import { idSchema, teksOpsional } from '@/utils/schemaDasar';

/** Satu poin yang dikirim editor. id kosong/null berarti poin baru. */
export const poinInputSchema = z.object({
  id: idSchema.nullish(),
  bagian: z.enum(DAFTAR_BAGIAN),
  isi: z.string().trim().min(1, 'Isi poin tidak boleh kosong.').max(2000, 'Isi poin maksimal 2000 karakter.'),
  status: z.enum(DAFTAR_STATUS_POIN).default('beta'),
  // asal teks poin: diisi 'aturan'/'ai' saat user memakai usulan ringkas, 'manual' bila diketik sendiri
  asal: z.enum(['manual', 'impor', 'aturan', 'ai']).default('manual'),
});

/** Schema menyimpan seluruh poin satu halaman (urutan array = urutan tampil per bagian). */
export const simpanHalamanSchema = z.object({
  halaman_id: idSchema,
  poin: z.array(poinInputSchema).max(500, 'Terlalu banyak poin dalam satu halaman.'),
  alasan: teksOpsional(200),
});

/** Schema permintaan usulan ringkas untuk satu poin. */
export const usulkanRingkasSchema = z.object({
  isi: z.string().trim().min(1, 'Isi poin tidak boleh kosong.').max(2000, 'Isi poin maksimal 2000 karakter.'),
});

/** Schema operasi "jadikan semua live". */
export const jadikanLiveSchema = z.object({
  lingkup: z.enum(DAFTAR_LINGKUP_LIVE),
  id: idSchema,
});

/** Schema unggah gambar (dikirim sebagai multipart form). */
export const unggahGambarSchema = z.object({
  halaman_id: idSchema,
  keterangan: teksOpsional(300),
  file: z.instanceof(File, { message: 'Berkas gambar wajib dipilih.' }),
});

/** Schema query id gambar (tampil / hapus). */
export const gambarIdSchema = z.object({ id: idSchema });
