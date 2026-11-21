import { z } from 'zod';
import { idSchema, idOpsional, teksOpsional } from '@/utils/schemaDasar';

/** Batas jumlah poin dalam satu blueprint. */
const MAKS_POIN = 100;

/** Satu poin teks bersih. */
const teksPoin = z.string().trim().min(1, 'Isi poin tidak boleh kosong.').max(4000, 'Isi poin maksimal 4000 karakter.');

/** Schema membuat blueprint dari teks mentah. */
export const buatBlueprintSchema = z.object({
  repo_id: idSchema,
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(200, 'Judul maksimal 200 karakter.'),
  teks: z.string().trim().min(1, 'Teks blueprint kosong.').max(60000, 'Teks blueprint terlalu panjang.'),
});

/** Schema menyimpan daftar poin hasil perapihan. */
export const simpanPoinSchema = z.object({
  id: idSchema,
  poin: z.array(teksPoin).min(1, 'Minimal satu poin.').max(MAKS_POIN, `Maksimal ${MAKS_POIN} poin.`),
});

/** Schema menyimpan pencocokan poin -> modul/menu/halaman. */
export const simpanPencocokanSchema = z.object({
  id: idSchema,
  target: z
    .array(
      z.object({
        nomor: z.coerce.number().int().min(1).max(MAKS_POIN),
        modul_id: idSchema,
        menu_id: idOpsional,
        halaman_id: idOpsional,
        peran: z.enum(['pemilik', 'terkait']),
      }),
    )
    .max(MAKS_POIN * 20, 'Terlalu banyak target.'),
});

/** Schema menyimpan susunan kelompok (urutan array = urutan eksekusi). */
export const simpanKelompokSchema = z.object({
  id: idSchema,
  kelompok: z
    .array(
      z.object({
        modul_id: idSchema,
        alasan: teksOpsional(500),
        poin: z.array(z.coerce.number().int().min(1).max(MAKS_POIN)),
      }),
    )
    .max(MAKS_POIN, 'Terlalu banyak kelompok.'),
});

/** Schema id blueprint tunggal. */
export const blueprintIdSchema = idSchema;
