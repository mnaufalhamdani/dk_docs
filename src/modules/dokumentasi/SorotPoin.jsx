'use client';

import { useEffect } from 'react';

/** Lama sorotan terlihat sebelum class dilepas (ms); sedikit lebih lama dari animasi CSS. */
const DURASI_SOROT = 3000;

/** Membuka semua <details> yang membungkus elemen agar poin yang dicari terlihat. */
function bukaInduk(el) {
  let induk = el.parentElement?.closest('details');
  while (induk) {
    induk.open = true;
    induk = induk.parentElement?.closest('details');
  }
}

/**
 * Menyorot satu poin hasil pencarian: membuka bagian yang terlipat, menggulung ke tengah layar,
 * lalu memberi kilatan warna sementara. Tidak menampilkan apa pun (hanya efek samping).
 */
export default function SorotPoin({ poinId }) {
  useEffect(() => {
    // tidak ada poin yang dituju (halaman dibuka biasa): tidak ada yang disorot
    if (!poinId) return undefined;
    const el = document.getElementById(`poin-${poinId}`);
    // poin tidak ditemukan (sudah dihapus / halaman lain): abaikan tanpa error
    if (!el) return undefined;

    bukaInduk(el);
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: kurangiGerak ? 'auto' : 'smooth', block: 'center' });
    // lepas dulu lalu pasang lagi di frame berikut agar animasi mengulang bila poin yang sama dicari lagi
    el.classList.remove('sorot-poin');
    const frame = requestAnimationFrame(() => el.classList.add('sorot-poin'));
    const timer = setTimeout(() => el.classList.remove('sorot-poin'), DURASI_SOROT);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      el.classList.remove('sorot-poin');
    };
  }, [poinId]);

  return null;
}
