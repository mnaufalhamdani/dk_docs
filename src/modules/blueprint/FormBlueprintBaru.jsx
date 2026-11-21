'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatBlueprint } from './blueprint.actions';
import { inputDasar, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Form blueprint baru: pilih repo, beri judul, tempel teks; poin langsung dipecah dan dicocokkan. */
export default function FormBlueprintBaru({ repos }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [repoId, setRepoId] = useState(repos[0]?.id ?? '');
  const [judul, setJudul] = useState('');
  const [teks, setTeks] = useState('');

  /** Mengirim blueprint; sukses -> editor, gagal -> pesan (teks dipertahankan). */
  function kirim(e) {
    e.preventDefault();
    setError('');
    mulai(async () => {
      const hasil = await buatBlueprint({ repo_id: repoId, judul, teks });
      // gagal (tidak ada poin, repo hilang, dll): tampilkan alasannya
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  // belum ada repo: blueprint tidak bisa dibuat
  if (repos.length === 0) return <p className="text-sm text-muted">{t('prompt.belumAdaRepo')}</p>;

  return (
    <form onSubmit={kirim} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('blueprint.repo')}
          <select value={repoId} onChange={(e) => setRepoId(e.target.value)} className={inputDasar}>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          {t('blueprint.judulField')}
          <input value={judul} onChange={(e) => setJudul(e.target.value)} className={inputDasar} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t('blueprint.teksField')}
        <textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={12} placeholder={t('blueprint.teksPlaceholder')} className={`${inputDasar} font-mono text-xs`} />
      </label>
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || !judul.trim() || !teks.trim()} className={tombolUtama}>
        {pending ? t('umum.memproses') : t('blueprint.buat')}
      </button>
    </form>
  );
}
