/** Daftar endpoint modul pengaturan. Input body dikirim sebagai JSON. */
export const pengaturanRoutes = [
  { metode: 'GET', path: '/pengaturan', controller: 'pengaturanController', fungsi: 'ambil', schema: null, sumber: null },
  { metode: 'PUT', path: '/pengaturan', controller: 'pengaturanController', fungsi: 'ubah', schema: null, sumber: 'body' },
];
