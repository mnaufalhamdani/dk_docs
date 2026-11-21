import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormImpor from './FormImpor';
import { t } from '@/utils/i18n';

/** Halaman Impor: form tempel/unggah JSON dan daftar impor terbaru. */
export default async function HalamanImpor({ uniqueId = null }) {
  const daftar = await ambilDep().imporController.daftar(uniqueId);
  return (
    <div className="space-y-8">
      <div>
        <HeaderHalaman
          judul={t('impor.judul')}
          sub={
            <p className="text-sm text-muted">
              {t('impor.deskripsi')}
              {uniqueId && (
                <>
                  {' '}
                  <Link href={`/prompt/${uniqueId}`} className="font-mono text-accent hover:underline">
                    {uniqueId}
                  </Link>
                </>
              )}
            </p>
          }
        />
        <FormImpor />
      </div>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('impor.terbaru')}</h2>
        {daftar.length === 0 ? (
          <p className="text-sm text-muted">{t('impor.belumAda')}</p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-panel">
            {daftar.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <Link href={`/impor/${i.id}`} className="font-mono text-accent hover:underline">
                  #{i.id}
                </Link>
                <span className="font-mono text-xs">{i.unique_id}</span>
                <span className="text-xs text-muted">{t(`prompt.jenis.${i.jenis}`)}</span>
                <span className="text-xs">{i.repo_nama}</span>
                <span className="ml-auto text-xs text-muted">
                  {t(`impor.status.${i.status}`)} · {i.created_at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
