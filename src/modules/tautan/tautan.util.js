// Fungsi murni untuk tautan poin <-> CR/B (aman dipakai di server maupun client).

/** Apakah ada tautan berstatus pending pada daftar tautan sebuah poin. */
export function adaPending(tautan) {
  return Array.isArray(tautan) && tautan.some((x) => x.status === 'pending');
}

/** Tautan yang ditampilkan sebagai chip: hanya aktif dan pending (sudah_berubah tidak ditampilkan di poin). */
export function tautanTampil(tautan) {
  return (tautan ?? []).filter((x) => x.status === 'aktif' || x.status === 'pending');
}

/** Mengganti status satu tautan pada daftar (mengembalikan array baru). */
export function gantiStatusTautan(tautan, id, status) {
  return (tautan ?? []).map((x) => (String(x.id) === String(id) ? { ...x, status } : x));
}
