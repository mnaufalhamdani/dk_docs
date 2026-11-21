'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inputDasar, tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

const ENDPOINT = '/api/v1/dokumentasi/gambar';

/** Gambar pendukung sebuah halaman: tampil, unggah (opsional), dan hapus. */
export default function GaleriGambar({ halamanId, gambar, bolehEdit }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [keterangan, setKeterangan] = useState('');

  /** Mengirim berkas terpilih ke endpoint unggah. */
  function unggah(e) {
    const file = e.target.files?.[0];
    // tidak ada berkas dipilih (dialog dibatalkan): abaikan
    if (!file) return;
    setError('');
    const form = new FormData();
    form.set('halaman_id', String(halamanId));
    form.set('keterangan', keterangan);
    form.set('file', file);
    mulai(async () => {
      const res = await fetch(ENDPOINT, { method: 'POST', body: form });
      const json = await res.json();
      // server menolak (format/ukuran): tampilkan pesannya
      if (!json.success) return setError(json.message);
      setKeterangan('');
      router.refresh();
    });
    e.target.value = ''; // izinkan memilih berkas yang sama lagi
  }

  /** Menghapus satu gambar setelah konfirmasi. */
  function hapus(id) {
    // user membatalkan: tidak ada yang dihapus
    if (!window.confirm(t('gambar.konfirmasiHapus'))) return;
    setError('');
    mulai(async () => {
      const res = await fetch(`${ENDPOINT}?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) return setError(json.message);
      router.refresh();
    });
  }

  // tidak ada gambar dan tidak sedang mengedit: bagian ini disembunyikan
  if (gambar.length === 0 && !bolehEdit) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('gambar.judul')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gambar.map((g) => (
          <figure key={g.id} className="rounded-md border border-line bg-panel p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ENDPOINT}?id=${g.id}`} alt={g.keterangan || g.nama_file} className="max-h-64 w-full object-contain" />
            <figcaption className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
              <span>{g.keterangan || g.nama_file}</span>
              {bolehEdit && (
                <button type="button" onClick={() => hapus(g.id)} disabled={pending} className="text-red-700 hover:underline dark:text-red-300">
                  {t('umum.hapus')}
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {bolehEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder={t('gambar.keterangan')} className={`${inputDasar} max-w-xs`} />
          <label className={`${tombolSekunder} cursor-pointer`}>
            {pending ? t('umum.memproses') : t('gambar.unggah')}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={unggah} className="sr-only" />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
