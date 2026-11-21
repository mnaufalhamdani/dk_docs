import { healthRoutes } from './health/health.routes';
import { pengaturanRoutes } from './pengaturan/pengaturan.routes';
import { dokumentasiRoutes } from './dokumentasi/dokumentasi.routes';
import { pencarianRoutes } from './pencarian/pencarian.routes';
import { syncRoutes } from './sync/sync.routes';
import { perubahanRoutes } from './perubahan/perubahan.routes';
import { promptRoutes } from './prompt/prompt.routes';
import { pengujianRoutes } from './pengujian/pengujian.routes';

/** Gabungan semua daftar endpoint modul; dipakai satu pintu masuk di src/app/api/v1. */
export const semuaRoutes = [
  ...healthRoutes,
  ...pengaturanRoutes,
  ...dokumentasiRoutes,
  ...pencarianRoutes,
  ...syncRoutes,
  ...perubahanRoutes,
  ...promptRoutes,
  ...pengujianRoutes,
];
