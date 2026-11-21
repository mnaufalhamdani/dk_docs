// Fungsi untuk riwayat "Terakhir dibuka" di localStorage browser (tanpa query database).

/** Kunci localStorage dan jumlah maksimum entri yang diingat. */
export const KUNCI_TERAKHIR_DIBUKA = 'dkdocs.terakhirDibuka';
export const MAKS_TERAKHIR_DIBUKA = 8;

/**
 * Mengenali halaman yang layak dicatat dari path dan query string.
 * repo -> /repo/{id}; modul -> /modul/{id}; halaman -> /menu/{id} (dengan ?h= bila ada).
 * Mengembalikan { tipe, href } atau null untuk halaman lain.
 */
export function kenaliHalamanDibuka(pathname, search) {
  const repo = pathname.match(/^\/repo\/(\d+)$/);
  if (repo) return { tipe: 'repo', href: pathname };
  const modul = pathname.match(/^\/modul\/(\d+)$/);
  if (modul) return { tipe: 'modul', href: pathname };
  const menu = pathname.match(/^\/menu\/(\d+)$/);
  // halaman dokumentasi hidup di /menu/{id}; tab riwayat dan mode edit tidak dicatat
  if (menu) {
    const p = new URLSearchParams(search);
    if (p.get('tab') || p.get('edit')) return null;
    const h = p.get('h');
    return { tipe: 'halaman', href: h && /^\d+$/.test(h) ? `${pathname}?h=${h}` : pathname };
  }
  return null;
}

/** Membaca daftar dari localStorage; null bila penyimpanan tidak bisa diakses, [] bila kosong/rusak. */
export function bacaTerakhirDibuka() {
  try {
    const mentah = JSON.parse(window.localStorage.getItem(KUNCI_TERAKHIR_DIBUKA) ?? '[]');
    // isi rusak (bukan array): mulai dari kosong
    if (!Array.isArray(mentah)) return [];
    return mentah.filter((x) => x && typeof x.href === 'string' && typeof x.nama === 'string' && typeof x.tipe === 'string').slice(0, MAKS_TERAKHIR_DIBUKA);
  } catch {
    // penyimpanan diblokir atau JSON rusak
    return null;
  }
}

/** Menyimpan entri ke urutan teratas (dedupe per href) dan memangkas ke batas maksimum. */
export function catatTerakhirDibuka(entri) {
  try {
    const lama = bacaTerakhirDibuka() ?? [];
    const baru = [entri, ...lama.filter((x) => x.href !== entri.href)].slice(0, MAKS_TERAKHIR_DIBUKA);
    window.localStorage.setItem(KUNCI_TERAKHIR_DIBUKA, JSON.stringify(baru));
  } catch {
    // penyimpanan diblokir atau penuh: riwayat tidak diingat, tidak fatal
  }
}

/** Menghapus seluruh riwayat. */
export function bersihkanTerakhirDibuka() {
  try {
    window.localStorage.removeItem(KUNCI_TERAKHIR_DIBUKA);
  } catch {
    // penyimpanan diblokir: tidak ada yang bisa dihapus
  }
}
