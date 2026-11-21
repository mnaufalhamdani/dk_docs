// Pengelompokan poin blueprint per modul pemilik (fungsi murni).

/**
 * Mengelompokkan poin menurut modul pemilik. Satu modul = satu kelompok (satu prompt);
 * bila poin satu modul melebihi `ukuran`, dipecah menjadi beberapa kelompok berurutan.
 * Masukan: poin = [{ nomor, modul_id | null }]. Poin tanpa modul dikembalikan terpisah.
 */
export function susunKelompok(poin, ukuran) {
  const perModul = new Map();
  const tanpaModul = [];
  for (const p of poin) {
    // poin tanpa modul pemilik tidak bisa masuk kelompok mana pun
    if (!p.modul_id) {
      tanpaModul.push(p.nomor);
      continue;
    }
    perModul.set(p.modul_id, [...(perModul.get(p.modul_id) ?? []), p.nomor]);
  }

  const batas = Math.max(1, ukuran);
  const kelompok = [];
  for (const [modulId, nomor] of perModul) {
    for (let i = 0; i < nomor.length; i += batas) kelompok.push({ modul_id: modulId, poin: nomor.slice(i, i + batas) });
  }
  return { kelompok, tanpaModul };
}
