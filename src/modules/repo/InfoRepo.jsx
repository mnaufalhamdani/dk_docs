import { StatusBadge } from '@/modules/shared/Badge';
import { kartu, tombolSekunder } from '@/modules/shared/ui';
import EditorTeknologi from './EditorTeknologi';
import { t } from '@/utils/i18n';

/** Atribut tautan luar: tab baru tanpa membocorkan opener/referrer. */
const TAUTAN_LUAR = { target: '_blank', rel: 'noopener noreferrer' };

/** Tanggal (YYYY-MM-DD) paling baru dari updated_at seluruh teknologi, atau null bila kosong. */
function tanggalDiperbarui(teknologi) {
  const daftar = teknologi.map((x) => x.updated_at).filter(Boolean).sort();
  // belum ada teknologi: tidak ada tanggal untuk ditampilkan
  if (daftar.length === 0) return null;
  return String(daftar[daftar.length - 1]).slice(0, 10);
}

/** Satu baris tautan beta/live: badge status lalu URL. */
function TautanLingkungan({ status, url }) {
  return (
    <a href={url} {...TAUTAN_LUAR} className="inline-flex max-w-full items-center gap-1.5 text-sm text-accent hover:underline">
      <StatusBadge status={status} />
      <span className="truncate font-mono text-xs">{url}</span>
    </a>
  );
}

/**
 * Grup "Info repo": tautan git, beta, live (hanya yang terisi) dan chip teknologi.
 * Bukan poin dokumentasi, jadi tidak ikut daftar poin, pencarian, maupun tautan CR/B.
 */
export default function InfoRepo({ repo }) {
  const adaTautan = repo.url_git || repo.url_beta || repo.url_live;
  const diperbarui = tanggalDiperbarui(repo.teknologi);
  return (
    <section aria-label={t('infoRepo.judul')} className={`${kartu} mb-5 space-y-3 p-4`}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('infoRepo.judul')}</h2>
      {adaTautan ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {repo.url_git && (
            <a href={repo.url_git} {...TAUTAN_LUAR} className={tombolSekunder}>
              {t('infoRepo.git')}
            </a>
          )}
          {repo.url_beta && <TautanLingkungan status="beta" url={repo.url_beta} />}
          {repo.url_live && <TautanLingkungan status="live" url={repo.url_live} />}
        </div>
      ) : (
        <p className="text-xs text-muted">{t('infoRepo.belumDiisi')}</p>
      )}
      <div className="space-y-1">
        <EditorTeknologi repoId={repo.id} teknologi={repo.teknologi} />
        {diperbarui && <p className="text-xs text-muted">{t('infoRepo.diperbarui', { tanggal: diperbarui })}</p>}
      </div>
    </section>
  );
}
