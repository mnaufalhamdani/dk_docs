import Link from 'next/link';
import { t } from '@/utils/i18n';
import { tombolSekunder } from './ui';

/** Penanda modul/menu tanpa dokumentasi; tombol "Buat dokumentasi" membuka generator prompt untuk modul itu. */
export default function BelumAdaDokumentasi({ modulId }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-line p-4 text-sm text-muted">
      <span>{t('dokumentasi.belumAda')}</span>
      <Link href={`/prompt/baru?modul=${modulId}`} className={tombolSekunder}>
        {t('dokumentasi.buat')}
      </Link>
    </div>
  );
}
