import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import EntityForm from '@/modules/shared/EntityForm';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { fieldModul } from '@/modules/shared/fieldDefs';
import { buatModul, ubahModul } from './modul.actions';
import { t } from '@/utils/i18n';

/** Form tambah modul (butuh repoId) atau ubah modul (butuh id). */
export default async function FormModul({ repoId = null, id = null }) {
  // mode ubah: muat modul beserta alias; mode tambah: muat repo induk untuk breadcrumb
  const modul = id ? await muat(() => ambilDep().modulController.untukForm(id)) : null;
  const repo = await muat(() => ambilDep().repoController.detail(modul ? modul.repo_id : repoId));
  const batalHref = modul ? `/modul/${modul.id}` : `/repo/${repo.id}`;
  return (
    <div>
      <HeaderHalaman judul={modul ? t('modul.ubah') : t('modul.tambah')} breadcrumb={[{ nama: repo.nama, href: `/repo/${repo.id}` }]} />
      <EntityForm
        fields={fieldModul()}
        initial={modul}
        hidden={modul ? { id: modul.id } : { repo_id: repo.id }}
        action={modul ? ubahModul : buatModul}
        submitLabel={t('umum.simpan')}
        batalHref={batalHref}
      />
    </div>
  );
}
