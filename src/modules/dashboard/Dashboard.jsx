import { Suspense } from 'react';
import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import FilterDashboard from './FilterDashboard';
import WidgetKartu from './WidgetKartu';
import WidgetAntrean from './WidgetAntrean';
import WidgetPetaModul from './WidgetPetaModul';
import WidgetAktivitas from './WidgetAktivitas';
import WidgetPoinBeta from './WidgetPoinBeta';
import WidgetTerakhirDibuka from './WidgetTerakhirDibuka';
import { SkeletonWidget } from './KerangkaWidget';
import { hariIniLokal } from './dashboard.filter';
import { t } from '@/utils/i18n';

/**
 * Beranda dashboard: filter global lalu enam widget. Tiap widget dimuat paralel dalam Suspense sendiri
 * (skeleton selama menunggu) dan menangani galatnya sendiri. `key` memaksa skeleton muncul lagi saat filter berubah.
 */
export default async function Dashboard({ query }) {
  const { dashboardController } = ambilDep();
  const filter = dashboardController.filter(query);
  const repoOpsi = await dashboardController.repoOpsi();
  const kunci = JSON.stringify(filter);

  return (
    <div className="space-y-5">
      <HeaderHalaman
        judul={t('dashboard.judul')}
        sub={<p className="text-sm text-muted">{t('dashboard.deskripsi')}</p>}
        aksi={
          <>
            <Link href="/repo" className={tombolSekunder}>
              {t('dashboard.daftarRepo')}
            </Link>
            <Link href="/repo/baru" className={tombolUtama}>
              {t('dashboard.tambahRepo')}
            </Link>
          </>
        }
      />
      <FilterDashboard key={kunci} filter={filter} repoOpsi={repoOpsi} hariIni={hariIniLokal()} />
      <Suspense key={`kartu-${kunci}`} fallback={<SkeletonWidget baris={2} />}>
        <WidgetKartu filter={filter} />
      </Suspense>
      <Suspense key={`antrean-${kunci}`} fallback={<SkeletonWidget baris={5} />}>
        <WidgetAntrean filter={filter} />
      </Suspense>
      <Suspense key={`peta-${kunci}`} fallback={<SkeletonWidget baris={4} />}>
        <WidgetPetaModul filter={filter} />
      </Suspense>
      <div className="grid gap-5 lg:grid-cols-2">
        <Suspense key={`aktivitas-${kunci}`} fallback={<SkeletonWidget baris={6} />}>
          <WidgetAktivitas filter={filter} />
        </Suspense>
        <Suspense key={`beta-${kunci}`} fallback={<SkeletonWidget baris={6} />}>
          <WidgetPoinBeta filter={filter} />
        </Suspense>
      </div>
      <WidgetTerakhirDibuka />
    </div>
  );
}
