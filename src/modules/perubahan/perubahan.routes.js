/** Daftar endpoint modul perubahan (baca saja). Filter dikirim lewat query string. */
export const perubahanRoutes = [
  { metode: 'GET', path: '/perubahan', controller: 'perubahanController', fungsi: 'daftar', schema: null, sumber: 'query' },
];
