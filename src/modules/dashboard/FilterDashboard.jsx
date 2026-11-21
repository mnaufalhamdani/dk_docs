'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputDasar, kartu, tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { DAFTAR_PRESET, PRESET_BAWAAN, kenaliPreset, rentangPreset, urlDashboard } from './dashboard.filter';
import { t } from '@/utils/i18n';

/** Chip filter aktif; bila `hapusHref` ada, tampil tombol × untuk melepas filter itu. */
function Chip({ children, hapusHref = null, namaHapus = '' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-accent-soft px-2 py-0.5 text-xs text-accent">
      {children}
      {hapusHref && (
        <Link href={hapusHref} aria-label={t('dashboard.filter.hapus', { nama: namaHapus })} className="font-bold leading-none hover:opacity-70">
          ×
        </Link>
      )}
    </span>
  );
}

/** Tombol preset rentang tanggal sebagai tautan (URL dapat dibagikan, tombol kembali berfungsi). */
function Preset({ kunci, aktif, filter, hariIni }) {
  const r = rentangPreset(kunci, hariIni);
  return (
    <Link
      href={urlDashboard({ ...filter, ...r, lihat: '' }, hariIni)}
      aria-current={aktif ? 'true' : undefined}
      className={`rounded-md border px-2.5 py-1 text-xs ${aktif ? 'border-accent bg-accent-soft font-medium text-accent' : 'border-line bg-panel hover:bg-accent-soft'}`}
    >
      {t(`dashboard.filter.preset.${kunci}`)}
    </Link>
  );
}

/** Pilihan repo (banyak) di dalam <details>; kosong berarti "Semua repo". */
function PilihRepo({ repoOpsi, dipilih, onToggle }) {
  return (
    <details className="relative">
      <summary className={`${tombolSekunder} cursor-pointer list-none`}>
        {dipilih.size === 0 ? t('dashboard.filter.semuaRepo') : t('dashboard.filter.repoTerpilih', { n: dipilih.size })}
      </summary>
      <ul className="absolute left-0 z-20 mt-1 max-h-64 w-60 space-y-1 overflow-y-auto rounded-md border border-line bg-panel p-2 shadow-md">
        {repoOpsi.length === 0 && <li className="text-xs text-muted">{t('dashboard.peta.kosong')}</li>}
        {repoOpsi.map((r) => (
          <li key={r.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dipilih.has(r.id)} onChange={() => onToggle(r.id)} />
              {r.nama}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Chip semua filter yang sedang aktif: tiap repo terpilih dan rentang tanggal. */
function ChipAktif({ filter, repoOpsi, hariIni }) {
  const bawaan = rentangPreset(PRESET_BAWAAN, hariIni);
  const tanggalBawaan = filter.dari === bawaan.dari && filter.sampai === bawaan.sampai;
  const namaRepo = new Map(repoOpsi.map((r) => [r.id, r.nama]));
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t('dashboard.filter.aktif')}>
      <span className="text-xs text-muted">{t('dashboard.filter.aktif')}:</span>
      {filter.repo.length === 0 ? (
        <Chip>{t('dashboard.filter.semuaRepo')}</Chip>
      ) : (
        filter.repo.map((id) => {
          const nama = namaRepo.get(id) ?? id;
          return (
            <Chip key={id} namaHapus={nama} hapusHref={urlDashboard({ ...filter, repo: filter.repo.filter((x) => x !== id), lihat: '' }, hariIni)}>
              {nama}
            </Chip>
          );
        })
      )}
      <Chip namaHapus={t('dashboard.filter.tanggal')} hapusHref={tanggalBawaan ? null : urlDashboard({ ...filter, ...bawaan, lihat: '' }, hariIni)}>
        {t('dashboard.filter.rentang', { dari: filter.dari, sampai: filter.sampai })}
      </Chip>
    </div>
  );
}

/**
 * Filter global dashboard: repo (banyak), preset tanggal 7/30/90 hari/tahun ini, rentang kustom, Reset,
 * dan chip filter aktif. Seluruh filter disimpan di query string (?repo=1,2&dari=...&sampai=...).
 */
export default function FilterDashboard({ filter, repoOpsi, hariIni }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [repoDipilih, setRepoDipilih] = useState(() => new Set(filter.repo));
  const [dari, setDari] = useState(filter.dari);
  const [sampai, setSampai] = useState(filter.sampai);
  const presetAktif = kenaliPreset(filter.dari, filter.sampai, hariIni);

  /** Membalik centang satu repo pada pilihan sementara. */
  function toggleRepo(id) {
    setRepoDipilih((s) => {
      const baru = new Set(s);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  /** Menerapkan pilihan repo dan tanggal kustom ke URL. */
  function terapkan(e) {
    e.preventDefault();
    // tanggal kosong ditangani normalisasi di server (jatuh ke bawaan 30 hari)
    const url = urlDashboard({ repo: [...repoDipilih], dari, sampai, lihat: '' }, hariIni);
    mulai(() => router.push(url));
  }

  return (
    <section aria-label={t('dashboard.filter.judul')} className={`${kartu} space-y-3 p-4`}>
      <form onSubmit={terapkan} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 text-xs text-muted">
          {t('dashboard.filter.repo')}
          <PilihRepo repoOpsi={repoOpsi} dipilih={repoDipilih} onToggle={toggleRepo} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted">
          {t('dashboard.filter.tanggal')}
          <div className="flex flex-wrap gap-1.5">
            {DAFTAR_PRESET.map((k) => (
              <Preset key={k} kunci={k} aktif={presetAktif === k} filter={filter} hariIni={hariIni} />
            ))}
            {presetAktif === 'kustom' && <span className="rounded-md border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{t('dashboard.filter.preset.kustom')}</span>}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('dashboard.filter.dari')}
          <input type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} className={`${inputDasar} w-auto`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          {t('dashboard.filter.sampai')}
          <input type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} className={`${inputDasar} w-auto`} />
        </label>
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? t('umum.memproses') : t('dashboard.filter.terapkan')}
        </button>
        <Link href="/" className={tombolSekunder}>
          {t('dashboard.filter.reset')}
        </Link>
      </form>
      <ChipAktif filter={filter} repoOpsi={repoOpsi} hariIni={hariIni} />
    </section>
  );
}
