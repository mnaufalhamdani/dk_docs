'use client';

import { useState } from 'react';
import { t } from '@/utils/i18n';

/** Tombol kecil untuk menyalin teks (misal path file) ke clipboard. */
export default function CopyButton({ teks }) {
  const [tersalin, setTersalin] = useState(false);

  /** Menyalin teks lalu menampilkan penanda "tersalin" sesaat. */
  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    } catch {
      // clipboard ditolak browser (misal bukan HTTPS): diamkan, user bisa menyalin manual dari teks
      setTersalin(false);
    }
  }

  return (
    <button type="button" onClick={salin} className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-accent-soft hover:text-accent">
      {tersalin ? t('umum.tersalin') : t('umum.salin')}
    </button>
  );
}
