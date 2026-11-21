import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { Widget, GalatWidget, KosongWidget } from './KerangkaWidget';
import { muatAman } from './dashboard.aman';
import { hariIniLokal, urlDashboard } from './dashboard.filter';
import { t } from '@/utils/i18n';

/** Satu poin: tautan ke halaman asal; poin pending redup dan tercoret seperti di tempat lain. */
function Poin({ p, kelompok }) {
  return (
    <li className="text-sm">
      <Link href={`/menu/${kelompok.menu_id}?h=${kelompok.halaman_id}&p=${p.id}`} className={`hover:underline ${p.pending ? 'text-muted line-through opacity-60' : ''}`}>
        {p.isi}
      </Link>
      {p.pending && <span className="ml-2 rounded border border-dashed border-line px-1 py-0.5 align-middle text-[10px] uppercase text-muted">{t('dashboard.beta.pending')}</span>}
    </li>
  );
}

/** Widget 5: poin beta terbaru dikelompokkan per halaman (kondisi saat ini; tidak mengikuti tanggal). */
export default async function WidgetPoinBeta({ filter }) {
  const hasil = await muatAman('poin_beta', () => ambilDep().dashboardController.poinBeta(filter));
  // query gagal: tampilkan galat hanya di widget ini
  if (!hasil.ok) return <GalatWidget judul={t('dashboard.beta.judul')} />;
  const { total, jumlah_tampil: tampil, kelompok } = hasil.data;
  const terbuka = filter.lihat === 'beta';
  const href = `${urlDashboard({ ...filter, lihat: terbuka ? '' : 'beta' }, hariIniLokal())}#widget-poin-beta`;
  return (
    <Widget
      id="widget-poin-beta"
      judul={t('dashboard.beta.judul')}
      kondisiSaatIni
      aksi={
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">{t('dashboard.beta.total', { tampil, total })}</span>
          {(total > tampil || terbuka) && (
            <Link href={href} className="text-accent hover:underline">
              {terbuka ? t('dashboard.ringkas') : t('dashboard.lihatSemua')}
            </Link>
          )}
        </div>
      }
    >
      {kelompok.length === 0 ? (
        <KosongWidget>{t('dashboard.beta.kosong')}</KosongWidget>
      ) : (
        <div className="space-y-3">
          {kelompok.map((k) => (
            <div key={k.halaman_id} className="space-y-1">
              <p className="text-xs font-semibold text-muted">{k.judul}</p>
              <ul className="list-disc space-y-1 pl-5">
                {k.poin.map((p) => (
                  <Poin key={p.id} p={p} kelompok={k} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
