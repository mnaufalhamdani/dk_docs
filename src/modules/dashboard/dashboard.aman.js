import 'server-only';
import { logger } from '@/logger/logger';

/**
 * Menjalankan pemuatan data satu widget tanpa melempar error: gagal berarti { ok: false } sehingga
 * hanya widget itu yang menampilkan pesan galat. Detail error dicatat di log server saja.
 */
export async function muatAman(namaWidget, ambil) {
  try {
    return { ok: true, data: await ambil() };
  } catch (error) {
    // satu widget gagal (mis. query error): catat, jangan merobohkan halaman
    logger.error(`Dashboard: widget ${namaWidget} gagal`, error);
    return { ok: false, data: null };
  }
}
