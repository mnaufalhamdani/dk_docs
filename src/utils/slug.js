/**
 * Membuat kode (huruf kecil, angka, '-') dari sebuah teks, misal "Transport Daily" -> "transport-daily".
 * Dipakai bila user tidak mengisi kode secara manual.
 */
export function buatKode(teks) {
  const kode = String(teks ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // buang tanda aksen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  // teks kosong / semua simbol: pakai kode cadangan agar tidak menyimpan string kosong
  return kode || 'item';
}

/** Memecah teks daftar (dipisah koma atau baris baru) menjadi array unik tanpa elemen kosong. */
export function pecahDaftar(teks) {
  if (Array.isArray(teks)) return [...new Set(teks.map((s) => String(s).trim()).filter(Boolean))];
  return [
    ...new Set(
      String(teks ?? '')
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
