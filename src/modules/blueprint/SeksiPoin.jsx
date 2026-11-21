'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanPoinBlueprint } from './blueprint.actions';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Tombol ikon teks kecil untuk aksi per poin. */
function Mini({ onClick, disabled, children, bahaya = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded px-1.5 py-0.5 text-xs disabled:opacity-40 ${bahaya ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950' : 'text-muted hover:bg-accent-soft hover:text-fg'}`}>
      {children}
    </button>
  );
}

/** Langkah 1: poin hasil deteksi yang bisa digabung, dipecah, diedit, dan diurutkan. */
export default function SeksiPoin({ blueprintId, poin }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const counter = useRef(0);
  const kursor = useRef({});
  const [items, setItems] = useState(() => poin.map((p) => ({ key: `p${p.id}`, isi: p.isi })));
  const kotor = JSON.stringify(items.map((i) => i.isi)) !== JSON.stringify(poin.map((p) => p.isi));

  /** Membuat key unik untuk poin baru hasil tambah/pecah. */
  const kunciBaru = () => `n${(counter.current += 1)}`;

  /** Mengubah teks satu poin. */
  const ubah = (key, isi) => setItems((s) => s.map((i) => (i.key === key ? { ...i, isi } : i)));

  /** Menukar posisi poin ke atas/bawah. */
  function geser(idx, arah) {
    setItems((s) => {
      const tujuan = idx + arah;
      // sudah di ujung daftar: tidak ada yang digeser
      if (tujuan < 0 || tujuan >= s.length) return s;
      const salin = [...s];
      [salin[idx], salin[tujuan]] = [salin[tujuan], salin[idx]];
      return salin;
    });
  }

  /** Menggabungkan poin dengan poin sesudahnya. */
  function gabung(idx) {
    setItems((s) => {
      // poin terakhir tidak punya pasangan untuk digabung
      if (idx >= s.length - 1) return s;
      const baru = { key: kunciBaru(), isi: `${s[idx].isi.trim()} ${s[idx + 1].isi.trim()}` };
      return [...s.slice(0, idx), baru, ...s.slice(idx + 2)];
    });
  }

  /** Memecah poin di posisi kursor terakhir pada kolom teksnya. */
  function pecah(idx) {
    const item = items[idx];
    const pos = kursor.current[item.key] ?? 0;
    const kiri = item.isi.slice(0, pos).trim();
    const kanan = item.isi.slice(pos).trim();
    // kursor di ujung teks: tidak ada yang bisa dipecah
    if (!kiri || !kanan) return setError(t('blueprint.poinPecahKursor'));
    setError('');
    setItems((s) => [...s.slice(0, idx), { key: kunciBaru(), isi: kiri }, { key: kunciBaru(), isi: kanan }, ...s.slice(idx + 1)]);
  }

  /** Mengirim poin ke server; sukses -> muat ulang data (pencocokan disarankan ulang). */
  function simpan() {
    setError('');
    const bersih = items.map((i) => i.isi.trim()).filter(Boolean);
    mulai(async () => {
      const hasil = await simpanPoinBlueprint({ id: blueprintId, poin: bersih });
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t('blueprint.poinHint')}</p>
      <ol className="space-y-2">
        {items.map((it, idx) => (
          <li key={it.key} className="rounded-md border border-line bg-panel p-2">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-6 shrink-0 text-right text-xs text-muted">{idx + 1}.</span>
              <textarea
                aria-label={`${t('editor.isiPoin')} ${idx + 1}`}
                value={it.isi}
                rows={Math.max(2, Math.ceil(it.isi.length / 90))}
                onChange={(e) => ubah(it.key, e.target.value)}
                onSelect={(e) => {
                  kursor.current[it.key] = e.target.selectionStart;
                }}
                className={`${inputDasar} resize-none`}
              />
              <div className="flex shrink-0 flex-col items-end">
                <div className="flex">
                  <Mini onClick={() => geser(idx, -1)} disabled={idx === 0}>
                    {t('blueprint.poinNaik')}
                  </Mini>
                  <Mini onClick={() => geser(idx, 1)} disabled={idx === items.length - 1}>
                    {t('blueprint.poinTurun')}
                  </Mini>
                </div>
                <div className="flex">
                  <Mini onClick={() => gabung(idx)} disabled={idx === items.length - 1}>
                    {t('blueprint.poinGabung')}
                  </Mini>
                  <Mini onClick={() => pecah(idx)}>{t('blueprint.poinPecah')}</Mini>
                  <Mini bahaya onClick={() => setItems((s) => s.filter((x) => x.key !== it.key))}>
                    {t('umum.hapus')}
                  </Mini>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setItems((s) => [...s, { key: kunciBaru(), isi: '' }])} className={tombolSekunder}>
          + {t('blueprint.poinTambah')}
        </button>
        <button type="button" onClick={simpan} disabled={pending || !kotor} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('blueprint.poinSimpan')}
        </button>
        {kotor && <span className="text-xs text-muted">{t('editor.belumDisimpan')}</span>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
