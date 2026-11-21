import { ambilDep } from '@/di/container';
import EntityForm from '@/modules/shared/EntityForm';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { simpanPengaturan } from './pengaturan.actions';
import { t } from '@/utils/i18n';

/** Field pengaturan: tiga angka dan dua pilihan mode. */
const fieldPengaturan = () => [
  { name: 'batas_karakter_poin', label: t('pengaturan.batasKarakter'), type: 'text', hint: t('pengaturan.batasKarakterHint') },
  { name: 'batas_kalimat_poin', label: t('pengaturan.batasKalimat'), type: 'text', hint: t('pengaturan.batasKalimatHint') },
  { name: 'ukuran_kelompok_blueprint', label: t('pengaturan.ukuranKelompok'), type: 'text', hint: t('pengaturan.ukuranKelompokHint') },
  { name: 'mode_analisis_blueprint', label: t('pengaturan.modeAnalisis'), type: 'select', hint: t('pengaturan.modeHint'), options: [{ value: 'aturan', label: 'aturan' }, { value: 'ai', label: 'ai' }] },
  { name: 'mode_rapikan_bahasa', label: t('pengaturan.modeRapikan'), type: 'select', hint: t('pengaturan.modeHint'), options: [{ value: 'aturan', label: 'aturan' }, { value: 'ai', label: 'ai' }] },
];

/** Halaman pengaturan aplikasi. */
export default async function FormPengaturan() {
  const nilai = await ambilDep().pengaturanController.ambil();
  return (
    <div>
      <HeaderHalaman judul={t('pengaturan.judul')} />
      <EntityForm fields={fieldPengaturan()} initial={nilai} action={simpanPengaturan} submitLabel={t('umum.simpan')} batalHref="/" />
    </div>
  );
}
