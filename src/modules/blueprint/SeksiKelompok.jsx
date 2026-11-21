'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buatPromptBlueprint, simpanKelompokBlueprint, susunKelompokBlueprint } from './blueprint.actions';
import TombolAksi from '@/modules/shared/TombolAksi';
import { inputDasar, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Memotong teks poin untuk ditampilkan ringkas. */
const ringkas = (teks) => (teks.length > 130 ? `${teks.slice(0, 127)}...` : teks);

/** Pilihan memindahkan satu poin: ke kelompok lain, tanpa kelompok, atau kelompok baru untuk sebuah modul. */
function PindahPoin({ kelompok, modul, saatIni, onPindah }) {
  return (
    <select
      aria-label={t('blueprint.pindahKe')}
      value=""
      onChange={(e) => {
        if (e.target.value) onPindah(e.target.value);
      }}
      className={`${inputDasar} w-auto max-w-[11rem] text-xs`}
    >
      <option value="">{t('blueprint.pindahKe')}...</option>
      {saatIni !== 'tanpa' && <option value="tanpa">{t('blueprint.tanpaKelompok')}</option>}
      <optgroup label={t('blueprint.kelompokJudul')}>
        {kelompok.map((k, i) => (
          <option key={k.key} value={`k:${k.key}`} disabled={k.key === saatIni}>
            {i + 1}. {k.modul_nama}
          </option>
        ))}
      </optgroup>
      <optgroup label={t('blueprint.kelompokBaru')}>
        {modul.map((m) => (
          <option key={m.id} value={`m:${m.id}`}>
            {m.nama}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

/** Langkah 3 dan 4: susun kelompok & urutan (bisa diedit), lalu buat prompt per kelompok. */
export default function SeksiKelompok({ blueprintId, kelompok, tanpaKelompok, isiPoin, modul, ukuran }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');
  const awal = kelompok.map((k) => ({ key: `k${k.id}`, modul_id: k.modul_id, modul_nama: k.modul_nama, alasan: k.alasan, poin: k.poin, unique_id: k.unique_id }));
  const [daftar, setDaftar] = useState(awal);
  const [tanpa, setTanpa] = useState(tanpaKelompok);
  const tandaTangan = (d) => JSON.stringify(d.map((k) => [k.modul_id, k.alasan, k.poin]));
  const kotor = tandaTangan(daftar) !== tandaTangan(awal) || tanpa.length !== tanpaKelompok.length;
  const sudahPrompt = awal.length > 0 && awal.every((k) => k.unique_id);
  const bisaBuat = !kotor && awal.length > 0 && tanpaKelompok.length === 0;

  /** Menukar posisi kelompok (mengubah urutan eksekusi). */
  function geser(idx, arah) {
    setDaftar((s) => {
      const tujuan = idx + arah;
      // sudah di ujung: tidak ada yang digeser
      if (tujuan < 0 || tujuan >= s.length) return s;
      const salin = [...s];
      [salin[idx], salin[tujuan]] = [salin[tujuan], salin[idx]];
      return salin;
    });
  }

  /** Memindahkan poin dari asalnya (kelompok atau "tanpa") ke tujuan. */
  function pindah(nomor, dari, tujuan) {
    // 1) cabut dari asal
    let baru = daftar.map((k) => (k.key === dari ? { ...k, poin: k.poin.filter((n) => n !== nomor) } : k));
    let sisaTanpa = dari === 'tanpa' ? tanpa.filter((n) => n !== nomor) : tanpa;
    // 2) pasang ke tujuan
    if (tujuan === 'tanpa') sisaTanpa = [...sisaTanpa, nomor].sort((a, b) => a - b);
    else if (tujuan.startsWith('k:')) {
      baru = baru.map((k) => (k.key === tujuan.slice(2) ? { ...k, poin: [...k.poin, nomor].sort((a, b) => a - b) } : k));
    } else {
      const m = modul.find((x) => String(x.id) === tujuan.slice(2));
      baru = [...baru, { key: `b${Date.now()}${nomor}`, modul_id: m.id, modul_nama: m.nama, alasan: '', poin: [nomor], unique_id: null }];
    }
    setDaftar(baru.filter((k) => k.poin.length > 0)); // kelompok yang kosong dibuang
    setTanpa(sisaTanpa);
  }

  /** Menyimpan susunan kelompok. */
  function simpan() {
    setError('');
    mulai(async () => {
      const hasil = await simpanKelompokBlueprint({ id: blueprintId, kelompok: daftar.map((k) => ({ modul_id: k.modul_id, alasan: k.alasan, poin: k.poin })) });
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  /** Membuat prompt untuk semua kelompok lalu membuka halaman hasil. */
  function buatPrompt() {
    setError('');
    mulai(async () => {
      const hasil = await buatPromptBlueprint(blueprintId);
      // ada syarat yang belum terpenuhi (poin tanpa kelompok, dll): tampilkan pesannya
      if (!hasil.ok) return setError(hasil.error);
      router.push(hasil.data.href);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TombolAksi action={susunKelompokBlueprint} argumen={blueprintId} label={awal.length ? t('blueprint.susunUlang') : t('blueprint.susun')} />
        <span className="text-xs text-muted">{t('blueprint.ukuranInfo', { n: ukuran })}</span>
      </div>
      <p className="text-xs text-muted">{t('blueprint.kelompokHint')}</p>

      {daftar.length === 0 && tanpa.length === 0 && <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{t('blueprint.kelompokKosong')}</p>}

      <ol className="space-y-3">
        {daftar.map((k, idx) => (
          <li key={k.key} className="rounded-lg border border-line bg-panel p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">{t('blueprint.promptKe', { n: idx + 1, total: daftar.length })}</span>
              <span className="font-medium">{k.modul_nama}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={() => geser(idx, -1)} disabled={idx === 0} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-accent-soft disabled:opacity-40">
                  {t('blueprint.poinNaik')}
                </button>
                <button type="button" onClick={() => geser(idx, 1)} disabled={idx === daftar.length - 1} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-accent-soft disabled:opacity-40">
                  {t('blueprint.poinTurun')}
                </button>
              </span>
            </div>
            <label className="mt-2 flex flex-col gap-1 text-xs text-muted">
              {t('blueprint.alasan')}
              <textarea value={k.alasan} rows={2} onChange={(e) => setDaftar((s) => s.map((x) => (x.key === k.key ? { ...x, alasan: e.target.value } : x)))} className={`${inputDasar} resize-none`} />
            </label>
            <ul className="mt-2 space-y-1">
              {k.poin.map((n) => (
                <li key={n} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 w-6 shrink-0 text-right text-xs text-muted">{n}.</span>
                  <span className="min-w-0 flex-1">{ringkas(isiPoin[n] ?? '')}</span>
                  <PindahPoin kelompok={daftar} modul={modul} saatIni={k.key} onPindah={(tujuan) => pindah(n, k.key, tujuan)} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {tanpa.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">{t('blueprint.tanpaKelompokJudul')}</p>
          <p className="mb-2 text-xs text-amber-900 dark:text-amber-200">{t('blueprint.tanpaKelompokHint')}</p>
          <ul className="space-y-1">
            {tanpa.map((n) => (
              <li key={n} className="flex items-start gap-2 text-sm">
                <span className="mt-1 w-6 shrink-0 text-right text-xs">{n}.</span>
                <span className="min-w-0 flex-1">{ringkas(isiPoin[n] ?? '')}</span>
                <PindahPoin kelompok={daftar} modul={modul} saatIni="tanpa" onPindah={(tujuan) => pindah(n, 'tanpa', tujuan)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button type="button" onClick={simpan} disabled={pending || !kotor || daftar.length === 0} className={tombolSekunder}>
          {pending ? t('umum.memproses') : t('blueprint.kelompokSimpan')}
        </button>
        <button type="button" onClick={buatPrompt} disabled={pending || !bisaBuat} className={tombolUtama}>
          {pending ? t('umum.memproses') : sudahPrompt ? t('blueprint.buatPromptUlang') : t('blueprint.buatPrompt')}
        </button>
        {sudahPrompt && (
          <Link href={`/blueprint/${blueprintId}/prompt`} className={tombolSekunder}>
            {t('blueprint.lihatPrompt')}
          </Link>
        )}
        {!bisaBuat && <span className="text-xs text-muted">{t('blueprint.promptSyarat')}</span>}
      </div>
    </div>
  );
}
