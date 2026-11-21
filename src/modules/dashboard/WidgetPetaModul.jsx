import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { Widget, GalatWidget, KosongWidget } from './KerangkaWidget';
import { muatAman } from './dashboard.aman';
import { t } from '@/utils/i18n';

/** Kelas warna petak menurut kelengkapan: belum (putus-putus), sebagian (amber), lengkap (hijau). */
const WARNA_PETAK = {
  belum: 'border-dashed border-line bg-bg text-muted',
  sebagian: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  lengkap: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
};

/** Teks tooltip satu petak: kelengkapan halaman dan waktu pembaruan terakhir. */
function tooltip(m) {
  return t('dashboard.peta.tooltip', { nama: m.nama, berpoin: m.berpoin, halaman: m.halaman, waktu: m.diperbarui ?? t('dashboard.peta.tanpaPembaruan') });
}

/** Petak satu modul: tautan ke halaman modul dengan teks status (bukan hanya warna). */
function Petak({ m }) {
  return (
    <li>
      <Link href={`/modul/${m.id}`} title={tooltip(m)} className={`block rounded-md border px-2 py-1.5 text-xs hover:opacity-80 ${WARNA_PETAK[m.kelengkapan]}`}>
        <span className="block truncate font-medium">{m.nama}</span>
        <span className="block text-[10px] uppercase tracking-wide">{t(`dashboard.peta.${m.kelengkapan}`)}</span>
      </Link>
    </li>
  );
}

/** Widget 3: peta modul per repo (kondisi saat ini; tidak mengikuti tanggal). */
export default async function WidgetPetaModul({ filter }) {
  const hasil = await muatAman('peta_modul', () => ambilDep().dashboardController.petaModul(filter));
  // query gagal: tampilkan galat hanya di widget ini
  if (!hasil.ok) return <GalatWidget judul={t('dashboard.peta.judul')} />;
  return (
    <Widget id="widget-peta" judul={t('dashboard.peta.judul')} kondisiSaatIni aksi={<span className="text-xs text-muted">{t('dashboard.peta.legenda')}</span>}>
      {hasil.data.length === 0 ? (
        <KosongWidget>{t('dashboard.peta.kosong')}</KosongWidget>
      ) : (
        <div className="space-y-4">
          {hasil.data.map((r) => (
            <div key={r.id} className="space-y-2">
              <Link href={`/repo/${r.id}`} className="text-sm font-medium hover:text-accent hover:underline">
                {r.nama}
              </Link>
              {r.modul.length === 0 ? (
                <p className="text-xs text-muted">{t('dashboard.peta.repoKosong')}</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {r.modul.map((m) => (
                    <Petak key={m.id} m={m} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
