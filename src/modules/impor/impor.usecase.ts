import 'server-only';
import { AppError } from '@/utils/appError';
import { validasi } from '@/utils/validasi';
import { dokumenAgenSchema } from './impor.schema';
import { susunInfoRepo } from './impor.teknologi';

/** Membuang pembungkus ```json ... ``` bila user menyalin JSON dari chat agen. */
function bersihkanJson(teks) {
  const hasil = teks.trim();
  const pagar = hasil.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return pagar ? pagar[1] : hasil;
}

/** Mengurai teks JSON menjadi objek; error ditampilkan dengan pesan yang jelas. */
function uraiJson(teks) {
  try {
    return JSON.parse(bersihkanJson(teks));
  } catch (error) {
    // JSON rusak: sertakan pesan parser agar user tahu letak masalah, teks tetap bisa dirapikan di kolom
    throw new AppError(`JSON tidak valid: ${error.message}`, 400);
  }
}

/** Usecase impor: validasi JSON agen terhadap sesi, simpan impor_hasil, dan sajikan rencana review. */
export function buatImporUsecase({ imporModel, promptModel, repoModel, penyusunRencana, penerapRencana, db }) {
  /** Memastikan dokumen cocok dengan sesi prompt (unique_id, repo, jenis, nomor perubahan). Mengembalikan sesi. */
  async function cocokkanSesi(dok) {
    const sesi = await promptModel.sesiByUniqueRepo(dok.unique_id, dok.repo);
    if (!sesi) {
      const lain = await promptModel.sesiByUniqueId(dok.unique_id);
      // unique_id dikenal tetapi untuk repo lain: beri tahu repo yang benar
      if (lain.length > 0) {
        throw new AppError(`unique_id ${dok.unique_id} tidak dibuat untuk repo "${dok.repo}". Repo pada sesi ini: ${lain.map((s) => s.repo_kode).join(', ')}.`, 400);
      }
      throw new AppError(`unique_id ${dok.unique_id} tidak dikenal. Pastikan JSON berasal dari prompt yang dibuat di DK Docs.`, 400);
    }
    if (sesi.jenis !== dok.jenis) throw new AppError(`Jenis JSON "${dok.jenis}" tidak sama dengan jenis sesi "${sesi.jenis}".`, 400);
    // sesi sudah final: mengimpor lagi akan menimpa dokumentasi tanpa sepengetahuan reviewer
    if (sesi.status === 'disimpan') throw new AppError('Sesi ini sudah disimpan. Buat prompt baru untuk perubahan berikutnya.', 409);
    // usulan perubahan harus untuk nomor CR/B yang sama dengan sesinya
    if (sesi.jenis === 'usulan_perubahan' && String(sesi.perubahan_nomor).toLowerCase() !== String(dok.perubahan).toLowerCase()) {
      throw new AppError(`Nomor perubahan pada JSON (${dok.perubahan}) berbeda dengan sesi (${sesi.perubahan_nomor}).`, 400);
    }
    return sesi;
  }

  /** Daftar pilihan "tautkan ke yang sudah ada" untuk tiga tingkat dalam satu repo. */
  async function opsiTautan(repoId) {
    const [modul, menu, halaman] = await Promise.all([promptModel.modulRepo(repoId), promptModel.menuRepo(repoId), promptModel.halamanRepo(repoId)]);
    const namaModul = new Map<string, string>(modul.map((m) => [m.id, m.nama]));
    const menuMap = new Map<string, { nama: string }>(menu.map((m) => [m.id, m]));
    return {
      modul: modul.map((m) => ({ id: m.id, label: m.nama })),
      menu: menu.map((m) => ({ id: m.id, label: `${namaModul.get(m.modul_id)} / ${m.nama}` })),
      halaman: halaman.map((h) => ({ id: h.id, label: `${menuMap.get(h.menu_id)?.nama ?? '?'} / ${h.nama}` })),
    };
  }

  return {
    /** Memvalidasi JSON mentah, mencocokkan sesi, lalu menyimpannya sebagai impor_hasil (menunggu review). */
    async buat({ json }) {
      const dok = validasi(dokumenAgenSchema, uraiJson(json));
      const sesi = await cocokkanSesi(dok);
      const id = await db.transaction(async (conn) => {
        const imporId = await imporModel.buat(sesi.id, json, conn);
        // sesi baru berstatus "dibuat": tandai sudah ada hasil yang diimpor
        if (sesi.status === 'dibuat') await imporModel.ubahStatusSesi(sesi.id, 'diimpor', conn);
        return imporId;
      });
      return { impor_id: id };
    },
    /** Data halaman review: info impor, ringkasan dokumen, dan rencana (hanya bila masih menunggu review). */
    async detail(id) {
      const impor = await imporModel.byId(id);
      // id tidak dikenal: 404
      if (!impor) throw new AppError('Impor tidak ditemukan.', 404);
      const dok = validasi(dokumenAgenSchema, uraiJson(impor.json_mentah));
      const menunggu = impor.status === 'menunggu_review';
      return {
        impor: {
          id: impor.id,
          status: impor.status,
          unique_id: impor.unique_id,
          jenis: impor.jenis,
          repo: { id: impor.repo_id, kode: impor.repo_kode, nama: impor.repo_nama },
          perubahan: impor.perubahan_id ? { id: impor.perubahan_id, tipe: impor.perubahan_tipe, nomor: impor.perubahan_nomor } : null,
          hash_terakhir_diaudit: dok.hash_terakhir_diaudit,
          selisih_dokumentasi: dok.selisih_dokumentasi,
          created_at: impor.created_at,
        },
        rencana: menunggu ? await penyusunRencana.susun(dok, impor.repo_id) : [],
        // blok "Info repo": teknologi baru/berubah dibanding yang tercatat (kosong bila agent tidak mengisinya)
        info_repo: menunggu && dok.teknologi.length > 0 ? susunInfoRepo(dok.teknologi, await repoModel.teknologiByRepo(impor.repo_id)) : [],
        opsi_tautan: menunggu ? await opsiTautan(impor.repo_id) : { modul: [], menu: [], halaman: [] },
      };
    },
    /** Impor terbaru, opsional difilter per unique_id. */
    daftar: (uniqueId) => imporModel.daftar(uniqueId ?? null, 30),
    /** Membatalkan impor yang masih menunggu review. */
    async batalkan(id) {
      const impor = await imporModel.byId(id);
      if (!impor) throw new AppError('Impor tidak ditemukan.', 404);
      // hanya impor yang menunggu review yang bisa dibatalkan (yang sudah disimpan bersifat final)
      if (impor.status !== 'menunggu_review') throw new AppError('Impor ini sudah diproses.', 409);
      await imporModel.ubahStatus(id, 'dibatalkan');
      return { id };
    },
    /** Menyimpan hasil review: validasi sesi lagi, lalu terapkan rencana secara transaksional. */
    async simpan({ impor_id, modul, teknologi_terpilih }) {
      const impor = await imporModel.byId(impor_id);
      if (!impor) throw new AppError('Impor tidak ditemukan.', 404);
      // hanya impor yang menunggu review yang boleh disimpan (cegah simpan ganda)
      if (impor.status !== 'menunggu_review') throw new AppError('Impor ini sudah diproses.', 409);
      if (impor.sesi_status === 'disimpan') throw new AppError('Sesi ini sudah disimpan oleh impor lain.', 409);
      const dok = validasi(dokumenAgenSchema, uraiJson(impor.json_mentah));
      return penerapRencana.terapkan({ impor, dok, modul, teknologiTerpilih: teknologi_terpilih ?? [] });
    },
  };
}
