/** Daftar endpoint modul sync. Input dikirim sebagai JSON; validasi dilakukan di controller. */
export const syncRoutes = [
  { metode: 'GET', path: '/sync/status', controller: 'syncController', fungsi: 'status', schema: null, sumber: null },
  { metode: 'POST', path: '/sync/pratinjau', controller: 'syncController', fungsi: 'pratinjau', schema: null, sumber: 'body' },
  { metode: 'POST', path: '/sync/simpan', controller: 'syncController', fungsi: 'simpan', schema: null, sumber: 'body' },
];
