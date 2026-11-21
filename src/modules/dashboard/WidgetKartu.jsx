import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { kartu } from '@/modules/shared/ui';
import { Widget, GalatWidget, LabelKondisi } from './KerangkaWidget';
import { muatAman } from './dashboard.aman';
import { paramDaftarPerubahan, urlDashboard, hariIniLokal } from './dashboard.filter';
import { t } from '@/utils/i18n';

/** Tujuan klik kartu repo/modul/halaman: repo tunggal bila hanya satu repo dipilih, selain itu daftar repo. */
function tujuanRegistry(filter) {
  return filter.repo.length === 1 ? `/repo/${filter.repo[0]}` : '/repo';
}

/** Menyusun definisi kartu: label, angka, tujuan klik, dan apakah mengikuti filter tanggal. */
function susunKartu(d, filter) {
  const hariIni = hariIniLokal();
  const ke = (lihat, jangkar) => `${urlDashboard({ ...filter, lihat }, hariIni)}${jangkar}`;
  return [
    { kunci: 'repo', label: t('dashboard.kartu.repo'), nilai: d.repo, href: '/repo', ikutTanggal: false },
    { kunci: 'modul', label: t('dashboard.kartu.modul'), nilai: d.modul, href: tujuanRegistry(filter), ikutTanggal: false },
    { kunci: 'halaman', label: t('dashboard.kartu.halaman'), nilai: d.halaman, href: tujuanRegistry(filter), ikutTanggal: false },
    { kunci: 'crb', label: t('dashboard.kartu.crb'), nilai: d.crb, href: paramDaftarPerubahan(filter), ikutTanggal: true },
    { kunci: 'crbBelum', label: t('dashboard.kartu.crbBelum'), nilai: d.crb_belum_dokumentasi, href: paramDaftarPerubahan(filter, { dokumentasi: 'belum' }), ikutTanggal: true },
    { kunci: 'poinBeta', label: t('dashboard.kartu.poinBeta'), nilai: d.poin_beta, href: ke('beta', '#widget-poin-beta'), ikutTanggal: false },
    { kunci: 'poinPending', label: t('dashboard.kartu.poinPending'), nilai: d.poin_pending, href: '#widget-poin-beta', ikutTanggal: false },
    { kunci: 'modulStub', label: t('dashboard.kartu.modulStub'), nilai: d.modul_stub, href: ke('stub', '#widget-antrean'), ikutTanggal: false },
  ];
}

/** Widget 1: kartu ringkasan yang bisa diklik menuju daftar yang sudah terfilter. */
export default async function WidgetKartu({ filter }) {
  const hasil = await muatAman('kartu', () => ambilDep().dashboardController.kartu(filter));
  // query gagal: tampilkan galat hanya di widget ini
  if (!hasil.ok) return <GalatWidget judul={t('dashboard.kartu.judul')} />;
  return (
    <Widget id="widget-kartu" judul={t('dashboard.kartu.judul')}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {susunKartu(hasil.data, filter).map((k) => (
          <li key={k.kunci}>
            <Link href={k.href} className={`${kartu} block space-y-1 p-3 hover:border-accent`}>
              <span className="block text-2xl font-semibold tabular-nums">{k.nilai}</span>
              <span className="block text-xs text-muted">{k.label}</span>
              {/* angka selain CR/B tidak mengikuti rentang tanggal */}
              {!k.ikutTanggal && <LabelKondisi />}
            </Link>
          </li>
        ))}
      </ul>
    </Widget>
  );
}
