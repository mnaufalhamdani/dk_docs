import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormBlueprintBaru from './FormBlueprintBaru';
import { t } from '@/utils/i18n';

/** Halaman Blueprint: form blueprint baru dan daftar blueprint sebelumnya. */
export default async function DaftarBlueprint() {
  const { blueprintController, repoController } = ambilDep();
  const [daftar, repos] = await Promise.all([blueprintController.daftar(), repoController.daftar()]);
  return (
    <div className="space-y-8">
      <div>
        <HeaderHalaman judul={t('blueprint.judul')} sub={<p className="text-sm text-muted">{t('blueprint.deskripsi')}</p>} />
        <FormBlueprintBaru repos={repos.map((r) => ({ id: r.id, nama: r.nama }))} />
      </div>
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('blueprint.terbaru')}</h2>
        {daftar.length === 0 ? (
          <p className="text-sm text-muted">{t('blueprint.kosong')}</p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-panel">
            {daftar.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <Link href={`/blueprint/${b.id}`} className="font-medium text-accent hover:underline">
                  {b.judul}
                </Link>
                <span className="text-xs text-muted">{b.repo_nama}</span>
                <span className="ml-auto text-xs text-muted">
                  {t('blueprint.ringkasList', { poin: b.jumlah_poin, kelompok: b.jumlah_kelompok, prompt: b.jumlah_prompt })} · {b.created_at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
