'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { catatTerakhirDibuka, kenaliHalamanDibuka } from './terakhirDibuka.util';

/** Jeda dan jumlah percobaan menunggu judul halaman (h1) tampil sebelum dicatat. */
const JEDA_MS = 400;
const MAKS_PERCOBAAN = 6;

/** Judul halaman dari h1 utama; untuk halaman dokumentasi ditambah nama tab halaman yang aktif. */
function bacaJudul(tipe) {
  const judul = document.querySelector('main h1')?.textContent?.trim();
  // judul belum muncul (halaman masih streaming): coba lagi nanti
  if (!judul) return null;
  if (tipe !== 'halaman') return judul;
  const tab = document.querySelector('[role="tablist"] a[aria-current="page"]')?.textContent?.trim();
  return tab ? `${judul} / ${tab}` : judul;
}

/**
 * Mencatat repo, modul, atau halaman yang dibuka ke localStorage (tanpa menyentuh server).
 * Tidak menampilkan apa pun; dipasang sekali di kerangka aplikasi.
 */
export default function PelacakTerakhirDibuka() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const entri = kenaliHalamanDibuka(pathname, search);
    // bukan halaman yang dicatat (beranda, sync, impor, dll)
    if (!entri) return undefined;
    let percobaan = 0;
    let timer;
    /** Menunggu h1 muncul lalu mencatat; berhenti setelah beberapa kali percobaan. */
    function coba() {
      const nama = bacaJudul(entri.tipe);
      if (nama) return catatTerakhirDibuka({ ...entri, nama, waktu: Date.now() });
      percobaan += 1;
      if (percobaan < MAKS_PERCOBAAN) timer = setTimeout(coba, JEDA_MS);
      return undefined;
    }
    timer = setTimeout(coba, JEDA_MS);
    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
}
