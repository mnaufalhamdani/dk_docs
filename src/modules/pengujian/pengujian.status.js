// Status pengujian yang DIHITUNG saat tampil (fungsi murni). Yang disimpan hanya status skenario.

import { STATUS_SKENARIO, STATUS_UJI } from '@/enums';

/** Kunci peta untuk pasangan (poin, repo). */
const kunciSel = (poinId, repoId) => `${poinId}:${repoId}`;

/**
 * Status satu sel (poin x repo) dari daftar status skenario putaran terbaru yang mencakup sel itu.
 * FAIL jika ada FAIL; BLOCKED jika ada BLOCKED/NOT_EXECUTED; PASS jika semua PASS; BELUM jika tanpa skenario.
 */
export function statusSel(daftarStatus) {
  // tidak ada skenario: sel belum diuji
  if (daftarStatus.length === 0) return STATUS_UJI.BELUM;
  // satu kegagalan sudah cukup menandai sel gagal
  if (daftarStatus.includes(STATUS_SKENARIO.FAIL)) return STATUS_UJI.FAIL;
  // tidak ada gagal tetapi ada yang tertahan atau tidak dieksekusi: sel belum bisa dinyatakan lulus
  if (daftarStatus.some((s) => s === STATUS_SKENARIO.BLOCKED || s === STATUS_SKENARIO.NOT_EXECUTED)) return STATUS_UJI.BLOCKED;
  return STATUS_UJI.PASS;
}

/**
 * Status satu poin dari status sel pada repo yang terlibat saja.
 * FAIL jika ada FAIL; BLOCKED jika tanpa FAIL tetapi ada BLOCKED; PASS jika semua PASS; selain itu BELUM.
 */
export function statusPoin(daftarSel) {
  if (daftarSel.includes(STATUS_UJI.FAIL)) return STATUS_UJI.FAIL;
  if (daftarSel.includes(STATUS_UJI.BLOCKED)) return STATUS_UJI.BLOCKED;
  // semua sel lulus (dan minimal ada satu sel); campuran PASS dengan belum diuji tetap BELUM
  if (daftarSel.length > 0 && daftarSel.every((s) => s === STATUS_UJI.PASS)) return STATUS_UJI.PASS;
  return STATUS_UJI.BELUM;
}

/** Memilih, untuk tiap sel, baris putaran TERBARU yang mencakup sel itu. */
function putaranTerbaruPerSel(sel) {
  const terbaru = new Map();
  for (const s of sel) {
    const k = kunciSel(s.poin_id, s.repo_id);
    const lama = terbaru.get(k);
    // simpan hanya yang nomor putarannya paling besar
    if (!lama || Number(s.putaran_nomor) > Number(lama.putaran_nomor)) terbaru.set(k, s);
  }
  return terbaru;
}

/** Mengelompokkan status skenario menurut (poin, repo, putaran). */
function skenarioPerSel(skenario) {
  const peta = new Map();
  for (const sk of skenario) {
    const k = `${kunciSel(sk.poin_id, sk.repo_id)}:${sk.putaran_id}`;
    peta.set(k, [...(peta.get(k) ?? []), sk.status]);
  }
  return peta;
}

/**
 * Menghitung status tiap sel. `target` = [{poin_id, repo_id}] (sel yang terlibat),
 * `sel` = [{putaran_id, putaran_nomor, poin_id, repo_id}], `skenario` = [{putaran_id, poin_id, repo_id, status}].
 * Hasil: Map poin_id -> { repo_id: status }.
 */
export function hitungSelPoin({ target, sel, skenario }) {
  const terbaru = putaranTerbaruPerSel(sel);
  const perSel = skenarioPerSel(skenario);
  const hasil = new Map();
  for (const t of target) {
    const baris = terbaru.get(kunciSel(t.poin_id, t.repo_id));
    // sel belum pernah masuk putaran mana pun: belum diuji
    const status = baris ? statusSel(perSel.get(`${kunciSel(t.poin_id, t.repo_id)}:${baris.putaran_id}`) ?? []) : STATUS_UJI.BELUM;
    hasil.set(t.poin_id, { ...(hasil.get(t.poin_id) ?? {}), [t.repo_id]: status });
  }
  return hasil;
}

/** Hitungan jumlah poin per status (level CR hanya hitungan, tanpa kesimpulan lulus/gagal). */
export function ringkasHitungan(daftarStatusPoin) {
  const hitungan = { [STATUS_UJI.PASS]: 0, [STATUS_UJI.FAIL]: 0, [STATUS_UJI.BLOCKED]: 0, [STATUS_UJI.BELUM]: 0 };
  for (const s of daftarStatusPoin) hitungan[s] += 1;
  return hitungan;
}
