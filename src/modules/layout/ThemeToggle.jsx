'use client';

import { useEffect, useState } from 'react';
import { t } from '@/utils/i18n';

/** Tombol ganti mode terang/gelap; pilihan disimpan di localStorage. */
export default function ThemeToggle() {
  const [gelap, setGelap] = useState(false);

  // sinkronkan state dengan class yang sudah dipasang skrip awal di <head>
  useEffect(() => {
    setGelap(document.documentElement.classList.contains('dark'));
  }, []);

  /** Membalik mode dan menyimpannya. */
  function ganti() {
    const baru = !gelap;
    document.documentElement.classList.toggle('dark', baru);
    try {
      localStorage.setItem('theme', baru ? 'dark' : 'light');
    } catch {
      // penyimpanan diblokir browser: mode tetap berlaku untuk sesi ini saja
    }
    setGelap(baru);
  }

  return (
    <button type="button" onClick={ganti} aria-pressed={gelap} className="rounded-md border border-line px-2 py-1 text-xs hover:bg-accent-soft">
      {gelap ? t('tema.terang') : t('tema.gelap')}
    </button>
  );
}
