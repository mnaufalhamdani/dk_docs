import { hitungKalimat } from '@/modules/shared/poin.util';

/** Frasa pengisi yang dilarang pedoman penulisan ("berfungsi untuk", "digunakan untuk", dst). */
const FRASA_PENGISI = [/\b(?:halaman|menu|form|fitur) ini (?:berfungsi|digunakan) untuk\b/gi, /\bberfungsi untuk\b/gi, /\bdigunakan untuk\b/gi, /\bmelakukan proses\b/gi, /\bpada halaman ini\b/gi];

/** Pemisah klausa yang aman untuk memangkas kalimat panjang. */
const PEMISAH_KLAUSA = [',', ';', ' dan ', ' lalu ', ' kemudian ', ' serta '];

/** Merapatkan spasi, membuang spasi sebelum tanda baca, dan membuat huruf pertama kapital. */
function rapikanTeks(teks) {
  const bersih = teks.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  return bersih ? bersih[0].toUpperCase() + bersih.slice(1) : bersih;
}

/** Membuang frasa pengisi dari teks. Mengembalikan { teks, dibuang } (dibuang = ada frasa yang benar-benar dihapus). */
function buangPengisi(teks) {
  let dibuang = false;
  const hasil = FRASA_PENGISI.reduce((sekarang, pola) => {
    const baru = sekarang.replace(pola, ' ');
    if (baru !== sekarang) dibuang = true;
    return baru;
  }, teks);
  return { teks: rapikanTeks(hasil), dibuang };
}

/** Mengambil `n` kalimat pertama. */
function ambilKalimat(teks, n) {
  return teks.split(/(?<=[.!?])\s+/).slice(0, n).join(' ');
}

/** Memangkas teks pada batas klausa terakhir sebelum `maks` karakter (atau batas kata bila tak ada). */
function pangkasKlausa(teks, maks) {
  // sisakan 1 karakter untuk titik penutup agar hasil tidak melewati batas
  const potong = teks.slice(0, maks - 1);
  const titik = PEMISAH_KLAUSA.map((p) => potong.lastIndexOf(p)).filter((i) => i > maks * 0.5);
  // ada batas klausa di paruh akhir: potong di sana; jika tidak, potong di batas kata terakhir
  const akhir = titik.length ? Math.max(...titik) : potong.lastIndexOf(' ');
  const hasil = (akhir > 0 ? potong.slice(0, akhir) : potong).replace(/[\s,;:.]+$/, '');
  return `${hasil}.`;
}

/** Implementasi DocPolisher berbasis aturan: memeriksa panjang dan mengusulkan pemangkasan sederhana. */
export function buatAturanDocPolisher() {
  return {
    /** Memeriksa poin terhadap batas karakter/kalimat; usulan hanya dibuat bila poin melewati batas. */
    rapikanPoin({ isi, batas }) {
      const asli = isi.replace(/\s+/g, ' ').trim();
      const dasar = { asli, panjang: asli.length, jumlah_kalimat: hitungKalimat(asli) };
      const peringatan = dasar.panjang > batas.karakter || dasar.jumlah_kalimat > batas.kalimat;
      // poin masih dalam batas: tidak ada yang perlu diusulkan
      if (!peringatan) return { ...dasar, usulan: null, berubah: false, peringatan: false, alasan: [] };

      const alasan = [];
      const tanpaPengisi = buangPengisi(asli);
      let teks = tanpaPengisi.teks;
      if (tanpaPengisi.dibuang) alasan.push('Frasa pengisi dibuang.');
      if (hitungKalimat(teks) > batas.kalimat) {
        teks = ambilKalimat(teks, batas.kalimat);
        alasan.push(`Dipangkas menjadi ${batas.kalimat} kalimat pertama.`);
      }
      if (teks.length > batas.karakter) {
        teks = pangkasKlausa(teks, batas.karakter);
        alasan.push('Dipangkas pada batas klausa.');
      }
      const berubah = teks !== asli && teks.length < asli.length;
      return {
        ...dasar,
        usulan: berubah ? teks : null,
        berubah,
        peringatan: true,
        alasan: berubah ? alasan : ['Tidak ada pemangkasan sederhana yang aman; ringkas secara manual.'],
      };
    },
  };
}
