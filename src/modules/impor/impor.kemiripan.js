// Pencocokan teks poin lama dengan teks dari agen (fungsi murni).

/** Ambang kemiripan minimal agar poin dianggap "paling mirip" tanpa konfirmasi user. */
export const AMBANG_MIRIP = 0.6;

/** Menormalkan teks untuk perbandingan: huruf kecil, spasi tunggal, tanpa tanda baca akhir. */
export function normalisasi(teks) {
  return String(teks ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?;:,\s]+$/g, '')
    .trim();
}

/** Himpunan bigram huruf dari teks yang sudah dinormalisasi. */
function bigram(teks) {
  const hasil = new Map();
  for (let i = 0; i < teks.length - 1; i += 1) {
    const b = teks.slice(i, i + 2);
    hasil.set(b, (hasil.get(b) ?? 0) + 1);
  }
  return hasil;
}

/** Koefisien Dice antara dua teks (0 = beda total, 1 = sama persis). */
export function kemiripan(a, b) {
  const x = normalisasi(a);
  const y = normalisasi(b);
  if (x === y) return 1;
  // teks terlalu pendek untuk bigram: hanya sama persis yang dianggap mirip
  if (x.length < 2 || y.length < 2) return 0;
  const bx = bigram(x);
  const by = bigram(y);
  let irisan = 0;
  for (const [k, n] of bx) irisan += Math.min(n, by.get(k) ?? 0);
  return (2 * irisan) / (x.length - 1 + (y.length - 1));
}

/**
 * Mencari poin lama yang paling cocok dengan `teks` dari daftar kandidat { id, isi }.
 * Mengembalikan { cocok, mirip, kandidat } — `cocok` null bila tidak ada yang memenuhi ambang;
 * `kandidat` = 5 poin teratas (untuk dipilih manual oleh user).
 */
export function cariPoinTerdekat(teks, kandidat) {
  const berskor = kandidat.map((k) => ({ ...k, skor: kemiripan(teks, k.isi) })).sort((a, b) => b.skor - a.skor);
  const terbaik = berskor[0];
  const lima = berskor.slice(0, 5).map(({ id, isi }) => ({ id, isi }));
  // tidak ada kandidat atau skor di bawah ambang: serahkan pada user
  if (!terbaik || terbaik.skor < AMBANG_MIRIP) return { cocok: null, mirip: false, kandidat: lima };
  return { cocok: terbaik, mirip: terbaik.skor < 1, kandidat: lima };
}
