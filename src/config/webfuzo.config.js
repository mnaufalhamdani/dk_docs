import 'server-only';

/**
 * Membaca template URL halaman CR/B di website webfuzo dari .env.
 * Setiap template memuat placeholder {nomor}. Nilai kosong berarti tombol "Lihat dokumen" disembunyikan.
 */
export function bacaWebfuzoConfig() {
  return {
    CR: (process.env.WEBFUZO_URL_CR ?? '').trim(),
    B: (process.env.WEBFUZO_URL_B ?? '').trim(),
  };
}
