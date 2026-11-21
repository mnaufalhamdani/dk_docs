// Operasi murni pada daftar poin yang sedang diedit di form Uji CR baru (dipakai komponen klien).
// Satu item: { kunci, isi, target: [{ modul_id, menu_id }] }; `kunci` hanya untuk key React.

let urutKunci = 0;

/** Kunci unik berikutnya untuk item poin baru. */
export function kunciBaru() {
  urutKunci += 1;
  return urutKunci;
}

/** Membuat item poin baru dari teks. */
export function buatItem(isi, target = []) {
  return { kunci: kunciBaru(), isi, target };
}

/** Menggabungkan poin ke-idx dengan poin sesudahnya (teks disambung baris baru, target digabung tanpa duplikat). */
export function gabungDenganBerikutnya(daftar, idx) {
  const a = daftar[idx];
  const b = daftar[idx + 1];
  // tidak ada poin sesudahnya: tidak ada yang digabung
  if (!b) return daftar;
  const target = [...a.target];
  for (const t of b.target) {
    // target yang sama persis tidak perlu dobel
    if (!target.some((x) => x.modul_id === t.modul_id && x.menu_id === t.menu_id)) target.push(t);
  }
  const gabungan = { ...a, isi: `${a.isi}\n${b.isi}`.trim(), target };
  return [...daftar.slice(0, idx), gabungan, ...daftar.slice(idx + 2)];
}

/** Memecah poin ke-idx per baris tak kosong; tiap hasil mewarisi target poin asal. */
export function pecahPerBaris(daftar, idx) {
  const baris = daftar[idx].isi.split('\n').map((b) => b.trim()).filter(Boolean);
  // hanya satu baris: tidak ada yang dipecah
  if (baris.length < 2) return daftar;
  const hasil = baris.map((b, i) => (i === 0 ? { ...daftar[idx], isi: b } : buatItem(b, [...daftar[idx].target])));
  return [...daftar.slice(0, idx), ...hasil, ...daftar.slice(idx + 1)];
}

/** Apakah semua poin berisi teks dan punya minimal satu target (syarat poin siap dikirim). */
export function poinLengkap(daftar) {
  return daftar.every((p) => p.isi.trim() && p.target.length > 0);
}

/** Menggeser poin ke-idx satu langkah (arah -1 naik, +1 turun). */
export function pindah(daftar, idx, arah) {
  const tujuan = idx + arah;
  // sudah di ujung daftar: posisi tidak berubah
  if (tujuan < 0 || tujuan >= daftar.length) return daftar;
  const salinan = [...daftar];
  [salinan[idx], salinan[tujuan]] = [salinan[tujuan], salinan[idx]];
  return salinan;
}
