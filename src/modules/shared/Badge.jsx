import { t } from '@/utils/i18n';

/** Dasar badge kecil. */
const dasar = 'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none';

/** Badge status poin: beta (amber) atau live (hijau). */
export function StatusBadge({ status }) {
  const warna =
    status === 'live'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  return <span className={`${dasar} ${warna}`}>{t(`status.${status}`)}</span>;
}

/** Badge "ada poin beta" untuk modul/menu/halaman yang masih punya poin beta. */
export function BadgeBeta() {
  return (
    <span className={`${dasar} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`} title={t('badge.adaBetaHint')}>
      {t('status.beta')}
    </span>
  );
}

/** Badge pola menu (crud / lainnya). */
export function PolaBadge({ pola }) {
  return <span className={`${dasar} bg-accent-soft text-accent`}>{t(`pola.${pola}`)}</span>;
}

/** Badge tipe perubahan: CR biru, B merah muda. */
export function TipeBadge({ tipe }) {
  const warna =
    tipe === 'B'
      ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  return <span className={`${dasar} ${warna}`}>{tipe}</span>;
}

/** Label stub: terdaftar tetapi belum didokumentasikan. */
export function LabelStub() {
  return (
    <span className={`${dasar} border border-dashed border-line text-muted`}>{t('badge.belumDidokumentasikan')}</span>
  );
}
