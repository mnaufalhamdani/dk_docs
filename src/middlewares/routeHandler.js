import 'server-only';
import { ambilDep } from '@/di/container';
import { semuaRoutes } from '@/modules/routes.index';
import { validasi } from '@/utils/validasi';
import { AppError } from '@/utils/appError';
import { sukses, gagal, berkas, normalisasiError } from '@/utils/responseHandler';

/** Membaca input request sesuai `sumber` route: query string, body JSON, atau multipart form. */
async function bacaInput(request, sumber) {
  if (sumber === 'query') return Object.fromEntries(new URL(request.url).searchParams);
  if (sumber === 'form') {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  if (sumber === 'body') {
    try {
      return await request.json();
    } catch {
      // body bukan JSON yang valid: beri pesan jelas, bukan error 500
      throw new AppError('Body request harus berupa JSON yang valid.', 400);
    }
  }
  // route tanpa input
  return undefined;
}

/** Mencari route yang cocok dengan metode dan path; null bila tidak ada. */
function cariRoute(metode, path) {
  return semuaRoutes.find((r) => r.metode === metode && r.path === path) ?? null;
}

/** Mengubah hasil controller menjadi Response: berkas biner atau JSON seragam. */
function bentukRespons(hasil) {
  // controller mengembalikan berkas (mis. gambar): kirim biner apa adanya
  if (hasil?.__berkas) return berkas(hasil.buffer, hasil.tipe, hasil.namaFile);
  return sukses(hasil);
}

/**
 * Menjalankan satu request HTTP: cari route, baca dan validasi input,
 * panggil fungsi controller, bungkus hasil. Error ditangani global di sini.
 */
export async function tanganiRequest(request, metode, segmen) {
  try {
    const path = `/${(segmen ?? []).join('/')}`;
    const route = cariRoute(metode, path);
    // path/metode tidak terdaftar: 404 seragam
    if (!route) return gagal('Endpoint tidak ditemukan.', 404);

    let input = await bacaInput(request, route.sumber);
    // schema tingkat route (opsional); validasi mendalam tetap ada di controller
    if (route.schema) input = validasi(route.schema, input);

    const controller = ambilDep()[route.controller];
    return bentukRespons(await controller[route.fungsi](input));
  } catch (error) {
    const { status, message, detail } = normalisasiError(error);
    return gagal(message, status, detail);
  }
}
