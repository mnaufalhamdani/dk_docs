import { z } from 'zod';
import { t } from './i18n';

/** Batas panjang URL yang disimpan (sama dengan kolom VARCHAR(500)). */
export const MAKS_PANJANG_URL = 500;

/**
 * Memeriksa satu teks URL. Mengembalikan { nilai } (null bila kosong) atau { galat } berisi pesan.
 * Aturan: dipangkas, kosong menjadi null, hanya http/https, dibatasi panjangnya,
 * dan ditolak bila memuat user atau password (mis. https://user:pass@host).
 */
export function periksaUrl(teks) {
  const bersih = String(teks ?? '').trim();
  // kosong: isian opsional, simpan sebagai NULL
  if (bersih === '') return { nilai: null };
  if (bersih.length > MAKS_PANJANG_URL) return { galat: t('url.terlaluPanjang', { maks: MAKS_PANJANG_URL }) };
  let url;
  try {
    url = new URL(bersih);
  } catch {
    // teks bukan URL absolut yang bisa diurai
    return { galat: t('url.tidakValid') };
  }
  // skema selain http/https (javascript:, file:, ftp:, dst) ditolak demi keamanan tautan
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { galat: t('url.skemaTidakDiizinkan') };
  // kredensial di dalam URL akan ikut tersimpan dan tampil di layar, jadi ditolak
  if (url.username || url.password) return { galat: t('url.memuatKredensial') };
  return { nilai: bersih };
}

/** Schema zod untuk satu isian URL opsional; hasilnya string URL atau null. */
export const urlOpsionalSchema = z
  .string()
  .nullish()
  .transform((teks, ctx) => {
    const hasil = periksaUrl(teks);
    // URL tidak lolos aturan: laporkan pesan yang spesifik
    if (hasil.galat) {
      ctx.addIssue({ code: 'custom', message: hasil.galat });
      return z.NEVER;
    }
    return hasil.nilai;
  });
