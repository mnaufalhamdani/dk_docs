import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import EntityForm from '@/modules/shared/EntityForm';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { fieldRepo } from '@/modules/shared/fieldDefs';
import { buatRepo, ubahRepo } from './repo.actions';
import { t } from '@/utils/i18n';

/** Form tambah (tanpa id) atau ubah (dengan id) repo. */
export default async function FormRepo({ id = null }) {
  // mode ubah: muat data lama; mode tambah: form kosong
  const repo = id ? await muat(() => ambilDep().repoController.detail(id)) : null;
  return (
    <div>
      <HeaderHalaman judul={repo ? t('repo.ubah') : t('repo.tambah')} breadcrumb={repo ? [{ nama: repo.nama, href: `/repo/${repo.id}` }] : []} />
      <EntityForm
        fields={fieldRepo()}
        initial={repo}
        hidden={repo ? { id: repo.id } : {}}
        action={repo ? ubahRepo : buatRepo}
        submitLabel={t('umum.simpan')}
        batalHref={repo ? `/repo/${repo.id}` : '/'}
      />
    </div>
  );
}
