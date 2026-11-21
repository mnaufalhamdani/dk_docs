import Link from 'next/link';
import { ambilDep } from '@/di/container';
import { muat } from '@/utils/muat';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import TombolAksi from '@/modules/shared/TombolAksi';
import { BadgeBeta, LabelStub } from '@/modules/shared/Badge';
import { kartu, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { buatSesiAudit } from '@/modules/prompt/prompt.actions';
import { hapusRepo } from './repo.actions';
import InfoRepo from './InfoRepo';
import { t } from '@/utils/i18n';

/** Detail repo: info singkat dan daftar modul. */
export default async function RepoDetail({ id }) {
  const repo = await muat(() => ambilDep().repoController.detail(id));
  return (
    <div>
      <HeaderHalaman
        judul={repo.nama}
        sub={
          <p className="font-mono text-xs text-muted">
            {repo.kode} · {repo.platform} · {repo.branch_utama}
          </p>
        }
        aksi={
          <>
            <Link href={`/repo/${repo.id}/modul/baru`} className={tombolUtama}>
              {t('modul.tambah')}
            </Link>
            <TombolAksi action={buatSesiAudit} argumen={repo.id} label={t('prompt.audit')} />
            <Link href={`/repo/${repo.id}/ubah`} className={tombolSekunder}>
              {t('umum.ubah')}
            </Link>
            <TombolAksi action={hapusRepo} argumen={repo.id} label={t('umum.hapus')} bahaya konfirmasi={t('repo.konfirmasiHapus', { nama: repo.nama })} />
          </>
        }
      />
      <InfoRepo repo={repo} />
      {repo.modul.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('modul.kosong')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {repo.modul.map((m) => (
            <li key={m.id}>
              <Link href={`/modul/${m.id}`} className={`${kartu} block p-4 hover:border-accent ${m.is_stub ? 'border-dashed opacity-70' : ''}`}>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.nama}</p>
                  {m.ada_beta && <BadgeBeta />}
                  {m.is_stub ? <LabelStub /> : null}
                </div>
                {m.ringkasan && <p className="mt-1 text-sm text-muted">{m.ringkasan}</p>}
                <p className="mt-2 text-xs text-muted">{t('modul.jumlahMenu', { n: m.jumlah_menu })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
