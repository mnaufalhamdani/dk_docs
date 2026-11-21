// Fungsi murni untuk membandingkan teknologi dari JSON agent dengan yang sudah tercatat di repo.

/** Kunci pembanding nama teknologi: tanpa beda huruf besar-kecil (sama dengan UNIQUE di database). */
export const kunciTeknologi = (nama) => String(nama ?? '').trim().toLowerCase();

/** Menyamakan versi untuk perbandingan: kosong dan null dianggap sama. */
const versiBersih = (versi) => (versi == null ? '' : String(versi).trim());

/**
 * Menyusun daftar "Info repo" untuk review: hanya teknologi yang baru atau versinya berubah.
 * Entri agent dengan nama kembar digabung (yang terakhir dipakai). Teknologi yang sama persis
 * dengan catatan tidak ikut ditampilkan karena tidak ada yang perlu diterapkan.
 */
export function susunInfoRepo(dariAgen, tercatat) {
  const unik = new Map();
  for (const x of dariAgen ?? []) unik.set(kunciTeknologi(x.nama), x);
  const catatan = new Map((tercatat ?? []).map((x) => [kunciTeknologi(x.nama), x]));

  const hasil = [];
  for (const [kunci, x] of unik) {
    const lama = catatan.get(kunci);
    // belum pernah tercatat: teknologi baru
    if (!lama) {
      hasil.push({ kunci, nama: x.nama, versi: x.versi ?? null, sumber_file: x.sumber_file ?? null, versi_lama: null, status: 'baru' });
      continue;
    }
    // versi sama dengan catatan: tidak ada yang perlu diterapkan
    if (versiBersih(lama.versi) === versiBersih(x.versi)) continue;
    hasil.push({ kunci, nama: x.nama, versi: x.versi ?? null, sumber_file: x.sumber_file ?? null, versi_lama: lama.versi ?? null, status: 'berubah' });
  }
  return hasil;
}
