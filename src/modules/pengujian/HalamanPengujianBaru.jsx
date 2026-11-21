import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormPengujianBaru from './FormPengujianBaru';
import { t } from '@/utils/i18n';

/** Halaman Uji CR baru: memuat pilihan modul/menu lalu menampilkan form. */
export default async function HalamanPengujianBaru() {
  const opsi = await ambilDep().pengujianController.opsiTarget();
  return (
    <div>
      <HeaderHalaman
        breadcrumb={[{ nama: t('pengujian.judul'), href: '/pengujian' }]}
        judul={t('pengujian.baru')}
        sub={<p className="text-sm text-muted">{t('pengujian.baruHint')}</p>}
      />
      <FormPengujianBaru opsi={opsi} />
    </div>
  );
}
