import { kartu } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Label kecil untuk widget/angka yang tidak mengikuti filter tanggal. */
export function LabelKondisi() {
  return <span className="rounded border border-dashed border-line px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted">{t('dashboard.kondisiSaatIni')}</span>;
}

/** Bingkai satu widget: judul, label opsional, aksi di kanan, lalu isi. `id` dipakai sebagai jangkar tautan. */
export function Widget({ id, judul, kondisiSaatIni = false, aksi = null, children }) {
  return (
    <section id={id} aria-label={judul} className={`${kartu} scroll-mt-4 space-y-3 p-4`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{judul}</h2>
          {kondisiSaatIni && <LabelKondisi />}
        </div>
        {aksi}
      </header>
      {children}
    </section>
  );
}

/** Pesan kosong yang jelas di dalam widget. */
export function KosongWidget({ children }) {
  return <p className="rounded-md border border-dashed border-line p-3 text-sm text-muted">{children}</p>;
}

/** Tampilan galat satu widget: hanya widget itu yang gagal, bukan seluruh halaman. */
export function GalatWidget({ judul }) {
  return (
    <section className={`${kartu} p-4`}>
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {t('dashboard.galat', { judul })}
      </p>
    </section>
  );
}

/** Kerangka pemuatan satu widget (skeleton) selama data diambil. */
export function SkeletonWidget({ baris = 3 }) {
  return (
    <div role="status" aria-label={t('dashboard.memuat')} className={`${kartu} animate-pulse space-y-3 p-4`}>
      <div className="h-4 w-1/3 rounded bg-line" />
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="h-4 rounded bg-line" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
