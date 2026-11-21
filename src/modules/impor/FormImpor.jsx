'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatImpor } from './impor.actions';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Form impor: unggah berkas JSON atau tempel isinya. Teks tetap bisa dirapikan manual bila JSON rusak. */
export default function FormImpor() {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [json, setJson] = useState('');
  const [error, setError] = useState('');

  /** Membaca berkas JSON yang dipilih ke dalam kolom teks. */
  async function bacaBerkas(e) {
    const file = e.target.files?.[0];
    // dialog dibatalkan: tidak ada berkas
    if (!file) return;
    setJson(await file.text());
    setError('');
    e.target.value = ''; // izinkan memilih berkas yang sama lagi
  }

  /** Mengirim JSON untuk divalidasi; sukses -> halaman review, gagal -> pesan dan teks dipertahankan. */
  function kirim(e) {
    e.preventDefault();
    setError('');
    mulai(async () => {
      const hasil = await buatImpor({ json });
      // JSON rusak / tidak cocok dengan sesi: tampilkan alasannya
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${tombolSekunder} cursor-pointer`}>
          {t('impor.pilihBerkas')}
          <input type="file" accept="application/json,.json" onChange={bacaBerkas} className="sr-only" />
        </label>
        <span className="text-xs text-muted">{t('impor.atauTempel')}</span>
      </div>
      <textarea
        aria-label={t('impor.json')}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={16}
        spellCheck={false}
        placeholder={'{\n  "unique_id": "a1b2c3d4",\n  "repo": "dk-apps",\n  ...\n}'}
        className={`${inputDasar} font-mono text-xs`}
      />
      {error && (
        <p role="alert" className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || !json.trim()} className={tombolUtama}>
        {pending ? t('umum.memproses') : t('impor.validasi')}
      </button>
    </form>
  );
}
