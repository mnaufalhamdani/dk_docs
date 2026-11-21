'use client';

import { kartu } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Teks versi untuk satu teknologi (versi kosong ditampilkan sebagai "tanpa versi"). */
const teksVersi = (versi) => versi ?? t('infoRepo.tanpaVersi');

/**
 * Blok "Info repo" di halaman review: teknologi baru atau berubah dari hasil agent,
 * masing-masing dengan kotak centang. Yang dicentang diterapkan saat Simpan.
 */
export default function BlokInfoRepo({ daftar, dipilih, onToggle }) {
  // agent tidak mengisi teknologi, atau semuanya sama dengan catatan: blok tidak ditampilkan
  if (daftar.length === 0) return null;
  return (
    <section className={`${kartu} space-y-2 p-4`}>
      <h2 className="text-sm font-semibold">{t('infoRepo.blokReviewJudul')}</h2>
      <p className="text-xs text-muted">{t('infoRepo.blokReviewHint')}</p>
      <ul className="space-y-1.5">
        {daftar.map((x) => (
          <li key={x.kunci}>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <input type="checkbox" checked={dipilih.has(x.kunci)} onChange={() => onToggle(x.kunci)} className="h-4 w-4" />
              <span className="font-medium">{x.nama}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${x.status === 'baru' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'}`}>
                {t(x.status === 'baru' ? 'infoRepo.statusBaru' : 'infoRepo.statusBerubah')}
              </span>
              <span className="font-mono text-xs text-muted">{x.status === 'berubah' ? t('infoRepo.versiLamaBaru', { lama: teksVersi(x.versi_lama), baru: teksVersi(x.versi) }) : teksVersi(x.versi)}</span>
              {x.sumber_file && <span className="font-mono text-[11px] text-muted">({x.sumber_file})</span>}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
