'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatSesiDokumentasiBaru } from './prompt.actions';
import { inputDasar, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Batas jumlah modul dalam satu prompt dokumentasi baru. */
const MAKS_MODUL = 5;

/** Memilih repo lalu 1-5 modul untuk dibuatkan prompt dokumentasi baru. */
export default function PilihModulBaru({ pohon, awalModulId }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const repoAwal = pohon.find((r) => r.modul.some((m) => m.id === awalModulId)) ?? pohon[0];
  const [repoId, setRepoId] = useState(repoAwal?.id ?? '');
  const [dipilih, setDipilih] = useState(awalModulId && repoAwal ? [awalModulId] : []);
  const modul = pohon.find((r) => String(r.id) === String(repoId))?.modul ?? [];

  /** Mengganti repo: pilihan modul sebelumnya tidak berlaku lagi. */
  function gantiRepo(id) {
    // id tetap teks (BIGINT tidak aman dikonversi ke number)
    setRepoId(String(id));
    setDipilih([]);
  }

  /** Membalik centang modul, dibatasi maksimal 5. */
  function toggle(id) {
    setDipilih((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      // sudah mencapai batas: abaikan tambahan
      return s.length >= MAKS_MODUL ? s : [...s, id];
    });
  }

  /** Membuat sesi lalu membuka halaman prompt. */
  function buat() {
    setError('');
    mulai(async () => {
      const hasil = await buatSesiDokumentasiBaru({ repo_id: repoId, modul_ids: dipilih });
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  // belum ada repo: arahkan user membuat repo/modul dulu
  if (pohon.length === 0) return <p className="text-sm text-muted">{t('prompt.belumAdaRepo')}</p>;

  return (
    <div className="max-w-xl space-y-4">
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t('perubahan.repo')}
        <select value={repoId} onChange={(e) => gantiRepo(e.target.value)} className={inputDasar}>
          {pohon.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
      </label>
      {modul.length === 0 ? (
        <p className="text-sm text-muted">{t('modul.kosong')}</p>
      ) : (
        <ul className="space-y-2">
          {modul.map((m) => (
            <li key={m.id}>
              <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm">
                <input type="checkbox" checked={dipilih.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="font-medium">{m.nama}</span>
                {m.stub && <span className="ml-auto text-xs text-muted">{t('badge.belumDidokumentasikan')}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">{t('prompt.batasModul', { n: dipilih.length, maks: MAKS_MODUL })}</p>
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
