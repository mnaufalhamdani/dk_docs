import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import EntityForm from '@/modules/shared/EntityForm';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { fieldHalaman } from '@/modules/shared/fieldDefs';
import { buatHalaman, ubahHalaman } from './halaman.actions';
import { t } from '@/utils/i18n';

/** Form tambah halaman (butuh menuId) atau ubah halaman (butuh id). */
export default async function FormHalaman({ menuId = null, id = null }) {
  // mode ubah: muat halaman beserta kata kunci; mode tambah: hanya menu induk
  const halaman = id ? await muat(() => ambilDep().halamanController.untukForm(id)) : null;
  const menu = await muat(() => ambilDep().menuController.detail(halaman ? halaman.menu_id : menuId));
  return (
    <div>
      <HeaderHalaman
        judul={halaman ? t('halaman.ubah') : t('halaman.tambah')}
        breadcrumb={[
          { nama: menu.repo.nama, href: `/repo/${menu.repo.id}` },
          { nama: menu.modul.nama, href: `/modul/${menu.modul.id}` },
          { nama: menu.nama, href: `/menu/${menu.id}` },
        ]}
      />
      <EntityForm
        fields={fieldHalaman()}
        initial={halaman}
        hidden={halaman ? { id: halaman.id } : { menu_id: menu.id }}
        action={halaman ? ubahHalaman : buatHalaman}
        submitLabel={t('umum.simpan')}
        batalHref={halaman ? `/menu/${menu.id}?h=${halaman.id}` : `/menu/${menu.id}`}
      />
    </div>
  );
}
