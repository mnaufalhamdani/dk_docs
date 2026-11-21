import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormSync from './FormSync';
import { t } from '@/utils/i18n';

/** Halaman Sync CR/B: memuat status sumber lalu menampilkan form. */
export default async function SyncHalaman({ awal }) {
  const status = ambilDep().syncController.status();
  return (
    <div>
      <HeaderHalaman judul={t('sync.judul')} sub={<p className="text-sm text-muted">{t('sync.deskripsi')}</p>} />
      <FormSync status={status} awal={awal} />
    </div>
  );
}
