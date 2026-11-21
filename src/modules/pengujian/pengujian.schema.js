import { z } from 'zod';
import { idSchema, idOpsional } from '@/utils/schemaDasar';
import { POLA_NAMA_BUKTI } from './pengujian.hasil.schema';
import { normalisasiCr } from './pengujian.dokumen';

/** Batas keamanan ukuran input teks blueprint (karakter). */
const MAKS_TEKS = 200000;

/** CR ID: teks bebas pendek tanpa spasi; hanya karakter aman karena dipakai di nama folder bukti nantinya. */
export const crIdSchema = z
  .string()
  .trim()
  .min(1, 'CR ID wajib diisi.')
  .max(60, 'CR ID maksimal 60 karakter.')
  .regex(/^[A-Za-z0-9_.-]+$/, 'CR ID hanya boleh huruf, angka, titik, "-" atau "_".')
  // disimpan sebagai nomor polos; awalan CR/B (jika ikut diketik) dibuang, lalu ditambahkan lagi di prompt dan PDF
  .transform(normalisasiCr);

/** Target sebuah poin: modul saja (menu_id kosong) atau modul + menu. */
const targetSchema = z.object({ modul_id: idSchema, menu_id: idOpsional });

/** Satu poin blueprint beserta targetnya (minimal satu). */
const poinSchema = z.object({
  isi: z.string().trim().min(1, 'Isi poin tidak boleh kosong.').max(5000, 'Isi poin maksimal 5000 karakter.'),
  target: z.array(targetSchema).min(1, 'Setiap poin harus punya minimal satu target modul.').max(20, 'Maksimal 20 target per poin.'),
});

/** Schema membuat Uji CR baru. */
export const pengujianBaruSchema = z.object({
  cr_id: crIdSchema,
  blueprint_mentah: z.string().trim().min(1, 'Blueprint wajib diisi.').max(MAKS_TEKS, 'Blueprint terlalu panjang.'),
  poin: z.array(poinSchema).min(1, 'Minimal satu poin.').max(200, 'Maksimal 200 poin.'),
});

/** Schema memecah teks blueprint menjadi poin. */
export const pecahSchema = z.object({
  teks: z.string().trim().min(1, 'Blueprint wajib diisi.').max(MAKS_TEKS, 'Blueprint terlalu panjang.'),
});

/** Batas ukuran teks JSON hasil uji (karakter). */
const MAKS_JSON = 5000000;

/** Schema pratinjau hasil uji: JSON mentah dan NAMA berkas bukti yang akan diunggah (isinya belum dikirim). */
export const pratinjauHasilSchema = z.object({
  pengujian_id: idSchema,
  json: z.string().min(2, 'JSON hasil uji wajib diisi.').max(MAKS_JSON, 'JSON terlalu besar.'),
  // nama apa adanya dari pemilih berkas; hanya yang dirujuk JSON yang diperiksa lebih jauh
  nama_bukti: z.array(z.string().max(255)).max(200, 'Terlalu banyak berkas bukti.').default([]),
});

/** Schema menyimpan hasil uji (berkas bukti divalidasi terpisah karena berupa File). */
export const simpanHasilSchema = z.object({
  pengujian_id: idSchema,
  json: z.string().min(2, 'JSON hasil uji wajib diisi.').max(MAKS_JSON, 'JSON terlalu besar.'),
  // dari form multipart: '1' atau 'true' berarti buat versi PDF baru setelah hasil tersimpan
  buat_pdf: z
    .union([z.boolean(), z.string()])
    .nullish()
    .transform((v) => v === true || v === '1' || v === 'true'),
});

/** Schema membuat versi PDF baru dan membaca satu versi PDF. */
export const pengujianIdSchema = z.object({ pengujian_id: idSchema });
export const pdfIdSchema = z.object({ id: idSchema });

/** Schema berkas bukti yang diunggah: File, maksimal 50 berkas. */
export const berkasBuktiSchema = z.array(z.instanceof(File, { message: 'Berkas bukti tidak valid.' })).max(50, 'Maksimal 50 berkas bukti.');

/** Schema membaca satu berkas bukti: id skenario dan nama berkas. */
export const buktiSchema = z.object({
  skenario_id: idSchema,
  nama: z.string().regex(POLA_NAMA_BUKTI, 'Nama berkas bukti tidak valid.'),
});

/** Schema uji ulang: sel (poin x repo) terpilih dan/atau poin baru; minimal salah satunya terisi. */
export const ujiUlangSchema = z
  .object({
    pengujian_id: idSchema,
    sel: z.array(z.object({ poin_id: idSchema, repo_id: idSchema })).max(2000, 'Terlalu banyak sel.').default([]),
    poin_baru: z.array(poinSchema).max(100, 'Maksimal 100 poin baru.').default([]),
  })
  .refine((v) => v.sel.length + v.poin_baru.length > 0, 'Pilih minimal satu sel atau tambahkan poin baru.');

/** Schema catatan keputusan sebuah sel; teks kosong berarti catatan dihapus. */
export const catatanSchema = z.object({
  pengujian_id: idSchema,
  poin_id: idSchema,
  repo_id: idSchema,
  catatan: z.string().trim().max(5000, 'Catatan maksimal 5000 karakter.').default(''),
});

/** Schema unduh prompt: unique_id dan kode repo (format sama dengan modul prompt). */
export const unduhSchema = z.object({
  unique_id: z.string().regex(/^[a-z0-9]{8}$/, 'unique_id tidak valid.'),
  repo: z.string().regex(/^[a-z0-9_-]+$/, 'Kode repo tidak valid.'),
});
