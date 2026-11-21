import { z } from 'zod';
import { DAFTAR_JENIS_SKENARIO, DAFTAR_KATEGORI_PERUBAHAN, DAFTAR_STATUS_SKENARIO, DAFTAR_TIPE_SKENARIO } from '@/enums';
import { teksOpsional } from '@/utils/schemaDasar';

/** Nama berkas bukti: aman dipakai sebagai nama berkas di disk (tanpa folder, spasi, atau titik di awal). */
export const POLA_NAMA_BUKTI = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** Nomor poin: bilangan bulat >= 1, atau null/kosong untuk hal di luar blueprint. */
const nomorPoin = z
  .number()
  .int()
  .min(1, 'Nomor poin minimal 1.')
  .nullish()
  .transform((v) => v ?? null);

/** Teks yang boleh dikirim sebagai array baris atau satu string; hasilnya satu teks berbaris (atau null). */
const teksBaris = (maks) =>
  z
    .union([z.array(z.string()), z.string()])
    .nullish()
    .transform((v) => (Array.isArray(v) ? v.map((b) => b.trim()).filter(Boolean).join('\n') : (v ?? '').trim()))
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || v.length <= maks, `Maksimal ${maks} karakter.`);

/** Daftar teks pendek yang boleh kosong. */
const daftarTeksPendek = z.array(z.string().trim().max(500)).max(100).nullish().transform((v) => v ?? []);

/** Satu entri pernyataan tools yang belum tersedia. */
const toolsSchema = z.object({
  nama: z.string().trim().min(1, 'Nama tools wajib diisi.').max(150),
  dibutuhkan_untuk: teksOpsional(300),
  saran_pemasangan: teksOpsional(500),
});

/** Satu entri analisis perubahan (Git Diff dibanding blueprint). */
const analisisSchema = z.object({
  kategori: z.enum(DAFTAR_KATEGORI_PERUBAHAN),
  poin: nomorPoin,
  ringkasan: z.string().trim().min(1, 'Ringkasan analisis wajib diisi.').max(5000),
  file: z.array(z.string().trim().min(1).max(500)).max(200).nullish().transform((v) => v ?? []),
});

/** Satu skenario hasil uji. */
const skenarioSchema = z.object({
  kode: z.string().trim().regex(/^[A-Za-z0-9_-]{1,30}$/, 'Kode skenario hanya huruf, angka, "-" atau "_" (maks 30).'),
  poin: nomorPoin,
  nama: z.string().trim().min(1, 'Nama skenario wajib diisi.').max(300),
  tipe: z.enum(DAFTAR_TIPE_SKENARIO),
  jenis: z.enum(DAFTAR_JENIS_SKENARIO),
  langkah: teksBaris(10000),
  hasil_diharapkan: teksBaris(10000),
  hasil_aktual: teksBaris(10000),
  status: z.enum(DAFTAR_STATUS_SKENARIO),
  catatan: teksBaris(10000),
  bukti: z.array(z.string().regex(POLA_NAMA_BUKTI, 'Nama berkas bukti tidak valid.')).max(50).nullish().transform((v) => v ?? []),
});

/** Informasi lingkungan pengujian (hanya ditampilkan di pratinjau; tidak disimpan di tabel). */
const lingkunganSchema = z
  .object({ versi_tools: daftarTeksPendek, perintah: daftarTeksPendek, keterbatasan: daftarTeksPendek })
  .nullish()
  .transform((v) => v ?? { versi_tools: [], perintah: [], keterbatasan: [] });

/** Dokumen JSON hasil uji yang ditulis agen (format bagian 7 PROMPT_FASE6_UJI_CR.md). */
export const dokumenHasilUjiSchema = z.object({
  unique_id: z.string().regex(/^[a-z0-9]{8}$/, 'unique_id tidak valid.'),
  repo: z.string().regex(/^[a-z0-9_-]+$/, 'Kode repo tidak valid.'),
  cr_id: z.string().trim().min(1, 'cr_id wajib diisi.').max(60),
  putaran: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().min(1, 'putaran minimal 1.')),
  branch: teksOpsional(100),
  hash_head: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9a-fA-F]{7,64}$/.test(v), 'hash_head harus berupa hash commit (heksadesimal 7-64 karakter).'),
  tools_belum_tersedia: z.array(toolsSchema).max(50).nullish().transform((v) => v ?? []),
  lingkungan: lingkunganSchema,
  analisis_perubahan: z.array(analisisSchema).max(500).nullish().transform((v) => v ?? []),
  skenario: z.array(skenarioSchema).min(1, 'Minimal satu skenario.').max(1000),
});
