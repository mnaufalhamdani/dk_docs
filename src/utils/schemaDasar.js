import { z } from 'zod';
import { pecahDaftar } from './slug';

/**
 * ID berupa teks angka (1-19 digit, BIGINT UNSIGNED dari IdGenerator).
 * Tidak boleh dikonversi ke number karena 18 digit melebihi presisi aman JavaScript.
 * Angka JS (mis. dari JSON lama) diterima dan diubah menjadi teks.
 */
export const idSchema = z
  .union([z.string(), z.number().int()])
  .transform((v) => String(v).trim())
  .pipe(z.string().regex(/^[1-9]\d{0,18}$/, 'ID tidak valid.'));

/** Teks opsional: string kosong / tidak diisi menjadi null. */
export const teksOpsional = (maks) =>
  z
    .string()
    .trim()
    .max(maks, `Maksimal ${maks} karakter.`)
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

/** Kode: huruf kecil, angka, '-' atau '_'. */
export const kodeSchema = z
  .string()
  .trim()
  .min(1, 'Kode wajib diisi.')
  .max(60, 'Maksimal 60 karakter.')
  .regex(/^[a-z0-9_-]+$/, "Kode hanya boleh huruf kecil, angka, '-' atau '_'.");

/** Kode opsional: kosong berarti dibuat otomatis dari nama oleh usecase. */
export const kodeOpsional = z
  .string()
  .trim()
  .max(60, 'Maksimal 60 karakter.')
  .nullish()
  .transform((v) => (v == null || v === '' ? null : v))
  .pipe(kodeSchema.nullable());

/** Daftar teks: menerima array atau teks dipisah koma/baris; hasil array unik. */
export const daftarTeks = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((v) => pecahDaftar(v ?? []));

/** ID opsional: kosong / null / tidak dikirim menjadi null, selain itu harus ID valid. */
export const idOpsional = z
  .union([idSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null);
