/**
 * Daftar endpoint modul dokumentasi (untuk kebutuhan di luar Server Actions:
 * unggah dan tampil gambar). Validasi dilakukan di controller.
 */
export const dokumentasiRoutes = [
  { metode: 'POST', path: '/dokumentasi/gambar', controller: 'dokumentasiController', fungsi: 'unggahGambar', schema: null, sumber: 'form' },
  { metode: 'GET', path: '/dokumentasi/gambar', controller: 'dokumentasiController', fungsi: 'ambilGambar', schema: null, sumber: 'query' },
  { metode: 'DELETE', path: '/dokumentasi/gambar', controller: 'dokumentasiController', fungsi: 'hapusGambar', schema: null, sumber: 'query' },
];
