import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import PilihModulBaru from './PilihModulBaru';
import { t } from '@/utils/i18n';

/** Halaman "Buat dokumentasi modul": pilih 1-5 modul dari satu repo. */
export default async function HalamanDokumentasiBaru({ modulId = null }) {
  const pohon = await ambilDep().layoutController.pohon();
  return (
    <div>
      <HeaderHalaman judul={t('prompt.baruJudul')} sub={<p className="text-sm text-muted">{t('prompt.baruHint')}</p>} />
      <PilihModulBaru pohon={pohon} awalModulId={modulId} />
    </div>
  );
}
