'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buatVersiPdf } from './pengujian.actions';
import { tombolSekunder, tombolUtama } from '@/modules/shared/ui';
import { t } from '@/utils/i18n';

/** Urutan dan label hitungan status poin pada ringkasan satu versi PDF. */
const URUTAN_POIN = [
  ['PASS', 'PASS'],
  ['FAIL', 'FAIL'],
  ['BLOCKED', 'BLOCKED'],
  ['BELUM', 'Belum diuji'],
];

/** Ringkasan hitungan poin satu versi, mis. "PASS 2 · FAIL 1". */
function ringkasanVersi(ringkasan) {
  const poin = ringkasan?.poin ?? {};
  return URUTAN_POIN.filter(([k]) => poin[k] > 0).map(([k, label]) => `${label} ${poin[k]}`).join(' · ') || '-';
}

/**
 * Panel PDF: daftar versi (tanggal, putaran tercakup, ringkasan status) dengan unduhan per versi,
 * tombol "Buat versi baru", dan penanda bila ada hasil/catatan yang lebih baru daripada versi terakhir.
 * Tidak ada PDF "final": setiap versi hanyalah potret saat dibuat.
 */
export default function PanelPdf({ pengujianId, pdf }) {
  const router = useRouter();
  const [pending, mulai] = useTransition();
  const [error, setError] = useState('');

  /** Membuat versi PDF baru lalu menyegarkan halaman. */
  function buat() {
    setError('');
    mulai(async () => {
      const hasil = await buatVersiPdf(pengujianId);
      if (!hasil.ok) return setError(hasil.error);
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{t('pengujian.pdfJudul')}</h2>
      {pdf.belum_memuat_terbaru && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {t('pengujian.pdfBelumMemuat')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={buat} disabled={pending} className={pdf.belum_memuat_terbaru ? tombolUtama : tombolSekunder}>
          {pending ? t('umum.memproses') : t('pengujian.pdfBuat')}
        </button>
        {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
      </div>
      {pdf.versi.length === 0 ? (
        <p className="text-xs text-muted">{t('pengujian.pdfKosong')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel text-xs">
          {pdf.versi.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-mono font-medium">v{v.versi}</span>
                <span className="ml-2 text-muted">{v.created_at}</span>
                <span className="ml-2">{t('pengujian.pdfPutaran', { n: v.putaran_tercakup })}</span>
                <span className="ml-2 text-muted">{ringkasanVersi(v.ringkasan_status)}</span>
              </span>
              <a href={`/api/v1/pengujian/pdf?id=${v.id}`} className="text-accent hover:underline">
                {t('pengujian.pdfUnduh')}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
