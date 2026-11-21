/** Daftar endpoint modul prompt: unduh prompt sebagai .md (prompt_<kodeRepo>_<uniqueId>.md). */
export const promptRoutes = [
  { metode: 'GET', path: '/prompt/unduh', controller: 'promptController', fungsi: 'unduh', schema: null, sumber: 'query' },
];
