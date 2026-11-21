'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { petakanManual, tambahModulDanPetakan } from '@/modules/sync/sync.actions';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/**
 * Form memetakan satu nama mentah (modul/menu dari sumber) yang belum dikenal:
 * pilih modul (dan menu bila perlu) yang benar, atau tambah modul baru.
 */
export default function PetakanForm({ kelompok, pohon }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [mode, setMode] = useState('pilih');
  const [error, setError] = useState('');
  const [modulId, setModulId] = useState('');
  const [menuId, setMenuId] = useState('');
  const [repoId, setRepoId] = useState(pohon[0]?.id ?? '');
  const [nama, setNama] = useState(kelompok.modul_sumber ?? '');
  const [pathKode, setPathKode] = useState('');

  const semuaModul = pohon.flatMap((r) => r.modul.map((m) => ({ ...m, repo: r.nama })));
  const menuOpsi = semuaModul.find((m) => String(m.id) === String(modulId))?.menu ?? [];
  const dasar = { modul_sumber: kelompok.modul_sumber, menu_sumber: kelompok.menu_sumber };

  /** Menjalankan action pemetaan lalu memuat ulang detail perubahan. */
  function jalankan(action, input) {
    setError('');
    mulai(async () => {
      const hasil = await action(input);
      // gagal (validasi / data tidak ada): tampilkan pesan
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-line bg-bg p-3">
      <p className="text-sm">
        <span className="font-mono">{kelompok.modul_sumber ?? t('perubahan.tanpaNama')}</span>
        {kelompok.menu_sumber && <span className="font-mono text-muted"> / {kelompok.menu_sumber}</span>}
        <span className="ml-2 text-xs text-muted">{t('perubahan.jumlahPesan', { n: kelompok.jumlah })}</span>
      </p>

      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => setMode('pilih')} aria-pressed={mode === 'pilih'} className={mode === 'pilih' ? 'font-semibold text-accent' : 'text-muted'}>
          {t('perubahan.pilihModul')}
        </button>
        <span className="text-muted">|</span>
        <button type="button" onClick={() => setMode('tambah')} aria-pressed={mode === 'tambah'} className={mode === 'tambah' ? 'font-semibold text-accent' : 'text-muted'}>
          {t('modul.tambah')}
        </button>
      </div>

      {mode === 'pilih' ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <select aria-label={t('perubahan.modul')} value={modulId} onChange={(e) => { setModulId(e.target.value); setMenuId(''); }} className={inputDasar}>
            <option value="">{t('perubahan.pilihModulPlaceholder')}</option>
            {pohon.map((r) => (
              <optgroup key={r.id} label={r.nama}>
                {r.modul.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select aria-label={t('menu.judul')} value={menuId} onChange={(e) => setMenuId(e.target.value)} disabled={!modulId} className={inputDasar}>
            <option value="">{t('perubahan.tanpaMenu')}</option>
            {menuOpsi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
          <button type="button" disabled={pending || !modulId} onClick={() => jalankan(petakanManual, { ...dasar, modul_id: modulId, menu_id: menuId })} className={tombolUtama}>
            {pending ? t('umum.memproses') : t('perubahan.petakan')}
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-4">
          <select aria-label={t('perubahan.repo')} value={repoId} onChange={(e) => setRepoId(e.target.value)} className={inputDasar}>
            {pohon.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </select>
          <input aria-label={t('form.nama')} value={nama} onChange={(e) => setNama(e.target.value)} placeholder={t('form.nama')} className={inputDasar} />
          <input aria-label={t('form.pathKode')} value={pathKode} onChange={(e) => setPathKode(e.target.value)} placeholder={t('form.pathKode')} className={`${inputDasar} font-mono`} />
          <button type="button" disabled={pending || !repoId || !nama.trim()} onClick={() => jalankan(tambahModulDanPetakan, { ...dasar, repo_id: repoId, nama, path_kode: pathKode })} className={tombolSekunder}>
            {pending ? t('umum.memproses') : t('perubahan.tambahDanPetakan')}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
