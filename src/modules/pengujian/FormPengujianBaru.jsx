'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatPengujian, pecahBlueprintUji } from './pengujian.actions';
import { buatItem, poinLengkap } from './pengujian.poin';
import EditorPoinUji from './EditorPoinUji';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Kotak pesan error seragam. */
function PesanError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {error}
    </p>
  );
}

/**
 * Form Uji CR baru. Langkah 1: CR ID dan blueprint ditempel, lalu dipecah menjadi poin.
 * Langkah 2: poin diedit dan diberi target modul/menu, lalu disimpan (membuat putaran 1 dan prompt per repo).
 */
export default function FormPengujianBaru({ opsi }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const [crId, setCrId] = useState('');
  const [teks, setTeks] = useState('');
  const [poin, setPoin] = useState(null);

  /** Memecah blueprint menjadi poin; gagal -> pesan, teks dipertahankan. */
  function pecah() {
    setError('');
    mulai(async () => {
      const hasil = await pecahBlueprintUji({ teks });
      // tidak ada poin atau teks tidak valid: tampilkan alasannya
      if (!hasil.ok) return setError(hasil.error);
      setPoin(hasil.data.poin.map((isi) => buatItem(isi)));
    });
  }

  /** Menyimpan Uji CR; sukses -> halaman detail dengan prompt per repo. */
  function simpan() {
    setError('');
    mulai(async () => {
      const kirim = poin.map((p) => ({ isi: p.isi, target: p.target }));
      const hasil = await buatPengujian({ cr_id: crId, blueprint_mentah: teks, poin: kirim });
      // CR ID kembar, target tidak valid, dll: poin yang sudah diedit tetap dipertahankan
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  // belum ada modul terdaftar: poin tidak punya target yang bisa dipilih
  if (opsi.length === 0) return <p className="text-sm text-muted">{t('pengujian.belumAdaModul')}</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('pengujian.crId')}
          <input value={crId} onChange={(e) => setCrId(e.target.value)} disabled={poin !== null} placeholder="202502030002" className={`${inputDasar} font-mono`} />
          <span>{t('pengujian.crIdHint')}</span>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t('pengujian.blueprint')}
        <textarea value={teks} onChange={(e) => setTeks(e.target.value)} disabled={poin !== null} rows={10} placeholder={t('pengujian.blueprintPlaceholder')} className={`${inputDasar} font-mono text-xs`} />
      </label>
      {poin === null ? (
        <button type="button" onClick={pecah} disabled={pending || !crId.trim() || !teks.trim()} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('pengujian.pecah')}
        </button>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t('pengujian.poinJudul', { n: poin.length })}</h2>
          <p className="text-xs text-muted">{t('pengujian.poinHint')}</p>
          <EditorPoinUji poin={poin} opsi={opsi} onUbah={setPoin} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={simpan} disabled={pending || (poin.length === 0 || !poinLengkap(poin))} className={tombolUtama}>
              {pending ? t('umum.memproses') : t('pengujian.buat')}
            </button>
            <button type="button" onClick={() => setPoin(null)} disabled={pending} className={tombolSekunder}>
              {t('pengujian.ubahBlueprint')}
            </button>
          </div>
        </div>
      )}
      <PesanError error={error} />
    </div>
  );
}
