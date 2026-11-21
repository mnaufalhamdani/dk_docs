'use client';

import { useState } from 'react';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Satu tab per repo berisi prompt, tombol Salin, dan Unduh .md (semuanya memakai unique_id yang sama). */
export default function TabPrompt({ sesi }) {
  const [aktif, setAktif] = useState(0);
  const [tersalin, setTersalin] = useState(false);
  const s = sesi[aktif];

  /** Menyalin isi prompt tab aktif ke clipboard. */
  async function salin() {
    try {
      await navigator.clipboard.writeText(s.isi_prompt);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    } catch {
      // clipboard ditolak browser (bukan HTTPS): user masih bisa memilih teks manual atau unduh .md
      setTersalin(false);
    }
  }

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex flex-wrap border-b border-line">
        {sesi.map((x, i) => (
          <button
            key={x.repo.kode}
            type="button"
            role="tab"
            aria-selected={i === aktif}
            onClick={() => setAktif(i)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${i === aktif ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-fg'}`}
          >
            {x.label ?? x.repo.nama}
          </button>
        ))}
      </div>
      {s.alasan && (
        <p className="text-xs text-muted">
          <span className="font-medium">{t('blueprint.alasan')}:</span> {s.alasan}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={salin} className={tombolUtama}>
          {tersalin ? t('umum.tersalin') : t('umum.salin')}
        </button>
        <a href={s.href_unduh ?? `/api/v1/prompt/unduh?unique_id=${s.unique_id}&repo=${encodeURIComponent(s.repo.kode)}`} className={tombolSekunder} download>
          {t('prompt.unduh')}
        </a>
        <span className="font-mono text-xs text-muted">{s.nama_file}</span>
      </div>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-panel p-3 font-mono text-xs">{s.isi_prompt}</pre>
    </div>
  );
}
