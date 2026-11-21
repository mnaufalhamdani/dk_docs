import Link from 'next/link';
import { ambilDep } from '@/di/container';
import HeaderHalaman from '@/modules/shared/HeaderHalaman';
import { kartu, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Beranda: daftar semua repo. */
export default async function DaftarRepo() {
  const daftar = await ambilDep().repoController.daftar();
  return (
    <div>
      <HeaderHalaman
        judul={t('app.nama')}
        sub={<p className="text-sm text-muted">{t('beranda.deskripsi')}</p>}
        aksi={
          <Link href="/repo/baru" className={tombolUtama}>
            {t('repo.tambah')}
          </Link>
        }
      />
      {daftar.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">{t('repo.kosong')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {daftar.map((r) => (
            <li key={r.id}>
              <Link href={`/repo/${r.id}`} className={`${kartu} block p-4 hover:border-accent`}>
                <p className="font-medium">{r.nama}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {r.kode} · {r.platform} · {r.branch_utama}
                </p>
                <p className="mt-2 text-xs text-muted">{t('repo.jumlahModul', { n: r.jumlah_modul })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
