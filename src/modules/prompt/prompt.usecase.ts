import 'server-only';
import { AppError } from '@/utils/appError';
import { hasilBerkas } from '@/utils/responseHandler';
import { buatUniqueId } from '@/utils/uniqueId';
import { renderTemplate } from '@/utils/templatePrompt';
import { JENIS_SESI } from '@/enums';
import { formatDokumentasi, formatDaftarRingkas, formatPesan, formatModulTarget, formatTeknologi } from './prompt.dokumen';

/** Jumlah percobaan membuat unique_id baru bila bentrok. */
const MAKS_PERCOBAAN_ID = 8;

/** Usecase prompt: membuat sesi dan isi prompt A/B/C per repo, serta menyajikannya untuk salin/unduh. */
export function buatPromptUsecase({ promptModel, repoModel, modulModel, perubahanModel, referensiUji, db }) {
  /** Mengambil repo atau melempar 404. */
  async function repoWajibAda(id) {
    const repo = await repoModel.byId(id);
    // id repo tidak dikenal: hentikan lebih awal
    if (!repo) throw new AppError('Repo tidak ditemukan.', 404);
    return repo;
  }

  /** Membuat unique_id yang belum dipakai sesi mana pun. */
  async function unikId() {
    for (let i = 0; i < MAKS_PERCOBAAN_ID; i += 1) {
      const kandidat = buatUniqueId();
      // id bebas: pakai; kalau bentrok, coba lagi
      if (!(await promptModel.uniqueIdAda(kandidat))) return kandidat;
    }
    throw new AppError('Gagal membuat unique_id, coba lagi.', 500);
  }

  /** Memuat seluruh registry repo (modul, menu, halaman) beserta poin untuk modul yang ditampilkan lengkap. */
  async function muatData(repoId, modulIdsLengkap) {
    const [modul, menu, halaman, poinPolos, tautan] = await Promise.all([
      promptModel.modulRepo(repoId),
      promptModel.menuRepo(repoId),
      promptModel.halamanRepo(repoId),
      promptModel.poinByModulIds(modulIdsLengkap),
      promptModel.tautanByModulIds(modulIdsLengkap),
    ]);
    // tiap poin membawa id dan tautan CR/B-nya agar agen bisa merujuk dan mengenali penanda [PENDING]
    const poin = poinPolos.map((p) => ({ ...p, tautan: tautan.filter((x) => String(x.poin_id) === String(p.id)) }));
    return { modul, menu, halaman, poin };
  }

  /** Menyimpan satu sesi per repo dalam satu transaksi, semuanya memakai unique_id yang sama. */
  async function simpanSesi(uniqueId, daftar, jenis, perubahanId = null) {
    await db.transaction(async (conn) => {
      for (const item of daftar) {
        const sesiId = await promptModel.buatSesi({ unique_id: uniqueId, repo_id: item.repo.id, jenis, perubahan_id: perubahanId, isi_prompt: item.isi }, conn);
        for (const modulId of item.modulIds) await promptModel.tambahModulSesi(sesiId, modulId, conn);
      }
    });
    return { unique_id: uniqueId };
  }

  /** Merender prompt A (usulan perubahan) untuk satu repo. */
  async function promptUsulan({ repo, uniqueId, perubahan, pesan, peta }) {
    const modulIds = [...new Set(peta.filter((p) => p.repo_id === repo.id).map((p) => p.modul_id))];
    const pesanRepo = pesan.filter((p) => peta.some((x) => x.pesan_id === p.id && x.repo_id === repo.id));
    const data = await muatData(repo.id, modulIds);
    const isi = await renderTemplate('usulan_perubahan', {
      unique_id: uniqueId,
      kode_repo: repo.kode,
      branch: repo.branch_utama,
      nomor_perubahan: perubahan.nomor,
      // repo ditambah manual (tanpa pesan terpetakan): beri semua pesan agar konteks tetap ada
      daftar_pesan_pengerjaan: formatPesan(pesanRepo.length ? pesanRepo : pesan),
      dokumentasi_terkait: formatDokumentasi(data, modulIds),
      daftar_ringkas: formatDaftarRingkas(data, modulIds),
      // hasil Uji CR untuk CR yang sama (kosong bila tidak ada pengujian, sehingga prompt tidak berubah)
      hasil_uji_cr: await referensiUji.ringkasan({ nomor: perubahan.nomor, tipe: perubahan.tipe, repoId: repo.id }),
      teknologi_tercatat: formatTeknologi(await repoModel.teknologiByRepo(repo.id)),
    });
    return { repo, isi, modulIds };
  }

  /** Catatan tambahan prompt audit bila repo belum pernah diaudit. */
  function catatanAudit(repo) {
    // sudah ada hash atau tanggal acuan: tidak perlu catatan
    if (repo.hash_audit_terakhir || repo.tanggal_audit_terakhir) return '';
    return `Repo ini belum pernah diaudit (tidak ada hash/tanggal acuan). Mulai dari 30 hari terakhir: git log ${repo.branch_utama} --since="30 days ago" --format="%H %s"`;
  }

  return {
    /** Sesi usulan perubahan: satu prompt per repo terpilih dengan unique_id yang sama. */
    async buatSesiUsulan({ perubahan_id, repo_ids }) {
      const perubahan = await perubahanModel.byId(perubahan_id);
      // perubahan tidak ada: hentikan
      if (!perubahan) throw new AppError('Perubahan tidak ditemukan.', 404);
      const [pesan, peta] = await Promise.all([perubahanModel.pesanByPerubahan(perubahan_id), perubahanModel.petaByPerubahan(perubahan_id)]);
      const repos = await Promise.all(repo_ids.map(repoWajibAda));
      const uniqueId = await unikId();
      const daftar = await Promise.all(repos.map((repo) => promptUsulan({ repo, uniqueId, perubahan, pesan, peta })));
      return simpanSesi(uniqueId, daftar, JENIS_SESI.USULAN_PERUBAHAN, perubahan_id);
    },
    /** Sesi dokumentasi baru: prompt B untuk 1-5 modul dari satu repo. */
    async buatSesiDokumentasiBaru({ repo_id, modul_ids }) {
      const repo = await repoWajibAda(repo_id);
      const data = await muatData(repo.id, []);
      // semua modul pilihan harus milik repo ini
      if (!modul_ids.every((id) => data.modul.some((m) => m.id === id))) throw new AppError('Modul harus berasal dari repo yang sama.', 400);
      const alias = await promptModel.aliasModul(modul_ids);
      const uniqueId = await unikId();
      const isi = await renderTemplate('dokumentasi_baru', {
        unique_id: uniqueId,
        kode_repo: repo.kode,
        branch: repo.branch_utama,
        daftar_modul_target: formatModulTarget(data, modul_ids, alias),
        daftar_ringkas: formatDaftarRingkas(data, modul_ids),
        teknologi_tercatat: formatTeknologi(await repoModel.teknologiByRepo(repo.id)),
      });
      return simpanSesi(uniqueId, [{ repo, isi, modulIds: modul_ids }], JENIS_SESI.DOKUMENTASI_BARU);
    },
    /** Sesi sinkron modul: prompt untuk menyamakan dokumentasi satu modul dengan kode saat ini. */
    async buatSesiSinkron({ modul_id }) {
      const modul = await modulModel.byId(modul_id);
      // modul tidak dikenal: hentikan
      if (!modul) throw new AppError('Modul tidak ditemukan.', 404);
      const repo = await repoWajibAda(modul.repo_id);
      const data = await muatData(repo.id, [modul.id]);
      const alias = await promptModel.aliasModul([modul.id]);
      const uniqueId = await unikId();
      const isi = await renderTemplate('sinkron_modul', {
        unique_id: uniqueId,
        kode_repo: repo.kode,
        branch: repo.branch_utama,
        daftar_modul_target: formatModulTarget(data, [modul.id], alias),
        dokumentasi_terkait: formatDokumentasi(data, [modul.id]),
        daftar_ringkas: formatDaftarRingkas(data, [modul.id]),
        teknologi_tercatat: formatTeknologi(await repoModel.teknologiByRepo(repo.id)),
      });
      return simpanSesi(uniqueId, [{ repo, isi, modulIds: [modul.id] }], JENIS_SESI.SINKRON_MODUL);
    },
    /** Sesi audit bugfix: prompt C untuk satu repo (memakai hash/tanggal audit terakhir). */
    async buatSesiAudit({ repo_id }) {
      const repo = await repoWajibAda(repo_id);
      const semuaModul = await promptModel.modulRepo(repo.id);
      // dokumentasi lengkap hanya untuk modul yang sudah terdokumentasi; sisanya cukup daftar ringkas
      const terdokumentasi = semuaModul.filter((m) => !m.is_stub).map((m) => m.id);
      const data = await muatData(repo.id, terdokumentasi);
      const uniqueId = await unikId();
      const isi = await renderTemplate('audit_bugfix', {
        unique_id: uniqueId,
        kode_repo: repo.kode,
        branch: repo.branch_utama,
        hash_terakhir: repo.hash_audit_terakhir ?? 'BELUM_ADA',
        tanggal_terakhir: repo.tanggal_audit_terakhir ?? 'BELUM_ADA',
        catatan_audit: catatanAudit(repo),
        dokumentasi_terkait: formatDokumentasi(data, terdokumentasi),
        daftar_ringkas: formatDaftarRingkas(data, terdokumentasi),
      });
      return simpanSesi(uniqueId, [{ repo, isi, modulIds: [] }], JENIS_SESI.AUDIT_BUGFIX);
    },
    /** Semua prompt (satu per repo) milik satu unique_id. */
    async ambilSesi(uniqueId) {
      const sesi = await promptModel.sesiByUniqueId(uniqueId);
      // unique_id tidak dikenal: 404
      if (sesi.length === 0) throw new AppError('Sesi prompt tidak ditemukan.', 404);
      return sesi.map((s) => ({
        id: s.id,
        unique_id: s.unique_id,
        jenis: s.jenis,
        status: s.status,
        repo: { kode: s.repo_kode, nama: s.repo_nama },
        perubahan: s.perubahan_nomor ? { tipe: s.perubahan_tipe, nomor: s.perubahan_nomor, id: s.perubahan_id } : null,
        isi_prompt: s.isi_prompt,
        nama_file: `prompt_${s.repo_kode}_${s.unique_id}.md`,
        created_at: s.created_at,
      }));
    },
    /** Daftar sesi terbaru. */
    daftar: () => promptModel.daftarSesi(50),
    /** Mengunduh prompt satu repo sebagai berkas .md. */
    async unduh({ unique_id, repo }) {
      const sesi = await promptModel.sesiByUniqueRepo(unique_id, repo);
      // kombinasi unique_id + repo tidak ada: 404
      if (!sesi) throw new AppError('Prompt tidak ditemukan.', 404);
      return hasilBerkas(Buffer.from(sesi.isi_prompt, 'utf8'), 'text/markdown; charset=utf-8', `prompt_${sesi.repo_kode}_${sesi.unique_id}.md`);
    },
  };
}
