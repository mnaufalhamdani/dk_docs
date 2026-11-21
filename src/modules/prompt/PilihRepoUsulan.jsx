'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatSesiUsulan } from './prompt.actions';
import { tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Memilih repo-repo yang akan dibuatkan prompt usulan perubahan (repo terdeteksi dicentang bawaan). */
export default function PilihRepoUsulan({ perubahanId, repos }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [dipilih, setDipilih] = useState(() => repos.filter((r) => r.terdeteksi).map((r) => r.id));

  /** Membalik centang sebuah repo. */
  function toggle(id) {
    setDipilih((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  /** Membuat sesi lalu membuka halaman prompt. */
  function buat() {
    setError('');
    mulai(async () => {
      const hasil = await buatSesiUsulan({ perubahan_id: perubahanId, repo_ids: dipilih });
      // gagal (belum memilih repo, dll): tampilkan pesan
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <ul className="space-y-2">
        {repos.map((r) => (
          <li key={r.id}>
            <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm">
              <input type="checkbox" checked={dipilih.includes(r.id)} onChange={() => toggle(r.id)} />
              <span className="font-medium">{r.nama}</span>
              <span className="font-mono text-xs text-muted">{r.kode}</span>
              {r.terdeteksi && <span className="ml-auto text-xs text-accent">{t('prompt.terdeteksi')}</span>}
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="button" onClick={buat} disabled={pending || dipilih.length === 0} className={tombolUtama}>
        {pending ? t('umum.memproses') : t('prompt.buat')}
      </button>
    </div>
  );
}
