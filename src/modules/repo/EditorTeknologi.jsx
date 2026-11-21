'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanTeknologiRepo, ubahTeknologiRepo, hapusTeknologiRepo } from './repo.actions';
import { inputDasar, tombolBahaya, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Teks chip teknologi: nama lalu versi bila ada. */
function teksChip(x) {
  return x.versi ? `${x.nama} ${x.versi}` : x.nama;
}

/** Baris isian nama, versi, dan file sumber (dipakai untuk tambah maupun ubah). */
function BarisIsian({ nilai, onUbah, kunci }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <input aria-label={t('infoRepo.nama')} placeholder={t('infoRepo.namaPlaceholder')} value={nilai.nama} onChange={(e) => onUbah(kunci, 'nama', e.target.value)} className={inputDasar} maxLength={100} />
      <input aria-label={t('infoRepo.versi')} placeholder={t('infoRepo.versiPlaceholder')} value={nilai.versi} onChange={(e) => onUbah(kunci, 'versi', e.target.value)} className={`${inputDasar} font-mono`} maxLength={50} />
      <input aria-label={t('infoRepo.sumberFile')} placeholder={t('infoRepo.sumberPlaceholder')} value={nilai.sumber_file} onChange={(e) => onUbah(kunci, 'sumber_file', e.target.value)} className={`${inputDasar} font-mono`} maxLength={255} />
    </div>
  );
}

/** Mengubah entri server (nilai null) menjadi isian form bertipe string. */
function keIsian(x) {
  return { nama: x.nama ?? '', versi: x.versi ?? '', sumber_file: x.sumber_file ?? '' };
}

/** Chip teknologi beserta pengelola manual (tambah, ubah, hapus) yang dibuka lewat tombol. */
export default function EditorTeknologi({ repoId, teknologi }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [terbuka, setTerbuka] = useState(false);
  const [error, setError] = useState('');
  const [baru, setBaru] = useState({ nama: '', versi: '', sumber_file: '' });
  const [suntingan, setSuntingan] = useState({});

  /** Menjalankan action; sukses -> muat ulang data halaman, gagal -> tampilkan pesan. */
  function jalankan(panggil, sesudah) {
    setError('');
    mulai(async () => {
      const hasil = await panggil();
      // server menolak (validasi, bentrok nama): tampilkan pesan dan pertahankan isian
      if (!hasil.ok) return setError(hasil.error);
      sesudah?.();
      router.refresh();
    });
  }

  /** Mengubah satu field pada isian entri baru ('baru') atau entri yang sedang disunting. */
  function ubahIsian(kunci, field, nilai) {
    if (kunci === 'baru') return setBaru((s) => ({ ...s, [field]: nilai }));
    // suntingan pertama pada entri: mulai dari nilai tersimpan agar field lain tidak hilang (undefined)
    setSuntingan((s) => {
      const asal = s[kunci] ?? keIsian(teknologi.find((x) => x.id === kunci) ?? {});
      return { ...s, [kunci]: { ...asal, [field]: nilai } };
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{t('infoRepo.teknologi')}:</span>
        {teknologi.length === 0 && <span className="text-xs text-muted">{t('infoRepo.teknologiKosong')}</span>}
        {teknologi.map((x) => (
          <span key={x.id} title={x.sumber_file ?? undefined} className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">
            {teksChip(x)}
          </span>
        ))}
        <button type="button" onClick={() => setTerbuka((v) => !v)} aria-expanded={terbuka} className={`${tombolSekunder} px-2! py-0.5! text-xs!`}>
          {terbuka ? t('infoRepo.tutup') : t('infoRepo.kelola')}
        </button>
      </div>

      {terbuka && (
        <div className="space-y-3 rounded-md border border-line bg-bg p-3">
          {teknologi.map((x) => {
            const isian = suntingan[x.id] ?? keIsian(x);
            return (
              <div key={x.id} className="space-y-2">
                <BarisIsian nilai={isian} onUbah={ubahIsian} kunci={x.id} />
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => jalankan(() => ubahTeknologiRepo({ id: x.id, ...isian }), () => setSuntingan((s) => ({ ...s, [x.id]: undefined })))} className={`${tombolSekunder} px-2! py-0.5! text-xs!`}>
                    {t('umum.simpan')}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      // konfirmasi dulu karena penghapusan tidak bisa dibatalkan
                      if (window.confirm(t('infoRepo.konfirmasiHapus', { nama: x.nama }))) jalankan(() => hapusTeknologiRepo(x.id));
                    }}
                    className={`${tombolBahaya} px-2! py-0.5! text-xs!`}
                  >
                    {t('umum.hapus')}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="space-y-2 border-t border-line pt-3">
            <BarisIsian nilai={baru} onUbah={ubahIsian} kunci="baru" />
            <button type="button" disabled={pending || !baru.nama.trim()} onClick={() => jalankan(() => simpanTeknologiRepo({ repo_id: repoId, ...baru }), () => setBaru({ nama: '', versi: '', sumber_file: '' }))} className={tombolUtama}>
              {pending ? t('umum.memproses') : t('infoRepo.tambah')}
            </button>
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
