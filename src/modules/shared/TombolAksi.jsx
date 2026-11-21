'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { tombolBahaya, tombolSekunder } from './ui';
import { t } from '@/utils/i18n';

/**
 * Tombol yang menjalankan Server Action dengan satu argumen (id / objek).
 * `konfirmasi` (opsional) menampilkan dialog konfirmasi dulu; `bahaya` memberi gaya merah.
 * Setelah sukses: pindah ke `href` bila action mengembalikannya, jika tidak muat ulang halaman.
 */
export default function TombolAksi({ action, argumen, label, konfirmasi = null, bahaya = false }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');

  /** Menjalankan action dan menangani hasilnya. */
  function jalankan() {
    // user membatalkan konfirmasi: tidak melakukan apa-apa
    if (konfirmasi && !window.confirm(konfirmasi)) return;
    setError('');
    mulai(async () => {
      const hasil = await action(argumen);
      // gagal: tampilkan pesan dari server
      if (!hasil.ok) return setError(hasil.error);
      if (hasil.data?.href) router.push(hasil.data.href);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={jalankan} disabled={pending} className={bahaya ? tombolBahaya : tombolSekunder}>
        {pending ? t('umum.memproses') : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-300">
          {error}
        </span>
      )}
    </span>
  );
}
