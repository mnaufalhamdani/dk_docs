'use client';

import { useState } from 'react';
import ChipTautan from './ChipTautan';
import { adaPending, gantiStatusTautan, tautanTampil } from './tautan.util';
import { t } from '@/utils/i18n';

/**
 * Teks satu poin pada tampilan baca beserta chip nomor CR/B-nya.
 * Poin dengan minimal satu tautan pending ditampilkan redup dan tercoret dengan label "pending".
 */
export default function PoinBaca({ isi, tautan: tautanAwal }) {
  const [tautan, setTautan] = useState(tautanAwal ?? []);
  const pending = adaPending(tautan);
  const chip = tautanTampil(tautan);
  return (
    <span className="min-w-0">
      <span className={pending ? 'text-muted line-through opacity-60' : ''}>{isi}</span>
      {pending && <span className="ml-2 rounded border border-dashed border-line px-1 py-0.5 align-middle text-[10px] uppercase text-muted">{t('tautan.labelPending')}</span>}
      {chip.map((x) => (
        <span key={x.id} className="ml-2 inline-block align-middle">
          <ChipTautan tautan={x} onStatus={(id, status) => setTautan((s) => gantiStatusTautan(s, id, status))} />
        </span>
      ))}
    </span>
  );
}
