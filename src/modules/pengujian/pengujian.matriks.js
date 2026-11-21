// Penyusun data matriks poin x repo, panel sel, dan bagian "di luar blueprint" (fungsi murni).

import { KATEGORI_PERUBAHAN } from '@/enums';
import { statusPoin, statusSel } from './pengujian.status';

/** Ekstensi bukti yang ditampilkan sebagai gambar (selain itu hanya tautan). */
const EKSTENSI_GAMBAR = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/** Kategori analisis perubahan yang dimunculkan di bagian "di luar blueprint". */
const KATEGORI_LUAR = [KATEGORI_PERUBAHAN.OUTSIDE, KATEGORI_PERUBAHAN.RISKY];

/** Kunci sel panel. */
export const kunciPanel = (poinId, repoId) => `${poinId}:${repoId}`;

/** Bukti sebuah skenario sebagai tautan unduh/tampil beserta penanda gambar. */
function daftarBukti(skenario) {
  return skenario.bukti.map((nama) => ({
    nama,
    href: `/api/v1/pengujian/bukti?skenario_id=${skenario.id}&nama=${encodeURIComponent(nama)}`,
    gambar: EKSTENSI_GAMBAR.includes(nama.split('.').pop().toLowerCase()),
  }));
}

/** Bentuk skenario yang dikirim ke tampilan (teks langkah dipecah per baris). */
function bentukSkenario(s) {
  return {
    id: s.id,
    kode: s.kode,
    nama: s.nama,
    tipe: s.tipe,
    jenis: s.jenis,
    status: s.status,
    putaran_nomor: s.putaran_nomor,
    langkah: s.langkah ? s.langkah.split('\n') : [],
    hasil_diharapkan: s.hasil_diharapkan,
    hasil_aktual: s.hasil_aktual,
    catatan: s.catatan,
    bukti: daftarBukti(s),
  };
}

/** Repo yang menjadi kolom matriks: semua repo yang terlibat pada target poin, terurut nama. */
export function kolomRepo(target) {
  const peta = new Map();
  for (const t of target) peta.set(t.repo_id, { id: t.repo_id, kode: t.repo_kode, nama: t.repo_nama });
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama));
}

/** Isi panel satu sel: riwayat status per putaran yang mencakup sel, dan skenario putaran terbaru. */
function isiPanel(putaranSel, skenarioSel) {
  const urut = [...putaranSel].sort((a, b) => Number(a.putaran_nomor) - Number(b.putaran_nomor));
  const riwayat = urut.map((p) => ({
    putaran_nomor: Number(p.putaran_nomor),
    status: statusSel(skenarioSel.filter((s) => s.putaran_id === p.putaran_id).map((s) => s.status)),
  }));
  const terbaru = urut[urut.length - 1];
  const skenario = terbaru ? skenarioSel.filter((s) => s.putaran_id === terbaru.putaran_id).map(bentukSkenario) : [];
  return { riwayat, skenario };
}

/**
 * Panel semua sel yang terlibat: peta `poin:repo` -> { riwayat, skenario, catatan }.
 * `catatan` = catatan keputusan opsional sel itu ({ catatan, updated_at }) atau null.
 */
export function bangunPanel({ targetRepo, sel, skenario, catatan = [] }) {
  const panel = {};
  for (const t of targetRepo) {
    const putaranSel = sel.filter((s) => s.poin_id === t.poin_id && s.repo_id === t.repo_id);
    const skenarioSel = skenario.filter((s) => s.poin_id === t.poin_id && s.repo_id === t.repo_id);
    const catatanSel = catatan.find((c) => c.poin_id === t.poin_id && c.repo_id === t.repo_id);
    panel[kunciPanel(t.poin_id, t.repo_id)] = {
      ...isiPanel(putaranSel, skenarioSel),
      catatan: catatanSel ? { catatan: catatanSel.catatan, updated_at: catatanSel.updated_at } : null,
    };
  }
  return panel;
}

/** Baris matriks: poin, target, status tiap sel (hanya repo terlibat), dan status poin. */
export function bangunBaris({ poin, target, selPoin }) {
  return poin.map((p) => {
    const selStatus = selPoin.get(p.id) ?? {};
    return {
      id: p.id,
      nomor: p.nomor,
      isi: p.isi,
      ditambah_putaran: p.ditambah_putaran,
      target: target.filter((t) => t.poin_id === p.id),
      sel: selStatus,
      status: statusPoin(Object.values(selStatus)),
    };
  });
}

/** Bagian "di luar blueprint": skenario tanpa poin, serta analisis perubahan berkategori outside atau risky. */
export function bangunLuarBlueprint({ skenario, perubahan, repoPeta }) {
  const namaRepo = (id) => repoPeta.get(id)?.nama ?? '-';
  return {
    skenario: skenario.filter((s) => s.poin_id === null).map((s) => ({ ...bentukSkenario(s), repo_nama: namaRepo(s.repo_id) })),
    analisis: perubahan
      .filter((x) => KATEGORI_LUAR.includes(x.kategori))
      .map((x) => ({ id: x.id, kategori: x.kategori, ringkasan: x.ringkasan, file: x.file, putaran_nomor: x.putaran_nomor, repo_nama: namaRepo(x.repo_id) })),
  };
}

/** Riwayat putaran: nomor, tanggal, dan status impor serta hash HEAD serta tools per repo. */
export function bangunRiwayatPutaran({ putaran, putaranRepo }) {
  return putaran.map((u) => ({
    id: u.id,
    nomor: u.nomor,
    unique_id: u.unique_id,
    created_at: u.created_at,
    repo: putaranRepo
      .filter((r) => r.putaran_id === u.id)
      .map((r) => ({
        repo_nama: r.repo_nama,
        diimpor_pada: r.diimpor_pada,
        branch: r.branch,
        hash_head: r.hash_head,
        tools_belum_tersedia: r.tools_belum_tersedia,
      })),
  }));
}
