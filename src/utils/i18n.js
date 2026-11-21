import idID from '@/locales/id_ID.json';

/**
 * Helper terjemahan sederhana. Kunci memakai titik untuk jenjang, misal t('menu.judul').
 * Parameter diganti pada penanda {nama}. Bila kunci tidak ada, kunci itu sendiri dikembalikan.
 */
export function t(kunci, param = {}) {
  const nilai = kunci.split('.').reduce((acc, bagian) => (acc == null ? acc : acc[bagian]), idID);
  // kunci tidak ditemukan / bukan teks: tampilkan kunci agar mudah dilacak
  if (typeof nilai !== 'string') return kunci;
  return nilai.replace(/\{(\w+)\}/g, (_, nama) => (param[nama] ?? `{${nama}}`).toString());
}
