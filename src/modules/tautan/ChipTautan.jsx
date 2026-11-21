'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ubahStatusTautan } from './tautan.actions';
import { t } from '@/utils/i18n';

/** Warna chip menurut tipe: CR biru, B merah muda. */
const WARNA_TIPE = {
  CR: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  B: 'border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
};

/**
 * Chip kecil berisi nomor CR/B di samping poin (hanya nomor, tanpa nama developer).
 * Klik nomor membuka detail CR/B; tombol kecil membuka menu Pending / Aktifkan kembali.
 * `onStatus(id, status)` dipanggil setelah status berhasil diubah agar induk bisa memperbarui tampilan.
 */
export default function ChipTautan({ tautan, onStatus }) {
  const [menuBuka, setMenuBuka] = useState(false);
  const [sibuk, mulai] = useTransition();
  const [error, setError] = useState('');
  const pending = tautan.status === 'pending';

  /** Mengubah status tautan ke kebalikan dari status sekarang lewat Server Action. */
  function balik() {
    setError('');
    const tujuan = pending ? 'aktif' : 'pending';
    mulai(async () => {
      const hasil = await ubahStatusTautan({ id: tautan.id, status: tujuan });
      // gagal (mis. poin sudah berubah): tampilkan pesan, status tetap
      if (!hasil.ok) return setError(hasil.error);
      setMenuBuka(false);
      onStatus?.(tautan.id, tujuan);
    });
  }

  return (
    <span className="relative inline-flex items-center">
      <Link
        href={`/perubahan/${tautan.perubahan_id}`}
        title={`${tautan.tipe} ${tautan.nomor}`}
        className={`rounded-l border px-1.5 py-0.5 font-mono text-[11px] leading-none hover:underline ${WARNA_TIPE[tautan.tipe] ?? WARNA_TIPE.CR} ${pending ? 'opacity-60' : ''}`}
      >
        {tautan.nomor}
      </Link>
      <button
        type="button"
        aria-label={t('tautan.menu')}
        aria-expanded={menuBuka}
        onClick={() => setMenuBuka((s) => !s)}
        className={`rounded-r border border-l-0 px-1 py-0.5 text-[11px] leading-none hover:opacity-80 ${WARNA_TIPE[tautan.tipe] ?? WARNA_TIPE.CR}`}
      >
        ▾
      </button>
      {menuBuka && (
        <span className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-line bg-panel p-1 text-xs shadow-md">
          <button type="button" onClick={balik} disabled={sibuk} className="block w-full rounded px-2 py-1 text-left hover:bg-accent-soft disabled:opacity-50">
            {sibuk ? t('umum.memproses') : pending ? t('tautan.aktifkanKembali') : t('tautan.pending')}
          </button>
          {error && <span role="alert" className="block px-2 py-1 text-red-700 dark:text-red-300">{error}</span>}
        </span>
      )}
    </span>
  );
}
