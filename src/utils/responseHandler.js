import { adalahAppError } from './appError';
import { logger } from '@/logger/logger';

/** Respons HTTP sukses dalam format seragam { success, message, data }. */
export function sukses(data = null, message = 'OK', status = 200) {
  return Response.json({ success: true, message, data }, { status });
}

/** Respons HTTP gagal dalam format seragam { success, message, detail }. */
export function gagal(message, status = 400, detail = null) {
  return Response.json({ success: false, message, detail }, { status });
}

/** Respons berkas biner (misal gambar) dengan cache privat singkat. */
export function berkas(buffer, tipe, namaFile = null) {
  const headers = { 'Content-Type': tipe, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' };
  // nama berkas diberikan: minta browser mengunduh (attachment) dengan nama itu
  if (namaFile) {
    headers['Content-Disposition'] = `attachment; filename="${namaFile}"`;
    headers['Cache-Control'] = 'no-store';
  }
  return new Response(buffer, { status: 200, headers });
}

/** Penanda hasil controller yang harus dikirim sebagai berkas, bukan JSON. */
export function hasilBerkas(buffer, tipe, namaFile = null) {
  return { __berkas: true, buffer, tipe, namaFile };
}

/** Mengubah error apa pun menjadi { status, message } yang aman ditampilkan. */
export function normalisasiError(error) {
  // error yang kita lempar sendiri: pesannya memang untuk user
  if (adalahAppError(error)) return { status: error.status, message: error.message, detail: error.detail };
  // error tak terduga: catat lengkap di log, jangan bocorkan detail internal ke user
  logger.error('Error tak terduga', error);
  return { status: 500, message: 'Terjadi kesalahan pada server.', detail: null };
}

/**
 * Pembungkus untuk Server Action: mengembalikan { ok: true, data } atau { ok: false, error }
 * sehingga tampilan tidak perlu try/catch dan pesan error selalu seragam.
 */
export async function jalankanAction(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: normalisasiError(error).message };
  }
}
