import 'server-only';
import { AppError } from '@/utils/appError';
import { hasilBerkas } from '@/utils/responseHandler';
import { pecahPoin } from '@/utils/pemecahPoin';
import { kelompokkan } from '@/modules/prompt/prompt.dokumen';
import { JENIS_SESI, TOOLS_UJI } from '@/enums';
import { jenisUjiPlatform } from './pengujian.dokumen';
import { kelompokPerRepo } from './pengujian.perakit';
import { hitungSelPoin, ringkasHitungan, statusPoin } from './pengujian.status';
import { bangunBaris, bangunLuarBlueprint, bangunPanel, bangunRiwayatPutaran, kolomRepo } from './pengujian.matriks';
import { bacaDaftarJson } from '@/utils/jsonKolom';

/** Nomor putaran awal sebuah Uji CR baru. */
const PUTARAN_AWAL = 1;

/** Tipe konten berkas bukti menurut ekstensi (teks disajikan sebagai text/plain agar tidak dieksekusi browser). */
const MIME_BUKTI = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain; charset=utf-8',
  log: 'text/plain; charset=utf-8',
};

/** Nama berkas prompt uji yang diunduh. */
const namaFilePrompt = (kodeRepo, uniqueId) => `prompt_uji_${kodeRepo}_${uniqueId}.md`;

/**
 * Panel PDF di halaman detail: daftar versi, dan penanda bila ada hasil yang diimpor atau catatan keputusan
 * yang lebih baru daripada versi terakhir (atau belum ada PDF sama sekali). Menambah poin tanpa hasil tidak dihitung.
 */
function bangunPanelPdf({ versiPdf, putaranRepo, catatan }) {
  const waktu = [...putaranRepo.map((r) => r.diimpor_pada), ...catatan.map((c) => c.updated_at)].filter(Boolean).sort();
  const terbaru = waktu[waktu.length - 1] ?? null;
  const terakhir = versiPdf[0] ?? null;
  return {
    versi: versiPdf.map((v) => ({ id: v.id, versi: v.versi, putaran_tercakup: v.putaran_tercakup, created_at: v.created_at, ringkasan_status: v.ringkasan_status })),
    // tanggal berformat YYYY-MM-DD HH:MM:SS, jadi perbandingan teks sama dengan perbandingan waktu
    belum_memuat_terbaru: Boolean(terbaru) && (!terakhir || terbaru > terakhir.created_at),
  };
}

/** Usecase pengujian (Uji CR): merakit poin, target, putaran, dan prompt per repo, serta menyajikannya. */
export function buatPengujianUsecase({ pengujianModel, promptModel, perakitUji, pengujiUlang, penerimaHasil, pembuatPdf, penyimpananFile, db }) {
  /** Menyimpan pengujian, poin, target, putaran 1, dan prompt per repo dalam satu transaksi. */
  function simpan({ input, poin, uniqueId, prompts }) {
    return db.transaction(async (conn) => {
      const pengujianId = await pengujianModel.buat({ cr_id: input.cr_id, blueprint_mentah: input.blueprint_mentah }, conn);
      const idPoin = await perakitUji.simpanPoin(pengujianId, poin, PUTARAN_AWAL, conn);
      const putaranId = await pengujianModel.buatPutaran({ pengujian_id: pengujianId, nomor: PUTARAN_AWAL, unique_id: uniqueId }, conn);
      for (const prompt of prompts) await perakitUji.simpanPromptRepo({ putaranId, uniqueId, prompt, idPoin }, conn);
      return { id: pengujianId, unique_id: uniqueId };
    });
  }

  /** Status tiap poin per pengujian: Map pengujian_id -> Map poin_id -> status poin (dihitung, tidak disimpan). */
  function statusPoinPerPengujian(target, sel, skenario) {
    const selPoin = hitungSelPoin({ target, sel, skenario });
    const hasil = new Map();
    for (const t of target) {
      const daftar = hasil.get(t.pengujian_id) ?? new Map();
      daftar.set(t.poin_id, statusPoin(Object.values(selPoin.get(t.poin_id))));
      hasil.set(t.pengujian_id, daftar);
    }
    return hasil;
  }

  /** Data satu tab prompt (format sama dengan TabPrompt) untuk semua repo satu unique_id putaran. */
  async function ambilTabPrompt(uniqueId) {
    const sesi = await promptModel.sesiByUniqueId(uniqueId);
    return sesi
      .filter((s) => s.jenis === JENIS_SESI.PENGUJIAN)
      .map((s) => ({
        unique_id: s.unique_id,
        repo: { kode: s.repo_kode, nama: s.repo_nama },
        isi_prompt: s.isi_prompt,
        nama_file: namaFilePrompt(s.repo_kode, s.unique_id),
        href_unduh: `/api/v1/pengujian/unduh?unique_id=${s.unique_id}&repo=${encodeURIComponent(s.repo_kode)}`,
      }));
  }

  /** Pengingat tools per repo yang terlibat di sebuah putaran (acuan umum; agent yang memastikan saat eksekusi). */
  function pengingatTools(daftarRepo) {
    return daftarRepo.map((r) => ({
      repo_nama: r.repo_nama,
      platform: r.platform,
      tools: jenisUjiPlatform(r.platform).map((kunci) => ({ kunci, ...TOOLS_UJI[kunci] })),
    }));
  }

  return {
    /** Memecah teks blueprint menjadi poin memakai pemecah poin yang sudah ada. */
    pratinjauPoin({ teks }) {
      const poin = pecahPoin(teks);
      // teks tidak menghasilkan poin: minta user memperbaiki isi, jangan lanjut dengan daftar kosong
      if (poin.length === 0) throw new AppError('Tidak ada poin yang dapat dipecah dari teks ini.', 400);
      return { poin };
    },
    /** Pilihan target untuk form: modul (dengan nama repo) beserta menu-menunya. */
    async opsiTarget() {
      const [modul, menu] = await Promise.all([pengujianModel.modulDenganRepo(), pengujianModel.semuaMenu()]);
      const menuPerModul = kelompokkan(menu, 'modul_id');
      return modul.map((m) => ({
        id: m.id,
        nama: m.nama,
        repo_nama: m.repo_nama,
        menu: (menuPerModul.get(m.id) ?? []).map((x) => ({ id: x.id, nama: x.nama })),
      }));
    },
    /** Membuat Uji CR baru beserta putaran 1 dan satu prompt per repo yang terlibat. */
    async buat(input) {
      // CR ID harus unik; collation database tidak membedakan huruf besar/kecil
      if (await pengujianModel.byCrId(input.cr_id)) throw new AppError(`Uji CR ${input.cr_id} sudah ada.`, 409);
      const poin = await perakitUji.siapkanPoin(input.poin);
      const uniqueId = await perakitUji.unikId();
      const grup = [...kelompokPerRepo(poin).values()];
      // di prompt, nomor tampil dengan awalan seperti pesan commit (mis. CR202502030002)
      const crLabel = await perakitUji.labelCr(input.cr_id);
      const prompts = await Promise.all(grup.map((g) => perakitUji.susunPrompt({ crId: crLabel, uniqueId, putaran: PUTARAN_AWAL, grup: g })));
      return simpan({ input, poin, uniqueId, prompts });
    },
    /** Daftar Uji CR beserta jumlah poin, hitungan status poin, dan putaran terakhir. */
    async daftar() {
      const [baris, target, sel, skenario] = await Promise.all([
        pengujianModel.daftar(100),
        pengujianModel.targetRepo(),
        pengujianModel.selPutaran(),
        pengujianModel.statusSkenario(),
      ]);
      const status = statusPoinPerPengujian(target, sel, skenario);
      return baris.map((b) => ({
        id: b.id,
        cr_id: b.cr_id,
        created_at: b.created_at,
        // COUNT/MAX dari mysql2 bisa berupa string (bigNumberStrings)
        jumlah_poin: Number(b.jumlah_poin),
        putaran_terakhir: b.putaran_terakhir == null ? null : Number(b.putaran_terakhir),
        hitungan: ringkasHitungan([...(status.get(b.id)?.values() ?? [])]),
      }));
    },
    /**
     * Detail satu Uji CR: matriks poin x repo beserta status (dihitung), panel skenario per sel,
     * bagian di luar blueprint, riwayat putaran, prompt putaran terakhir, dan pengingat tools.
     */
    async detail(id) {
      const pengujian = await pengujianModel.byId(id);
      // id tidak dikenal: 404
      if (!pengujian) throw new AppError('Uji CR tidak ditemukan.', 404);
      const [poin, target, putaran, putaranRepo, targetRepo, sel, statusSk, skenario, perubahan, catatan, versiPdf] = await Promise.all([
        pengujianModel.poinByPengujian(id),
        pengujianModel.targetByPengujian(id),
        pengujianModel.putaranByPengujian(id),
        pengujianModel.putaranRepoByPengujian(id),
        pengujianModel.targetRepo(id),
        pengujianModel.selPutaran(id),
        pengujianModel.statusSkenario(id),
        pengujianModel.skenarioByPengujian(id),
        pengujianModel.perubahanByPengujian(id),
        pengujianModel.catatanByPengujian(id),
        pengujianModel.pdfByPengujian(id),
      ]);
      const selPoin = hitungSelPoin({ target: targetRepo, sel, skenario: statusSk });
      const baris = bangunBaris({ poin, target, selPoin });
      const repos = kolomRepo(target);
      const terakhir = putaran[putaran.length - 1] ?? null;
      return {
        id: pengujian.id,
        cr_id: pengujian.cr_id,
        created_at: pengujian.created_at,
        hitungan: ringkasHitungan(baris.map((p) => p.status)),
        repos,
        poin: baris,
        panel: bangunPanel({ targetRepo, sel, skenario, catatan }),
        luar: bangunLuarBlueprint({ skenario, perubahan, repoPeta: new Map(repos.map((r) => [r.id, r])) }),
        riwayat: bangunRiwayatPutaran({ putaran, putaranRepo }),
        pdf: bangunPanelPdf({ versiPdf, putaranRepo, catatan }),
        putaran_terakhir: terakhir,
        sesi: terakhir ? await ambilTabPrompt(terakhir.unique_id) : [],
        tools: pengingatTools(putaranRepo.filter((r) => r.putaran_id === terakhir?.id)),
      };
    },
    /** Membuat putaran uji ulang dari sel terpilih dan/atau poin baru. */
    ujiUlang: (input) => pengujiUlang.buat(input),
    /** Menyimpan catatan keputusan sebuah sel; teks kosong menghapusnya. Tidak mengubah status apa pun. */
    async simpanCatatan({ pengujian_id, poin_id, repo_id, catatan }) {
      const targetRepo = await pengujianModel.targetRepo(pengujian_id);
      // pasangan poin x repo bukan bagian Uji CR ini (id asing atau repo tidak terlibat)
      if (!targetRepo.some((t) => t.poin_id === poin_id && t.repo_id === repo_id)) throw new AppError('Sel tidak ditemukan pada Uji CR ini.', 404);
      // catatan dikosongkan: baris dihapus, bukan disimpan sebagai teks kosong
      if (catatan === '') await pengujianModel.hapusCatatan({ poin_id, repo_id });
      else await pengujianModel.upsertCatatan({ poin_id, repo_id, catatan });
      return { tersimpan: catatan !== '' };
    },
    /** Pratinjau impor hasil uji (tanpa menyimpan). */
    pratinjauHasil: (input) => penerimaHasil.pratinjau(input),
    /**
     * Menyimpan hasil uji dan berkas bukti; bila diminta, sekaligus membuat versi PDF baru.
     * Kegagalan membuat PDF tidak membatalkan hasil yang sudah tersimpan (dilaporkan di `pdf_gagal`).
     */
    async simpanHasil({ buat_pdf, ...input }) {
      const hasil = await penerimaHasil.simpan(input);
      if (!buat_pdf) return { ...hasil, pdf_versi: null, pdf_gagal: null };
      try {
        const pdf = await pembuatPdf.buat(input.pengujian_id);
        return { ...hasil, pdf_versi: pdf.versi, pdf_gagal: null };
      } catch (error) {
        // hasil uji sudah final di database; PDF bisa dibuat ulang lewat tombol "Buat versi baru"
        return { ...hasil, pdf_versi: null, pdf_gagal: error.message };
      }
    },
    /** Membuat versi PDF baru (kumulatif); versi lama tidak ditimpa. */
    buatPdf: ({ pengujian_id }) => pembuatPdf.buat(pengujian_id),
    /** Membaca berkas PDF satu versi untuk diunduh (bisa berulang tanpa generate ulang). */
    async ambilPdf({ id }) {
      const pdf = await pengujianModel.pdfById(id);
      // versi PDF tidak dikenal: 404
      if (!pdf) throw new AppError('PDF tidak ditemukan.', 404);
      try {
        return hasilBerkas(await penyimpananFile.baca(pdf.path_file), 'application/pdf', pdf.path_file.split('/').pop());
      } catch (error) {
        // tercatat di database tetapi berkasnya hilang dari disk
        if (error.code === 'ENOENT') throw new AppError('Berkas PDF tidak ada di penyimpanan.', 404);
        throw error;
      }
    },
    /** Membaca satu berkas bukti; nama harus tercatat pada skenarionya (path tidak pernah dari input mentah). */
    async ambilBukti({ skenario_id, nama }) {
      const skenario = await pengujianModel.skenarioUntukBukti(skenario_id);
      // skenario tidak ada atau nama tidak tercatat pada skenario itu: jangan bocorkan berkas lain
      if (!skenario || !bacaDaftarJson(skenario.bukti).includes(nama)) throw new AppError('Berkas bukti tidak ditemukan.', 404);
      const pathBukti = `pengujian/${skenario.pengujian_id}/p${skenario.putaran_nomor}/${skenario.repo_kode}/${nama}`;
      try {
        return hasilBerkas(await penyimpananFile.baca(pathBukti), MIME_BUKTI[nama.split('.').pop().toLowerCase()] ?? 'application/octet-stream');
      } catch (error) {
        // tercatat di database tetapi berkas sudah tidak ada di disk
        if (error.code === 'ENOENT') throw new AppError('Berkas bukti tidak ada di penyimpanan.', 404);
        throw error;
      }
    },
    /** Mengunduh prompt uji satu repo sebagai berkas .md. */
    async unduh({ unique_id, repo }) {
      const sesi = await promptModel.sesiByUniqueRepo(unique_id, repo);
      // sesi tidak ada, atau bukan sesi pengujian (jangan jadi jalan pintas membaca prompt jenis lain)
      if (!sesi || sesi.jenis !== JENIS_SESI.PENGUJIAN) throw new AppError('Prompt tidak ditemukan.', 404);
      return hasilBerkas(Buffer.from(sesi.isi_prompt, 'utf8'), 'text/markdown; charset=utf-8', namaFilePrompt(sesi.repo_kode, sesi.unique_id));
    },
  };
}
