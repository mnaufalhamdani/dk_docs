import 'server-only';
import { AppError } from '@/utils/appError';
import { buatUniqueId } from '@/utils/uniqueId';
import { renderTemplate } from '@/utils/templatePrompt';
import { kelompokkan } from '@/modules/prompt/prompt.dokumen';
import { JENIS_SESI } from '@/enums';
import { formatBlokCommit, formatDokumentasiReferensi, formatLabelCr, formatPoinDitugaskan, formatToolsPlatform, normalisasiCr } from './pengujian.dokumen';

/** Jumlah percobaan membuat unique_id baru bila bentrok. */
const MAKS_PERCOBAAN_ID = 8;

/**
 * Mengelompokkan poin per repo; satu poin lintas repo masuk ke tiap repo dengan target repo itu saja.
 * Hasil: Map repo_id -> { repo, poin: [{ nomor, isi, target }] }.
 */
export function kelompokPerRepo(poin) {
  const grup = new Map();
  for (const p of poin) {
    for (const [repoId, target] of kelompokkan(p.target, 'repo_id')) {
      const g = grup.get(repoId) ?? { repo: target[0].repo, poin: [] };
      g.poin.push({ ...p, target });
      grup.set(repoId, g);
    }
  }
  return grup;
}

/** Memvalidasi satu target terhadap registry, membuang duplikat, dan melengkapinya dengan info repo. */
function rapikanTarget(target, modulPeta, menuPeta) {
  const unik = new Map();
  for (const t of target) {
    const modul = modulPeta.get(t.modul_id);
    // modul tidak ada di registry: input salah atau registry berubah
    if (!modul) throw new AppError('Modul target tidak ditemukan.', 400);
    const menu = t.menu_id ? menuPeta.get(t.menu_id) : null;
    // menu harus ada dan benar-benar milik modul yang dipilih
    if (t.menu_id && (!menu || menu.modul_id !== t.modul_id)) throw new AppError('Menu target tidak sesuai dengan modulnya.', 400);
    unik.set(`${t.modul_id}:${t.menu_id ?? 0}`, {
      modul_id: t.modul_id,
      menu_id: t.menu_id ?? null,
      modul_nama: modul.nama,
      menu_nama: menu?.nama ?? null,
      repo_id: modul.repo_id,
      repo: { id: modul.repo_id, kode: modul.repo_kode, nama: modul.repo_nama, platform: modul.platform, branch_utama: modul.branch_utama },
    });
  }
  return [...unik.values()];
}

/**
 * Perakit uji: bagian yang dipakai bersama pembuatan Uji CR baru (putaran 1) dan uji ulang (putaran N+1),
 * yaitu unique_id, penyiapan poin/target, perakitan prompt per repo, dan penyimpanan poin serta sesi prompt.
 */
export function buatPerakitUji({ pengujianModel, promptModel }) {
  return {
    /** Label CR untuk prompt (mis. "CR202502030002"): awalan tipe mengikuti data Sync lokal, bawaan "CR". */
    async labelCr(nomor) {
      return formatLabelCr(nomor, await pengujianModel.tipePerubahan(normalisasiCr(nomor)));
    },

    /** Membuat unique_id yang belum dipakai sesi prompt maupun putaran pengujian mana pun. */
    async unikId() {
      for (let i = 0; i < MAKS_PERCOBAAN_ID; i += 1) {
        const kandidat = buatUniqueId();
        const dipakai = (await promptModel.uniqueIdAda(kandidat)) || (await pengujianModel.uniqueIdPutaranAda(kandidat));
        // id bebas: pakai; kalau bentrok, coba lagi
        if (!dipakai) return kandidat;
      }
      throw new AppError('Gagal membuat unique_id, coba lagi.', 500);
    },

    /** Memberi nomor urut (mulai `nomorAwal`) pada poin input dan memvalidasi targetnya terhadap registry. */
    async siapkanPoin(poinInput, nomorAwal = 1) {
      const modulIds = [...new Set(poinInput.flatMap((p) => p.target.map((t) => t.modul_id)))];
      const menuIds = [...new Set(poinInput.flatMap((p) => p.target.map((t) => t.menu_id).filter(Boolean)))];
      const [modulRows, menuRows] = await Promise.all([pengujianModel.modulBerepo(modulIds), pengujianModel.menuByIds(menuIds)]);
      const modulPeta = new Map(modulRows.map((m) => [m.id, m]));
      const menuPeta = new Map(menuRows.map((m) => [m.id, m]));
      return poinInput.map((p, i) => ({ nomor: nomorAwal + i, isi: p.isi, target: rapikanTarget(p.target, modulPeta, menuPeta) }));
    },

    /**
     * Merender prompt uji (template E) untuk satu repo; hanya memuat poin yang menyangkut repo itu.
     * `grup.blokCommit` dan `grup.blokLanjutan` (opsional) mengisi bagian khusus uji ulang.
     */
    async susunPrompt({ crId, uniqueId, putaran, grup }) {
      const { repo } = grup;
      const target = grup.poin.flatMap((p) => p.target);
      const modulIds = [...new Set(target.map((t) => t.modul_id))];
      // poin dokumentasi hanya dibutuhkan untuk modul yang menunjuk menu tertentu
      const modulBermenu = [...new Set(target.filter((t) => t.menu_id).map((t) => t.modul_id))];
      const [modul, menu, halaman, poin] = await Promise.all([
        promptModel.modulRepo(repo.id),
        promptModel.menuRepo(repo.id),
        promptModel.halamanRepo(repo.id),
        promptModel.poinByModulIds(modulBermenu),
      ]);
      const isi = await renderTemplate('uji_cr', {
        cr_id: crId,
        putaran: String(putaran),
        unique_id: uniqueId,
        kode_repo: repo.kode,
        branch: repo.branch_utama,
        platform: repo.platform,
        tools_platform: formatToolsPlatform(repo.platform),
        // putaran pertama mengambil semua commit ber-CR ID dan belum punya hasil sebelumnya
        blok_commit: grup.blokCommit ?? formatBlokCommit(crId, repo.branch_utama),
        poin_ditugaskan: formatPoinDitugaskan(grup.poin),
        dokumentasi_referensi: formatDokumentasiReferensi({ modul, menu, halaman, poin }, target),
        blok_putaran_lanjutan: grup.blokLanjutan ?? '',
      });
      return { repo, isi, modulIds, poin: grup.poin };
    },

    /** Menyimpan poin beserta targetnya; mengembalikan peta nomor poin -> id poin. */
    async simpanPoin(pengujianId, poin, ditambahPutaran, conn) {
      const idPoin = new Map();
      for (const p of poin) {
        const id = await pengujianModel.buatPoin({ pengujian_id: pengujianId, nomor: p.nomor, isi: p.isi, ditambah_putaran: ditambahPutaran }, conn);
        idPoin.set(p.nomor, id);
        for (const t of p.target) await pengujianModel.buatTarget({ pengujian_poin_id: id, modul_id: t.modul_id, menu_id: t.menu_id }, conn);
      }
      return idPoin;
    },

    /** Menyimpan sesi prompt, data putaran-repo, dan sel (poin x repo) untuk satu repo. */
    async simpanPromptRepo({ putaranId, uniqueId, prompt, idPoin }, conn) {
      const sesiId = await promptModel.buatSesi({ unique_id: uniqueId, repo_id: prompt.repo.id, jenis: JENIS_SESI.PENGUJIAN, perubahan_id: null, isi_prompt: prompt.isi }, conn);
      for (const modulId of prompt.modulIds) await promptModel.tambahModulSesi(sesiId, modulId, conn);
      await pengujianModel.buatPutaranRepo({ pengujian_putaran_id: putaranId, repo_id: prompt.repo.id, sesi_prompt_id: sesiId }, conn);
      for (const p of prompt.poin) {
        await pengujianModel.buatPutaranSel({ pengujian_putaran_id: putaranId, pengujian_poin_id: idPoin.get(p.nomor), repo_id: prompt.repo.id }, conn);
      }
    },
  };
}
