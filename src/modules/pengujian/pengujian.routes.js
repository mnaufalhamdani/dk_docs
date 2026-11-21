/**
 * Daftar endpoint modul pengujian: unduh prompt uji (.md), pratinjau dan simpan hasil uji beserta bukti,
 * serta menampilkan berkas bukti. Tanpa autentikasi (jaringan internal); input divalidasi di controller.
 */
export const pengujianRoutes = [
  { metode: 'GET', path: '/pengujian/unduh', controller: 'pengujianController', fungsi: 'unduh', schema: null, sumber: 'query' },
  { metode: 'POST', path: '/pengujian/hasil/pratinjau', controller: 'pengujianController', fungsi: 'pratinjauHasil', schema: null, sumber: 'body' },
  { metode: 'POST', path: '/pengujian/hasil', controller: 'pengujianController', fungsi: 'simpanHasil', schema: null, sumber: 'form' },
  { metode: 'GET', path: '/pengujian/pdf', controller: 'pengujianController', fungsi: 'ambilPdf', schema: null, sumber: 'query' },
  { metode: 'GET', path: '/pengujian/bukti', controller: 'pengujianController', fungsi: 'ambilBukti', schema: null, sumber: 'query' },
];
