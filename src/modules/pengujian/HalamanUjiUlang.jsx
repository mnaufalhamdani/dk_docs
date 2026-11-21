import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormUjiUlang from './FormUjiUlang';
import { t } from '@/utils/i18n';

/** Halaman uji ulang: memuat status sel terkini dan pilihan target untuk poin baru, lalu menampilkan form. */
export default async function HalamanUjiUlang({ id }) {
  const controller = ambilDep().pengujianController;
  const [d, opsi] = await Promise.all([muat(() => controller.detail(id)), controller.opsiTarget()]);
  return (
    <div className="space-y-4">
      <HeaderHalaman
        breadcrumb={[
          { nama: t('pengujian.judul'), href: '/pengujian' },
          { nama: d.cr_id, href: `/pengujian/${d.id}` },
        ]}
        judul={t('pengujian.ujiUlang')}
        sub={<p className="text-sm text-muted">{t('pengujian.ujiUlangHint', { n: (d.putaran_terakhir?.nomor ?? 0) + 1 })}</p>}
      />
      <FormUjiUlang pengujianId={d.id} poin={d.poin} repos={d.repos} opsi={opsi} />
    </div>
  );
}
