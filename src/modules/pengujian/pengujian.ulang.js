import 'server-only';
import { AppError } from '@/utils/appError';
import { STATUS_UJI } from '@/enums';
import { formatBlokCommitLanjutan, formatBlokPutaranLanjutan } from './pengujian.dokumen';
import { bangunPanel, kunciPanel } from './pengujian.matriks';
import { kelompokPerRepo } from './pengujian.perakit';

/** Poin yang sudah ada dengan target yang dilengkapi info repo (bentuk sama dengan poin baru dari perakit). */
function poinDenganTarget(poin, target) {
  return poin.map((p) => ({
    id: p.id,
    nomor: p.nomor,
    isi: p.isi,
    target: target
      .filter((t) => t.poin_id === p.id)
      .map((t) => ({
        modul_id: t.modul_id,
        menu_id: t.menu_id,
        modul_nama: t.modul_nama,
        menu_nama: t.menu_nama,
        repo_id: t.repo_id,
        repo: { id: t.repo_id, kode: t.repo_kode, nama: t.repo_nama, platform: t.platform, branch_utama: t.branch_utama },
      })),
  }));
}

/** Hash HEAD dari putaran terbaru yang sudah diimpor untuk repo ini; null bila belum pernah ada. */
function hashSebelumnya(putaran, putaranRepo, repoId) {
  const nomor = new Map(putaran.map((u) => [u.id, Number(u.nomor)]));
  const diimpor = putaranRepo.filter((r) => r.repo_id === repoId && r.hash_head);
  diimpor.sort((a, b) => nomor.get(b.putaran_id) - nomor.get(a.putaran_id));
  return diimpor[0]?.hash_head ?? null;
}

/**
 * Uji ulang: membuat putaran N+1 dari sel (poin x repo) terpilih dan/atau poin baru, lalu satu prompt per
 * repo yang punya sel terpilih. Prompt memuat hasil putaran sebelumnya dan hanya commit sejak HEAD terakhir.
 */
export function buatPengujiUlang({ pengujianModel, perakitUji, db }) {
  /** Memuat semua data pengujian yang dibutuhkan untuk menyusun uji ulang. */
  async function muatData(id) {
    const [poin, target, putaran, putaranRepo, targetRepo, sel, skenario] = await Promise.all([
      pengujianModel.poinByPengujian(id),
      pengujianModel.targetByPengujian(id),
      pengujianModel.putaranByPengujian(id),
      pengujianModel.putaranRepoByPengujian(id),
      pengujianModel.targetRepo(id),
      pengujianModel.selPutaran(id),
      pengujianModel.skenarioByPengujian(id),
    ]);
    return { poin: poinDenganTarget(poin, target), putaran, putaranRepo, targetRepo, sel, panel: bangunPanel({ targetRepo, sel, skenario }) };
  }

  /** Memastikan setiap sel terpilih benar-benar sel yang terlibat pada pengujian ini; membuang duplikat. */
  function validasiSel(sel, targetRepo) {
    const sah = new Set(targetRepo.map((t) => kunciPanel(t.poin_id, t.repo_id)));
    const unik = new Map(sel.map((s) => [kunciPanel(s.poin_id, s.repo_id), s]));
    // sel yang tidak ada pada matriks (poin/repo tidak terlibat atau milik pengujian lain)
    if ([...unik.keys()].some((k) => !sah.has(k))) throw new AppError('Ada sel terpilih yang tidak termasuk Uji CR ini.', 400);
    return [...unik.values()];
  }

  /** Mengelompokkan sel terpilih dan poin baru per repo: Map repo_id -> { repo, poin }. */
  function susunGrup({ selDipilih, data, poinBaru }) {
    const grup = new Map();
    const tambah = (repo, poin) => grup.set(repo.id, { repo, poin: [...(grup.get(repo.id)?.poin ?? []), poin] });
    for (const s of selDipilih) {
      const poin = data.poin.find((p) => p.id === s.poin_id);
      const targetRepo = poin.target.filter((t) => t.repo_id === s.repo_id);
      tambah(targetRepo[0].repo, { ...poin, target: targetRepo });
    }
    for (const [, g] of kelompokPerRepo(poinBaru)) for (const p of g.poin) tambah(g.repo, p);
    return grup;
  }

  /** Blok commit dan blok putaran lanjutan khusus satu repo (hasil sebelumnya + HEAD terakhir). */
  function lanjutanRepo({ g, crId, nomorBaru, data, nomorPoinBaru }) {
    const hash = hashSebelumnya(data.putaran, data.putaranRepo, g.repo.id);
    const sel = g.poin.map((p) => {
      const panel = data.panel[kunciPanel(p.id, g.repo.id)];
      const baru = nomorPoinBaru.has(p.nomor);
      return {
        poin_nomor: p.nomor,
        baru,
        status: panel?.riwayat[panel.riwayat.length - 1]?.status ?? STATUS_UJI.BELUM,
        skenario: baru ? [] : (panel?.skenario ?? []),
      };
    });
    return {
      blokCommit: hash ? formatBlokCommitLanjutan(crId, g.repo.branch_utama, hash) : undefined,
      blokLanjutan: formatBlokPutaranLanjutan({ nomor: nomorBaru, hashSebelumnya: hash, sel }),
    };
  }

  /** Menyimpan putaran baru, poin baru (bila ada), dan prompt per repo dalam satu transaksi. */
  function simpan({ pengujianId, nomorBaru, uniqueId, poinBaru, data, prompts }) {
    return db.transaction(async (conn) => {
      const putaranId = await pengujianModel.buatPutaran({ pengujian_id: pengujianId, nomor: nomorBaru, unique_id: uniqueId }, conn);
      const idPoin = new Map(data.poin.map((p) => [p.nomor, p.id]));
      const idBaru = await perakitUji.simpanPoin(pengujianId, poinBaru, nomorBaru, conn);
      for (const [nomor, id] of idBaru) idPoin.set(nomor, id);
      for (const prompt of prompts) await perakitUji.simpanPromptRepo({ putaranId, uniqueId, prompt, idPoin }, conn);
      return { id: pengujianId, unique_id: uniqueId, putaran: nomorBaru };
    });
  }

  return {
    /** Membuat putaran uji ulang dari sel terpilih dan poin baru. */
    async buat({ pengujian_id, sel, poin_baru }) {
      const pengujian = await pengujianModel.byId(pengujian_id);
      // id Uji CR tidak dikenal: 404
      if (!pengujian) throw new AppError('Uji CR tidak ditemukan.', 404);
      const data = await muatData(pengujian_id);
      const selDipilih = validasiSel(sel, data.targetRepo);
      const nomorAwalBaru = Math.max(0, ...data.poin.map((p) => Number(p.nomor))) + 1;
      const poinBaru = await perakitUji.siapkanPoin(poin_baru, nomorAwalBaru);
      const grup = [...susunGrup({ selDipilih, data, poinBaru }).values()];
      // tidak ada sel terpilih maupun poin baru: tidak ada yang diuji
      if (grup.length === 0) throw new AppError('Pilih minimal satu sel atau tambahkan poin baru.', 400);
      const nomorBaru = Math.max(...data.putaran.map((u) => Number(u.nomor))) + 1;
      const nomorPoinBaru = new Set(poinBaru.map((p) => p.nomor));
      const uniqueId = await perakitUji.unikId();
      // di prompt, nomor tampil dengan awalan seperti pesan commit (mis. CR202502030002)
      const crId = await perakitUji.labelCr(pengujian.cr_id);
      const prompts = await Promise.all(
        grup.map((g) => perakitUji.susunPrompt({ crId, uniqueId, putaran: nomorBaru, grup: { ...g, ...lanjutanRepo({ g, crId, nomorBaru, data, nomorPoinBaru }) } })),
      );
      return simpan({ pengujianId: pengujian_id, nomorBaru, uniqueId, poinBaru, data, prompts });
    },
  };
}
