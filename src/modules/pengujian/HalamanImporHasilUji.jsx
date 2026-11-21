import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import FormImporHasilUji from './FormImporHasilUji';
import { t } from '@/utils/i18n';

/** Daftar putaran dan repo yang menunggu atau sudah punya hasil, sebagai petunjuk JSON mana yang dibutuhkan. */
function StatusImpor({ riwayat }) {
  return (
    <ul className="space-y-1 text-xs">
      {riwayat.flatMap((u) =>
        u.repo.map((r) => (
          <li key={`${u.id}:${r.repo_nama}`} className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{t('pengujian.putaranKe', { n: u.nomor })}</span>
            <span className="font-mono text-muted">{u.unique_id}</span>
            <span>{r.repo_nama}</span>
            <span className={r.diimpor_pada ? 'text-green-700 dark:text-green-300' : 'text-muted'}>
              {r.diimpor_pada ? t('pengujian.diimporPada', { waktu: r.diimpor_pada }) : t('pengujian.belumDiimpor')}
            </span>
          </li>
        )),
      )}
    </ul>
  );
}

/** Halaman impor hasil uji satu Uji CR: petunjuk status impor per putaran/repo dan form impor. */
export default async function HalamanImporHasilUji({ id }) {
  const d = await muat(() => ambilDep().pengujianController.detail(id));
  return (
    <div className="space-y-4">
      <HeaderHalaman
        breadcrumb={[
          { nama: t('pengujian.judul'), href: '/pengujian' },
          { nama: d.cr_id, href: `/pengujian/${d.id}` },
        ]}
        judul={t('pengujian.imporJudul')}
        sub={<p className="text-sm text-muted">{t('pengujian.imporHint')}</p>}
      />
      <section className="space-y-1 rounded-lg border border-line bg-panel p-3">
        <h2 className="text-sm font-medium">{t('pengujian.statusImporJudul')}</h2>
        <StatusImpor riwayat={d.riwayat} />
      </section>
      <FormImporHasilUji pengujianId={d.id} />
    </div>
  );
}
