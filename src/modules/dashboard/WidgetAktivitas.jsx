import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { Widget, GalatWidget, KosongWidget } from './KerangkaWidget';
import { muatAman } from './dashboard.aman';
import { t } from '@/utils/i18n';

/** Warna chip nomor menurut tipe: CR biru, B merah muda (sama dengan chip tautan poin). */
const WARNA_TIPE = {
  CR: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  B: 'border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
};

/** Satu baris aktivitas: CR/B (chip nomor) atau dokumentasi yang diubah. Tanpa nama developer. */
function Baris({ a }) {
  const waktu = String(a.waktu ?? '').slice(0, 16);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      {a.jenis === 'perubahan' ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link href={`/perubahan/${a.id}`} className={`rounded border px-1.5 py-0.5 font-mono text-[11px] leading-none hover:underline ${WARNA_TIPE[a.tipe] ?? WARNA_TIPE.CR}`}>
            {a.nomor}
          </Link>
          <span className="text-xs text-muted">{t('dashboard.aktivitas.pesan', { n: a.jumlah_pesan })}</span>
          {a.belum_dipetakan && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{t('dashboard.belumDipetakan')}</span>}
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-xs text-muted">{t('dashboard.aktivitas.dokumentasiDiubah')}</p>
          <Link href={`/menu/${a.menu_id}?h=${a.halaman_id}`} className="block truncate text-accent hover:underline" title={a.konteks}>
            {a.halaman_nama}
          </Link>
        </div>
      )}
      <span className="whitespace-nowrap text-xs text-muted">{waktu}</span>
    </li>
  );
}

/** Widget 4: aktivitas terbaru, gabungan CR/B terbaru dan dokumentasi yang baru diubah (maks. 15). */
export default async function WidgetAktivitas({ filter }) {
  const hasil = await muatAman('aktivitas', () => ambilDep().dashboardController.aktivitas(filter));
  // query gagal: tampilkan galat hanya di widget ini
  if (!hasil.ok) return <GalatWidget judul={t('dashboard.aktivitas.judul')} />;
  return (
    <Widget id="widget-aktivitas" judul={t('dashboard.aktivitas.judul')}>
      {hasil.data.length === 0 ? (
        <KosongWidget>{t('dashboard.aktivitas.kosong')}</KosongWidget>
      ) : (
        <ul className="divide-y divide-line">
          {hasil.data.map((a) => (
            <Baris key={`${a.jenis}-${a.id}`} a={a} />
          ))}
        </ul>
      )}
    </Widget>
  );
}
