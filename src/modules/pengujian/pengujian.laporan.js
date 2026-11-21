// Penyusun isi laporan PDF Uji CR dari data database (fungsi murni; PDF digambar di pengujian.pdf.render.js).

import { DAFTAR_KATEGORI_PERUBAHAN, STATUS_SKENARIO } from '@/enums';
import { hitungSelPoin, ringkasHitungan } from './pengujian.status';
import { bangunBaris, bangunPanel, kolomRepo, kunciPanel } from './pengujian.matriks';
import { labelTargetUji } from './pengujian.dokumen';

/** Label status di PDF (selalu PASS, FAIL, BLOCKED, NOT EXECUTED; sel/poin yang belum diuji = BELUM DIUJI). */
export const LABEL_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  BLOCKED: 'BLOCKED',
  NOT_EXECUTED: 'NOT EXECUTED',
  BELUM: 'BELUM DIUJI',
});

/** Jumlah maksimal gambar bukti yang dilampirkan agar PDF tidak membengkak. */
const MAKS_LAMPIRAN = 40;

/** Ekstensi bukti yang dilampirkan sebagai gambar. */
const EKSTENSI_GAMBAR = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/** Hitungan skenario per status. */
function hitungSkenario(daftar) {
  const hitungan = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_EXECUTED: 0 };
  for (const s of daftar) hitungan[s.status] += 1;
  return hitungan;
}

/** Skenario mentah menjadi bentuk laporan: teks langkah dipecah per baris dan bukti dilengkapi path berkas. */
function bentukSkenario(raw, ctx) {
  const repo = ctx.repoPeta.get(raw.repo_id);
  return {
    id: raw.id,
    kode: raw.kode,
    nama: raw.nama,
    tipe: raw.tipe,
    jenis: raw.jenis,
    status: raw.status,
    putaran_nomor: Number(raw.putaran_nomor),
    repo_nama: repo?.nama ?? '-',
    poin_nomor: raw.poin_id ? (ctx.nomorPoin.get(raw.poin_id) ?? null) : null,
    langkah: raw.langkah ? raw.langkah.split('\n') : [],
    hasil_diharapkan: raw.hasil_diharapkan,
    hasil_aktual: raw.hasil_aktual,
    catatan: raw.catatan,
    bukti: raw.bukti.map((nama) => ({ nama, path: `pengujian/${ctx.pengujianId}/p${raw.putaran_nomor}/${repo?.kode}/${nama}` })),
  };
}

/** Teks riwayat satu sel, mis. "FAIL di putaran 1, PASS di putaran 2". */
function teksRiwayat(riwayat) {
  return riwayat.map((r) => `${LABEL_STATUS[r.status]} di putaran ${r.putaran_nomor}`).join(', ');
}

/** Riwayat singkat per poin: tiap repo yang terlibat beserta urutan status per putarannya. */
function riwayatPerPoin({ baris, repos, panel }) {
  return baris.map((p) => ({
    nomor: p.nomor,
    per_repo: repos
      .filter((r) => p.sel[r.id])
      .map((r) => ({ repo_nama: r.nama, teks: teksRiwayat(panel[kunciPanel(p.id, r.id)].riwayat) })),
  }));
}

/** Metadata repo: branch dan hash HEAD dari putaran terbaru yang sudah diimpor untuk tiap repo. */
function metadataRepo({ repos, putaran, putaranRepo }) {
  const nomor = new Map(putaran.map((u) => [u.id, Number(u.nomor)]));
  return repos.map((r) => {
    const diimpor = putaranRepo.filter((x) => x.repo_id === r.id && x.diimpor_pada).sort((a, b) => nomor.get(b.putaran_id) - nomor.get(a.putaran_id));
    return { nama: r.nama, kode: r.kode, branch: diimpor[0]?.branch ?? null, hash_head: diimpor[0]?.hash_head ?? null };
  });
}

/** Pernyataan tools yang belum tersedia per putaran per repo (hanya yang ada isinya). */
function pernyataanTools({ putaran, putaranRepo }) {
  const hasil = [];
  for (const u of [...putaran].sort((a, b) => Number(a.nomor) - Number(b.nomor))) {
    for (const r of putaranRepo.filter((x) => x.putaran_id === u.id && x.tools_belum_tersedia.length > 0)) {
      hasil.push({ putaran_nomor: Number(u.nomor), repo_nama: r.repo_nama, tools: r.tools_belum_tersedia });
    }
  }
  return hasil;
}

/** Analisis perubahan dikelompokkan per kategori (Matches, Supporting, Outside, Risky). */
function analisisPerKategori({ perubahan, ctx }) {
  const hasil = Object.fromEntries(DAFTAR_KATEGORI_PERUBAHAN.map((k) => [k, []]));
  for (const x of perubahan) {
    hasil[x.kategori].push({
      ringkasan: x.ringkasan,
      file: x.file,
      putaran_nomor: Number(x.putaran_nomor),
      repo_nama: ctx.repoPeta.get(x.repo_id)?.nama ?? '-',
      poin_nomor: x.poin_id ? (ctx.nomorPoin.get(x.poin_id) ?? null) : null,
    });
  }
  return hasil;
}

/** Skenario putaran terbaru tiap sel (urut poin, repo) ditambah skenario di luar blueprint. */
function skenarioTerbaru({ baris, repos, panel, skenario, ctx }) {
  const mentah = new Map(skenario.map((s) => [s.id, s]));
  const perSel = [];
  for (const p of baris) {
    for (const r of repos.filter((x) => p.sel[x.id])) {
      const daftar = panel[kunciPanel(p.id, r.id)].skenario.map((s) => bentukSkenario(mentah.get(s.id), ctx));
      perSel.push({ poin_nomor: p.nomor, repo_nama: r.nama, skenario: daftar });
    }
  }
  const luar = skenario.filter((s) => s.poin_id === null).map((s) => bentukSkenario(s, ctx));
  return { perSel, luar };
}

/** Catatan keputusan sebuah sel (teks) atau null. */
function catatanSel(catatan, poinId, repoId) {
  return catatan.find((c) => c.poin_id === poinId && c.repo_id === repoId)?.catatan ?? null;
}

/** Semua skenario FAIL (termasuk yang kemudian lulus) beserta catatan keputusan selnya bila ada. */
function detailFail({ skenario, catatan, ctx }) {
  return skenario
    .filter((s) => s.status === STATUS_SKENARIO.FAIL)
    .map((s) => ({ ...bentukSkenario(s, ctx), catatan_keputusan: s.poin_id ? catatanSel(catatan, s.poin_id, s.repo_id) : null }))
    .sort((a, b) => (a.poin_nomor ?? 1e9) - (b.poin_nomor ?? 1e9) || a.putaran_nomor - b.putaran_nomor);
}

/** Alasan skenario BLOCKED/NOT EXECUTED pada hasil terbaru. */
function alasanTertahan(terbaru) {
  const semua = [...terbaru.perSel.flatMap((s) => s.skenario), ...terbaru.luar];
  const unik = [...new Map(semua.map((s) => [s.id, s])).values()];
  return unik.filter((s) => s.status === STATUS_SKENARIO.BLOCKED || s.status === STATUS_SKENARIO.NOT_EXECUTED);
}

/** Gambar bukti yang dilampirkan: dari skenario terbaru dan FAIL, unik per berkas, dibatasi jumlahnya. */
function daftarLampiran({ terbaru, fail }) {
  const sumber = [...terbaru.perSel.flatMap((s) => s.skenario), ...terbaru.luar, ...fail];
  const peta = new Map();
  for (const s of sumber) {
    for (const b of s.bukti) {
      const ext = b.nama.split('.').pop().toLowerCase();
      // hanya gambar yang dilampirkan; log cukup disebut namanya pada skenario
      if (EKSTENSI_GAMBAR.includes(ext) && !peta.has(b.path)) peta.set(b.path, { path: b.path, nama: b.nama, label: `${s.kode} · ${s.repo_nama} · putaran ${s.putaran_nomor}` });
    }
  }
  return [...peta.values()].slice(0, MAKS_LAMPIRAN);
}

/** Putaran tertinggi yang hasilnya sudah diimpor; bila belum ada impor, putaran terakhir yang dibuat. */
export function putaranTercakup(putaran, putaranRepo) {
  const diimpor = new Set(putaranRepo.filter((r) => r.diimpor_pada).map((r) => r.putaran_id));
  const nomor = (daftar) => Math.max(0, ...daftar.map((u) => Number(u.nomor)));
  return nomor(putaran.filter((u) => diimpor.has(u.id))) || nomor(putaran);
}

/**
 * Menyusun seluruh isi laporan. `data` = { pengujian, poin, target, putaran, putaranRepo, targetRepo, sel, skenario,
 * perubahan, catatan }; `versi` dan `tanggal` ditentukan pemanggil. Tidak ada kesimpulan lulus/gagal.
 */
export function susunLaporan({ data, versi, tanggal }) {
  const { pengujian, poin, target, putaran, putaranRepo, targetRepo, sel, skenario, perubahan, catatan } = data;
  const repos = kolomRepo(target);
  const ctx = { pengujianId: pengujian.id, repoPeta: new Map(repos.map((r) => [r.id, r])), nomorPoin: new Map(poin.map((p) => [p.id, Number(p.nomor)])) };
  const statusSkenario = skenario.filter((s) => s.poin_id !== null);
  const selPoin = hitungSelPoin({ target: targetRepo, sel, skenario: statusSkenario });
  const baris = bangunBaris({ poin, target, selPoin }).map((p) => ({ ...p, target_teks: p.target.map((t) => `${t.repo_nama}: ${labelTargetUji(t)}`) }));
  const panel = bangunPanel({ targetRepo, sel, skenario, catatan });
  const terbaru = skenarioTerbaru({ baris, repos, panel, skenario, ctx });
  const fail = detailFail({ skenario, catatan, ctx });
  const semuaTerbaru = [...new Map([...terbaru.perSel.flatMap((s) => s.skenario), ...terbaru.luar].map((s) => [s.id, s])).values()];
  return {
    cr_id: pengujian.cr_id,
    versi,
    tanggal,
    putaran_tercakup: putaranTercakup(putaran, putaranRepo),
    repo: metadataRepo({ repos, putaran, putaranRepo }),
    hitungan_poin: ringkasHitungan(baris.map((p) => p.status)),
    hitungan_skenario: hitungSkenario(semuaTerbaru),
    tools: pernyataanTools({ putaran, putaranRepo }),
    blueprint: baris.map((p) => ({ nomor: p.nomor, isi: p.isi, target: p.target_teks })),
    repos,
    baris,
    analisis: analisisPerKategori({ perubahan, ctx }),
    riwayat: riwayatPerPoin({ baris, repos, panel }),
    terbaru,
    fail,
    tertahan: alasanTertahan(terbaru),
    catatan_keputusan: catatan.length,
    lampiran: daftarLampiran({ terbaru, fail }),
  };
}

/** Ringkasan status yang disimpan di pengujian_pdf.ringkasan_status. */
export function ringkasanStatus(laporan) {
  return { poin: laporan.hitungan_poin, skenario: laporan.hitungan_skenario };
}