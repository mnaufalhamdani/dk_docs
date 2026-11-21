// Urutan eksekusi kelompok blueprint beserta alasannya (fungsi murni).

/** Poin yang menyebut perubahan struktur data didahulukan. */
const POLA_SKEMA = /\b(tabel|table|kolom|column|migrasi|migration|skema|schema|alter\s+table|foreign\s*key)\b/i;

/** Menggabungkan nama modul unik menjadi teks "A, B dan C". */
function daftarNama(idModul, namaModul) {
  const nama = [...new Set(idModul)].map((id) => namaModul.get(id) ?? `#${id}`);
  if (nama.length <= 1) return nama.join('');
  return `${nama.slice(0, -1).join(', ')} dan ${nama[nama.length - 1]}`;
}

/** Menyusun daftar kelompok yang harus selesai lebih dulu untuk tiap kelompok. */
function hitungKetergantungan(kelompok, rujukan, dependensiModul) {
  const butuh = kelompok.map(() => new Set());
  kelompok.forEach((k, i) => {
    const dirujuk = new Set(k.poin.flatMap((n) => rujukan.get(n) ?? []));
    for (const d of dependensiModul) if (d.modul_id === k.modul_id) dirujuk.add(d.ke_modul_id);
    kelompok.forEach((lain, j) => {
      // kelompok milik modul yang dirujuk harus selesai lebih dulu
      if (j !== i && lain.modul_id !== k.modul_id && dirujuk.has(lain.modul_id)) butuh[i].add(j);
      // potongan lanjutan dari modul yang sama mengikuti potongan sebelumnya
      if (j < i && lain.modul_id === k.modul_id) butuh[i].add(j);
    });
  });
  return butuh;
}

/**
 * Mengurutkan kelompok dengan topological sort. Ketergantungan antar modul bersifat wajib;
 * kelompok yang memuat poin tabel/kolom/migrasi didahulukan di antara yang siap, lalu mengikuti urutan poin.
 * Masukan:
 *  - kelompok: [{ modul_id, poin: [nomor] }]
 *  - teksPoin: Map(nomor -> isi); rujukan: Map(nomor -> [modul_id terkait])
 *  - dependensiModul: [{ modul_id, ke_modul_id }]; namaModul: Map(modul_id -> nama)
 * Keluaran: kelompok terurut dengan field `alasan`.
 */
export function urutkanKelompok({ kelompok, teksPoin, rujukan, dependensiModul, namaModul }) {
  const skema = kelompok.map((k) => k.poin.some((n) => POLA_SKEMA.test(teksPoin.get(n) ?? '')));
  const nomorAwal = kelompok.map((k) => Math.min(...k.poin));
  const butuh = hitungKetergantungan(kelompok, rujukan, dependensiModul);

  const selesai = new Set();
  const urutan = [];
  const siklus = new Set();
  /** Memilih kandidat terbaik: skema dulu, lalu nomor poin terkecil. */
  const terbaik = (kandidat) => kandidat.sort((a, b) => Number(skema[b]) - Number(skema[a]) || nomorAwal[a] - nomorAwal[b])[0];

  while (urutan.length < kelompok.length) {
    const sisa = kelompok.map((_, i) => i).filter((i) => !selesai.has(i));
    const siap = sisa.filter((i) => [...butuh[i]].every((j) => selesai.has(j)));
    // tidak ada yang siap: rujukan melingkar, pilih yang terbaik dan tandai
    const pilih = siap.length ? terbaik(siap) : terbaik(sisa);
    if (!siap.length) siklus.add(pilih);
    selesai.add(pilih);
    urutan.push(pilih);
  }

  return urutan.map((i, posisi) => {
    const alasan = [];
    const lintas = [...butuh[i]].filter((j) => kelompok[j].modul_id !== kelompok[i].modul_id);
    const dirujukOleh = kelompok.filter((k, j) => j !== i && k.modul_id !== kelompok[i].modul_id && butuh[j].has(i)).map((k) => k.modul_id);
    if (skema[i]) alasan.push('Memuat poin yang menyebut tabel/kolom/migrasi, jadi didahulukan agar struktur data siap.');
    if (lintas.length) alasan.push(`Bergantung pada ${daftarNama(lintas.map((j) => kelompok[j].modul_id), namaModul)} yang dikerjakan lebih dulu.`);
    if (dirujukOleh.length) alasan.push(`Dirujuk oleh ${daftarNama(dirujukOleh, namaModul)} yang dikerjakan setelahnya.`);
    if (siklus.has(i)) alasan.push('Ada rujukan melingkar antar modul; urutan mengikuti poin di blueprint.');
    if (alasan.length === 0) alasan.push(posisi === 0 ? 'Tidak ada ketergantungan antar modul; mengikuti urutan poin di blueprint.' : 'Mengikuti urutan poin di blueprint.');
    return { ...kelompok[i], alasan: alasan.join(' ') };
  });
}
