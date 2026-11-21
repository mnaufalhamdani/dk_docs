/** Menghitung jumlah kalimat dalam teks (dipisah . ! ? lalu spasi/akhir teks). */
export function hitungKalimat(teks) {
  const potongan = teks.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim().length > 0);
  return potongan.length;
}

/**
 * Memeriksa apakah poin melewati batas lunak (peringatan, bukan penolakan).
 * Mengembalikan { panjang, terlaluPanjang, terlaluBanyakKalimat, peringatan }.
 */
export function periksaPoin(isi, batas) {
  const panjang = isi.length;
  const terlaluPanjang = panjang > batas.karakter;
  const terlaluBanyakKalimat = hitungKalimat(isi) > batas.kalimat;
  return { panjang, terlaluPanjang, terlaluBanyakKalimat, peringatan: terlaluPanjang || terlaluBanyakKalimat };
}
