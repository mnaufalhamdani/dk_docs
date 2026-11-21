'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { simpanCatatanSel } from './pengujian.actions';
import { inputDasar, tombolSekunder } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/**
 * Catatan keputusan opsional sebuah sel (mis. FAIL/BLOCKED yang dibiarkan atau diabaikan).
 * Teks kosong menghapus catatan. Catatan tidak mengubah status sel.
 */
export default function CatatanSel({ pengujianId, poinId, repoId, awal }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [teks, setTeks] = useState(awal?.catatan ?? '');
  const [error, setError] = useState('');
  const berubah = teks.trim() !== (awal?.catatan ?? '');

  /** Menyimpan (atau menghapus bila kosong) catatan lalu menyegarkan halaman. */
  function simpan() {
    setError('');
    mulai(async () => {
      const hasil = await simpanCatatanSel({ pengujian_id: pengujianId, poin_id: poinId, repo_id: repoId, catatan: teks });
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5 border-t border-line pt-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        {t('pengujian.catatanKeputusan')}
        <textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={3} placeholder={t('pengujian.catatanKeputusanHint')} className={`${inputDasar} text-xs font-normal text-fg`} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={simpan} disabled={pending || !berubah} className={tombolSekunder}>
          {pending ? t('umum.memproses') : t('umum.simpan')}
        </button>
        {awal && <span className="text-xs text-muted">{t('pengujian.catatanDiperbarui', { waktu: awal.updated_at })}</span>}
        {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
      </div>
    </div>
  );
}
