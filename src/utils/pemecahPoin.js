// Pemecah teks blueprint menjadi poin-poin (tanpa AI, berbasis pola teks).

/** Penanda poin: "1.", "1)", "-", "*", atau "•" di awal baris (boleh diawali spasi). */
const PENANDA = /^(\s*)(?:\d+[.)]|[-*\u2022])\s+(.*)$/;

/** Panjang indentasi sebuah baris (tab dihitung 4 spasi). */
function indentasi(spasi) {
  return spasi.replace(/\t/g, '    ').length;
}

/**
 * Memecah teks berpenanda: setiap penanda tingkat teratas memulai poin baru.
 * Penanda yang lebih menjorok dianggap sub-butir dan ikut poin induknya;
 * baris biasa dianggap lanjutan poin sebelumnya; teks sebelum penanda pertama adalah pembuka (dibuang).
 */
function pecahBerpenanda(baris) {
  const dasar = Math.min(...baris.map((b) => PENANDA.exec(b)).filter(Boolean).map((m) => indentasi(m[1])));
  const hasil = [];
  for (const b of baris) {
    const m = PENANDA.exec(b);
    // baris kosong hanya pemisah visual, tidak mengakhiri poin yang sedang berjalan
    if (!b.trim()) continue;
    if (m && indentasi(m[1]) <= dasar) {
      hasil.push(m[2].trim());
      continue;
    }
    // sebelum penanda pertama: judul/pembuka, bukan poin
    if (hasil.length === 0) continue;
    const sub = m ? `\n- ${m[2].trim()}` : ` ${b.trim()}`;
    hasil[hasil.length - 1] += sub;
  }
  return hasil;
}

/**
 * Memecah teks tanpa penanda: paragraf dipisah baris kosong. Bila seluruh teks hanya satu blok
 * berbaris banyak (tanpa baris kosong), tiap baris dianggap satu poin.
 */
function pecahParagraf(baris) {
  const paragraf = [];
  let sekarang = [];
  for (const b of baris) {
    if (b.trim()) {
      sekarang.push(b.trim());
      continue;
    }
    // baris kosong menutup paragraf
    if (sekarang.length) paragraf.push(sekarang);
    sekarang = [];
  }
  if (sekarang.length) paragraf.push(sekarang);
  // satu blok tanpa baris kosong: asumsikan daftar tanpa penanda, satu baris satu poin
  if (paragraf.length === 1 && paragraf[0].length > 1) return paragraf[0];
  return paragraf.map((p) => p.join(' '));
}

/** Memecah teks blueprint menjadi array poin (teks bersih, tanpa penanda). */
export function pecahPoin(teks) {
  const baris = String(teks ?? '').replace(/\r\n?/g, '\n').split('\n');
  const poin = baris.some((b) => PENANDA.test(b)) ? pecahBerpenanda(baris) : pecahParagraf(baris);
  return poin.map((p) => p.trim()).filter(Boolean);
}
