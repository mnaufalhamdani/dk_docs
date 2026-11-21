import { notFound } from 'next/navigation';
import { adalahAppError } from './appError';

/**
 * Menjalankan pemuatan data untuk halaman. Bila data tidak ada (AppError 404)
 * tampilkan halaman 404 Next.js; error lain dilempar ulang ke error boundary.
 */
export async function muat(fn) {
  try {
    return await fn();
  } catch (error) {
    // data memang tidak ada: tampilkan 404, bukan error server
    // (dicek lewat nama, bukan instanceof, karena class bisa terduplikasi antar bundle Next.js)
    if (adalahAppError(error) && error.status === 404) notFound();
    throw error;
  }
}
