import 'server-only';
import path from 'node:path';
import { AppError } from '@/utils/appError';
import { validasi } from '@/utils/validasi';
import { deteksiTipeGambar, tampakTeks } from '@/utils/tipeBerkas';
import { STATUS_SKENARIO } from '@/enums';
import { dokumenHasilUjiSchema, POLA_NAMA_BUKTI } from './pengujian.hasil.schema';
import { normalisasiCr } from './pengujian.dokumen';

/** Ukuran maksimal satu berkas bukti (10 MB) dan total semua berkas bukti sekali impor (50 MB). */
const MAKS_UKURAN_BUKTI = 10 * 1024 * 1024;
const MAKS_TOTAL_BUKTI = 50 * 1024 * 1024;

/** Ekstensi gambar yang didukung beserta tipe MIME hasil deteksi isi; ekstensi teks yang didukung. */
const MIME_GAMBAR_BUKTI = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const EKSTENSI_TEKS = ['txt', 'log'];

/** Jumlah kesalahan yang ditampilkan sekaligus agar pesan tetap terbaca. */
const MAKS_KESALAHAN_TAMPIL = 10;

/** Ekstensi huruf kecil tanpa titik. */
const ekstensi = (nama) => path.extname(nama).slice(1).toLowerCase();

/** Mengurai teks JSON; gagal -> AppError 400 dengan alasan parser. */
function uraiJson(teks) {
  try {
    return JSON.parse(teks);
  } catch (error) {
    throw new AppError(`JSON tidak valid: ${error.message}`, 400);
  }
}

/** Melempar satu AppError berisi daftar kesalahan (dipotong agar tidak terlalu panjang). */
function lemparKesalahan(daftar) {
  const tampil = daftar.slice(0, MAKS_KESALAHAN_TAMPIL);
  if (daftar.length > tampil.length) tampil.push(`...dan ${daftar.length - tampil.length} kesalahan lain.`);
  throw new AppError(tampil.join('\n'), 400);
}

/** Memeriksa isi (byte) sebuah berkas bukti terhadap ekstensinya; nama dan MIME dari client tidak dipercaya. */
function periksaIsiBukti(nama, buf) {
  const ext = ekstensi(nama);
  // ekstensi gambar: isinya harus benar-benar gambar dengan tipe yang sama
  if (MIME_GAMBAR_BUKTI[ext]) {
    if (deteksiTipeGambar(buf) !== MIME_GAMBAR_BUKTI[ext]) throw new AppError(`Isi berkas bukti "${nama}" bukan gambar ${ext.toUpperCase()}.`, 400);
    return;
  }
  // ekstensi teks: tidak boleh berisi data biner
  if (EKSTENSI_TEKS.includes(ext)) {
    if (!tampakTeks(buf)) throw new AppError(`Isi berkas bukti "${nama}" bukan teks.`, 400);
    return;
  }
  throw new AppError(`Tipe berkas bukti "${nama}" tidak didukung. Gunakan PNG, JPG, GIF, WebP, TXT, atau LOG.`, 400);
}

/** Nama berkas bukti yang dirujuk skenario (semua skenario). */
const rujukanBukti = (dok) => new Set(dok.skenario.flatMap((s) => s.bukti));

/** Kesalahan isi dokumen terhadap konteks Uji CR (kode ganda, poin tak ditugaskan, bukti tak diunggah). */
function kumpulkanKesalahan(dok, tugas, namaBukti) {
  const salah = [];
  const kode = new Set();
  for (const s of dok.skenario) {
    // kode skenario harus unik per repo per putaran (unique key di database)
    if (kode.has(s.kode)) salah.push(`Kode skenario ${s.kode} dipakai lebih dari sekali.`);
    kode.add(s.kode);
    // poin di luar penugasan akan diabaikan diam-diam oleh perhitungan status, jadi tolak sekarang
    if (s.poin !== null && !tugas.has(s.poin)) salah.push(`Skenario ${s.kode}: poin ${s.poin} tidak ditugaskan pada repo ini di putaran ini.`);
    for (const b of s.bukti) if (!namaBukti.has(b)) salah.push(`Skenario ${s.kode}: berkas bukti "${b}" tidak ikut diunggah.`);
  }
  for (const a of dok.analisis_perubahan) {
    if (a.poin !== null && !tugas.has(a.poin)) salah.push(`Analisis perubahan: poin ${a.poin} tidak ditugaskan pada repo ini di putaran ini.`);
  }
  return salah;
}

/** Peringatan (tidak menghalangi simpan) tentang kejanggalan hasil uji. */
function kumpulkanPeringatan(dok, konteks, namaBukti) {
  const peringatan = [];
  for (const s of dok.skenario) {
    // PASS wajib berbukti menurut prompt; tandai agar reviewer memeriksa
    if (s.status === STATUS_SKENARIO.PASS && s.bukti.length === 0) peringatan.push(`Skenario ${s.kode} berstatus PASS tanpa bukti.`);
  }
  const adaSkenario = new Set(dok.skenario.map((s) => s.poin).filter((p) => p !== null));
  for (const nomor of konteks.tugas.keys()) {
    if (!adaSkenario.has(nomor)) peringatan.push(`Poin ${nomor} ditugaskan tetapi tidak punya skenario.`);
  }
  const rujukan = rujukanBukti(dok);
  const abaikan = [...namaBukti].filter((n) => !rujukan.has(n)).length;
  if (abaikan > 0) peringatan.push(`${abaikan} berkas bukti tidak dirujuk JSON dan akan diabaikan.`);
  if (konteks.repo.diimpor_pada) peringatan.push(`Repo ini sudah diimpor pada ${konteks.repo.diimpor_pada}. Menyimpan akan menggantikan hasil sebelumnya.`);
  return peringatan;
}

/** Hitungan skenario per status. */
function hitungSkenario(skenario) {
  const hitungan = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_EXECUTED: 0 };
  for (const s of skenario) hitungan[s.status] += 1;
  return hitungan;
}

/**
 * Penerima hasil uji: memvalidasi JSON agen dan berkas bukti terhadap putaran/repo di DK Docs,
 * menyajikan pratinjau, lalu menyimpan hasilnya dalam satu transaksi (bukti ditulis ke disk sesudahnya).
 */
export function buatPenerimaHasil({ pengujianModel, imporModel, penyimpananFile, db }) {
  /** Memastikan unique_id, cr_id, putaran, dan repo pada JSON cocok dengan Uji CR ini. */
  async function bangunKonteks(pengujianId, dok) {
    const pengujian = await pengujianModel.byId(pengujianId);
    // id Uji CR tidak dikenal: 404
    if (!pengujian) throw new AppError('Uji CR tidak ditemukan.', 404);
    const putaran = await pengujianModel.putaranByUniqueId(dok.unique_id);
    // unique_id tidak dikenal atau milik Uji CR lain: JSON salah tempat
    if (!putaran || putaran.pengujian_id !== pengujian.id) {
      throw new AppError(`unique_id ${dok.unique_id} tidak dikenal pada Uji CR ${pengujian.cr_id}. Pastikan JSON berasal dari prompt Uji CR ini.`, 400);
    }
    const salah = [];
    // JSON agen memakai bentuk prompt (CR202502030002) sedangkan Uji CR menyimpan nomor polos: bandingkan bentuk bakunya
    if (normalisasiCr(dok.cr_id).toLowerCase() !== normalisasiCr(pengujian.cr_id).toLowerCase()) salah.push(`cr_id pada JSON (${dok.cr_id}) berbeda dengan Uji CR (${pengujian.cr_id}).`);
    if (dok.putaran !== putaran.nomor) salah.push(`putaran pada JSON (${dok.putaran}) berbeda dengan putaran prompt (${putaran.nomor}).`);
    const repo = await pengujianModel.putaranRepoByKode(putaran.id, dok.repo);
    if (!repo) salah.push(`Repo "${dok.repo}" tidak termasuk putaran ${putaran.nomor} Uji CR ini.`);
    if (salah.length > 0) lemparKesalahan(salah);
    const tugas = new Map((await pengujianModel.poinDitugaskan(putaran.id, repo.repo_id)).map((p) => [p.nomor, p.id]));
    return { pengujian, putaran, repo, tugas };
  }

  /** Validasi penuh (skema, konteks, isi); mengembalikan dokumen bersih, konteks, dan peringatan. */
  async function validasiDokumen(pengujianId, json, daftarNama) {
    const dok = validasi(dokumenHasilUjiSchema, uraiJson(json));
    const konteks = await bangunKonteks(pengujianId, dok);
    const namaBukti = new Set(daftarNama);
    const salah = kumpulkanKesalahan(dok, konteks.tugas, namaBukti);
    if (salah.length > 0) lemparKesalahan(salah);
    return { dok, konteks, peringatan: kumpulkanPeringatan(dok, konteks, namaBukti) };
  }

  /** Membaca berkas bukti yang dirujuk JSON ke memori sambil memeriksa nama, ukuran, dan isinya. */
  async function bacaBukti(files, rujukan) {
    const hasil = new Map();
    let total = 0;
    for (const f of files.filter((x) => rujukan.has(x.name))) {
      if (!POLA_NAMA_BUKTI.test(f.name)) throw new AppError(`Nama berkas bukti "${f.name}" tidak valid.`, 400);
      // nama kembar di antara berkas yang diunggah: tidak jelas mana yang dimaksud
      if (hasil.has(f.name)) throw new AppError(`Berkas bukti "${f.name}" diunggah lebih dari sekali.`, 400);
      if (f.size > MAKS_UKURAN_BUKTI) throw new AppError(`Berkas bukti "${f.name}" melebihi 10 MB.`, 400);
      total += f.size;
      if (total > MAKS_TOTAL_BUKTI) throw new AppError('Total ukuran berkas bukti melebihi 50 MB.', 400);
      const buffer = Buffer.from(await f.arrayBuffer());
      periksaIsiBukti(f.name, buffer);
      hasil.set(f.name, buffer);
    }
    return hasil;
  }

  /** Mencatat JSON mentah di impor_hasil dan menandai sesi prompt sudah disimpan. */
  async function catatImpor(sesiId, json, conn) {
    // sesi prompt sudah tidak ada (FK SET NULL): tidak ada tempat mencatat JSON mentah, hasilnya tetap tersimpan
    if (!sesiId) return;
    const imporId = await imporModel.buat(sesiId, json, conn);
    await imporModel.ubahStatus(imporId, 'disimpan', conn);
    await imporModel.ubahStatusSesi(sesiId, 'disimpan', conn);
  }

  /** Mengganti hasil sebuah putaran-repo (skenario, analisis perubahan, data repo) dalam satu transaksi. */
  function simpanDb({ dok, konteks, json }) {
    const { putaran, repo, tugas } = konteks;
    const idPoin = (nomor) => (nomor === null ? null : tugas.get(nomor));
    return db.transaction(async (conn) => {
      await pengujianModel.hapusHasilRepo(putaran.id, repo.repo_id, conn);
      for (const s of dok.skenario) {
        await pengujianModel.tambahSkenario({ ...s, putaran_id: putaran.id, repo_id: repo.repo_id, poin_id: idPoin(s.poin) }, conn);
      }
      for (const a of dok.analisis_perubahan) {
        await pengujianModel.tambahPerubahan({ ...a, putaran_id: putaran.id, repo_id: repo.repo_id, poin_id: idPoin(a.poin) }, conn);
      }
      await pengujianModel.isiPutaranRepo({ id: repo.id, branch: dok.branch, hash_head: dok.hash_head, tools_belum_tersedia: dok.tools_belum_tersedia }, conn);
      await catatImpor(repo.sesi_prompt_id, json, conn);
    });
  }

  /** Menulis berkas bukti baru ke disk lalu menghapus berkas bukti lama yang tidak dipakai lagi. */
  async function tulisBukti({ konteks, berkas, buktiLama }) {
    const folder = `pengujian/${konteks.pengujian.id}/p${konteks.putaran.nomor}/${konteks.repo.repo_kode}`;
    for (const [nama, buffer] of berkas) await penyimpananFile.simpanDi(`${folder}/${nama}`, buffer);
    for (const nama of buktiLama.filter((n) => !berkas.has(n))) await penyimpananFile.hapus(`${folder}/${nama}`);
  }

  return {
    /** Pratinjau: validasi JSON terhadap Uji CR lalu ringkasan isi, tanpa menyimpan apa pun. */
    async pratinjau({ pengujian_id, json, nama_bukti }) {
      const { dok, konteks, peringatan } = await validasiDokumen(pengujian_id, json, nama_bukti);
      return {
        cr_id: konteks.pengujian.cr_id,
        putaran: konteks.putaran.nomor,
        repo: { kode: konteks.repo.repo_kode, nama: konteks.repo.repo_nama },
        branch: dok.branch,
        hash_head: dok.hash_head,
        hitungan: hitungSkenario(dok.skenario),
        skenario: dok.skenario.map((s) => ({ kode: s.kode, poin: s.poin, nama: s.nama, tipe: s.tipe, jenis: s.jenis, status: s.status, jumlah_bukti: s.bukti.length })),
        analisis: dok.analisis_perubahan,
        tools_belum_tersedia: dok.tools_belum_tersedia,
        lingkungan: dok.lingkungan,
        peringatan,
      };
    },
    /** Menyimpan hasil uji dan berkas bukti; mengembalikan hitungan skenario dan jumlah bukti tersimpan. */
    async simpan({ pengujian_id, json, files }) {
      const { dok, konteks } = await validasiDokumen(pengujian_id, json, files.map((f) => f.name));
      const berkas = await bacaBukti(files, rujukanBukti(dok));
      const buktiLama = await pengujianModel.buktiPutaranRepo(konteks.putaran.id, konteks.repo.repo_id);
      await simpanDb({ dok, konteks, json });
      try {
        await tulisBukti({ konteks, berkas, buktiLama });
      } catch (error) {
        // hasil sudah tersimpan tetapi berkas gagal ditulis: impor ulang aman karena menggantikan hasil sebelumnya
        throw new AppError(`Hasil tersimpan, tetapi berkas bukti gagal ditulis (${error.message}). Impor ulang untuk memperbaikinya.`, 500);
      }
      return { hitungan: hitungSkenario(dok.skenario), jumlah_bukti: berkas.size };
    },
  };
}
