import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import EntityForm from '@/modules/shared/EntityForm';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { fieldMenu } from '@/modules/shared/fieldDefs';
import { buatMenu, ubahMenu } from './menu.actions';
import { t } from '@/utils/i18n';

/** Form tambah menu (butuh modulId) atau ubah menu (butuh id). */
export default async function FormMenu({ modulId = null, id = null }) {
  // mode ubah: muat menu beserta alias; mode tambah: hanya modul induk
  const menu = id ? await muat(() => ambilDep().menuController.untukForm(id)) : null;
  const modul = await muat(() => ambilDep().modulController.detail(menu ? menu.modul_id : modulId));
  return (
    <div>
      <HeaderHalaman
        judul={menu ? t('menu.ubah') : t('menu.tambah')}
        breadcrumb={[
          { nama: modul.repo.nama, href: `/repo/${modul.repo.id}` },
          { nama: modul.nama, href: `/modul/${modul.id}` },
        ]}
      />
      <EntityForm
        fields={fieldMenu({ baru: !menu })}
        initial={menu}
        hidden={menu ? { id: menu.id } : { modul_id: modul.id }}
        action={menu ? ubahMenu : buatMenu}
        submitLabel={t('umum.simpan')}
        batalHref={menu ? `/menu/${menu.id}` : `/modul/${modul.id}`}
      />
    </div>
  );
}
