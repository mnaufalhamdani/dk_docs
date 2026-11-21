import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { TipeBadge } from '@/modules/shared/Badge';
import PilihRepoUsulan from './PilihRepoUsulan';
import { t } from '@/utils/i18n';

/** Halaman "Usulkan perubahan dokumentasi" untuk satu CR/B: pilih repo, lalu buat prompt per repo. */
export default async function HalamanUsulan({ id }) {
  const { perubahanController, repoController } = ambilDep();
  const [perubahan, semuaRepo] = await Promise.all([muat(() => perubahanController.detail(id)), repoController.daftar()]);
  // repo yang punya modul terpetakan dicentang bawaan; repo lain bisa ditambah manual
  const terdeteksi = new Set(perubahan.modul_terdampak.map((m) => m.repo_id));
  const repos = semuaRepo.map((r) => ({ id: r.id, nama: r.nama, kode: r.kode, terdeteksi: terdeteksi.has(r.id) }));

  return (
    <div>
      <HeaderHalaman
        breadcrumb={[
          { nama: t('perubahan.judul'), href: '/perubahan' },
          { nama: perubahan.nomor, href: `/perubahan/${perubahan.id}` },
        ]}
        judul={t('prompt.usulanJudul')}
        badge={<TipeBadge tipe={perubahan.tipe} />}
        sub={<p className="text-sm text-muted">{t('prompt.usulanHint')}</p>}
      />
      {repos.length === 0 ? <p className="text-sm text-muted">{t('prompt.belumAdaRepo')}</p> : <PilihRepoUsulan perubahanId={perubahan.id} repos={repos} />}
    </div>
  );
}
