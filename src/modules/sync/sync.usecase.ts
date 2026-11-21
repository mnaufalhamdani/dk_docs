import 'server-only';
import { AppError } from '@/utils/appError';
import { JENIS_ALIAS } from '@/enums';
import { susunPeta } from './sync.pemetaan';

/** Usecase sync: mengambil pesan CR/B dari sumber, menyimpannya, dan memetakannya ke modul/menu. */
export function buatSyncUsecase({ syncModel, perubahanModel, modulModel, menuModel, modulUsecase, db }) {
  /** Kunci cache untuk pasangan nama mentah (modul, menu). */
  const kunciPasangan = (modul, menu) => `${modul ?? ''}\u0000${menu ?? ''}`;

  /**
   * Menghitung pemetaan untuk satu pasangan nama mentah lewat alias database.
   * `conn` dipakai agar alias yang baru ditambah dalam transaksi yang sama ikut terbaca.
   */
  async function hitungPeta(modulSumber, menuSumber, conn = null) {
    const modulCocok = modulSumber ? await perubahanModel.aliasModulCocok(modulSumber, conn) : [];
    const menuCocok = menuSumber ? await perubahanModel.aliasMenuCocok(menuSumber, conn) : [];
    return susunPeta(modulCocok, menuCocok);
  }

  /** Memetakan pesan-pesan yang belum punya pemetaan (otomatis lewat alias). Mengembalikan jumlah pesan terpetakan. */
  async function petakanOtomatis(filter, conn) {
    const pesan = await perubahanModel.pesanBelumDipetakan(filter, conn);
    const cache = new Map(); // satu perhitungan per pasangan nama mentah
    let terpetakan = 0;
    for (const p of pesan) {
      const kunci = kunciPasangan(p.modul_sumber, p.menu_sumber);
      if (!cache.has(kunci)) cache.set(kunci, await hitungPeta(p.modul_sumber, p.menu_sumber, conn));
      const peta = cache.get(kunci);
      // tidak ada alias yang cocok: biarkan "belum dipetakan"
      if (peta.length === 0) continue;
      for (const baris of peta) await perubahanModel.tambahPeta(p.id, baris.modul_id, baris.menu_id, conn);
      terpetakan += 1;
    }
    return terpetakan;
  }

  /** Mengubah pasangan pemetaan menjadi nama modul/repo/menu yang mudah dibaca untuk pratinjau. */
  async function namakanPeta(daftarPeta) {
    const modul = await perubahanModel.modulByIds([...new Set(daftarPeta.map((p) => p.modul_id))]);
    const menu = await perubahanModel.menuByIds([...new Set(daftarPeta.map((p) => p.menu_id).filter(Boolean))]);
    return daftarPeta.map((p) => {
      const m = modul.find((x) => x.id === p.modul_id);
      return { modul_nama: m?.nama ?? '-', repo_nama: m?.repo_nama ?? '-', menu_nama: menu.find((x) => x.id === p.menu_id)?.nama ?? null };
    });
  }

  /** Menyamakan teks pesan untuk perbandingan (beda spasi/baris baru dianggap sama). */
  const rapatkan = (teks) => String(teks ?? '').replace(/\s+/g, ' ').trim();

  /**
   * Mengambil pesan dari sumber untuk satu nomor. Hasil boleh kosong bila perubahannya sudah
   * tersimpan lokal (semua pesan bisa saja sudah dihapus di sumber); selain itu 404.
   */
  async function ambilDariSumber(tipe, nomor, perubahan) {
    const pesan = await syncModel.ambilPesanPerNomor(tipe, nomor);
    // nomor tidak punya pesan di sumber dan belum pernah disimpan: beri tahu user, jangan menyimpan perubahan kosong
    if (pesan.length === 0 && !perubahan) throw new AppError(`Nomor ${nomor} tidak ditemukan atau belum punya pesan pengerjaan di sumber (${tipe}).`, 404);
    return pesan;
  }

  /**
   * Membandingkan pesan sumber dengan yang tersimpan. Status tiap pesan sumber:
   * baru | diabaikan (pernah tidak dicentang) | sudah_ada | berubah (isi beda dengan yang tersimpan).
   * `hilang` = pesan tersimpan yang sudah tidak ada di sumber.
   */
  function bandingkan(sumber, lokal, diabaikan) {
    const lokalPerId = new Map<string, any>(lokal.map((l) => [String(l.sumber_id), l]));
    const idSumber = new Set(sumber.map((p) => String(p.sumber_id)));
    const pesan = sumber.map((p) => {
      const ada = lokalPerId.get(String(p.sumber_id));
      // belum tersimpan: baru, atau diabaikan bila sebelumnya sengaja tidak dicentang
      if (!ada) return { ...p, status: diabaikan.has(String(p.sumber_id)) ? 'diabaikan' : 'baru', pesan_lama: null, lokal_id: null };
      const sama = rapatkan(ada.pesan) === rapatkan(p.pesan);
      // sudah tersimpan: sama persis atau sudah diubah di sumber
      return { ...p, status: sama ? 'sudah_ada' : 'berubah', pesan_lama: sama ? null : ada.pesan, lokal_id: ada.id };
    });
    const hilang = lokal.filter((l) => !idSumber.has(String(l.sumber_id)));
    return { pesan, hilang };
  }

  /** Memuat sumber + data tersimpan lalu membandingkannya (dipakai pratinjau dan simpan). */
  async function muatPerbandingan(tipe, nomor, conn = null) {
    const perubahan = await perubahanModel.byTipeNomor(tipe, nomor, conn);
    const sumber = await ambilDariSumber(tipe, nomor, perubahan);
    const nomorSumber = sumber[0]?.nomor ?? perubahan.nomor;
    const perubahanSumber = perubahan ?? (await perubahanModel.byTipeNomor(tipe, nomorSumber, conn));
    const lokal = perubahanSumber ? await perubahanModel.pesanLokal(perubahanSumber.id, conn) : [];
    const diabaikan = perubahanSumber ? await perubahanModel.sumberIdDiabaikan(perubahanSumber.id, conn) : new Set();
    return { nomorSumber, perubahan: perubahanSumber, ...bandingkan(sumber, lokal, diabaikan) };
  }

  /** Menyimpan pesan baru yang dicentang; yang tidak dicentang dicatat sebagai diabaikan. Mengembalikan jumlah per jenis. */
  async function simpanBaru(perubahanId, pesan, pilih, conn) {
    const hasil = { baru: 0, diabaikan: 0 };
    const dicabut = [];
    for (const p of pesan) {
      // hanya pesan yang belum tersimpan yang diproses di sini
      if (p.status !== 'baru' && p.status !== 'diabaikan') continue;
      // tanpa daftar pilihan (pemanggil API lama): simpan semua yang baru, biarkan yang diabaikan tetap diabaikan
      const dipilih = pilih ? pilih.has(p.sumber_id) : p.status === 'baru';
      if (dipilih) {
        await perubahanModel.tambahPesan(perubahanId, p, conn);
        if (p.status === 'diabaikan') dicabut.push(p.sumber_id);
        hasil.baru += 1;
        continue;
      }
      // tidak dicentang: ingat agar sync berikutnya tidak mencentangnya lagi
      if (p.status === 'baru') await perubahanModel.tambahAbaikan(perubahanId, p.sumber_id, conn);
      hasil.diabaikan += 1;
    }
    await perubahanModel.hapusAbaikan(perubahanId, dicabut, conn);
    return hasil;
  }

  /** Memperbarui pesan tersimpan yang isinya berubah di sumber (hanya yang dipilih). Mengembalikan jumlahnya. */
  async function perbaruiPesan(pesan, lokal, pilih, conn) {
    const lokalPerId = new Map<string, any>(lokal.map((l) => [String(l.id), l]));
    let jumlah = 0;
    for (const p of pesan) {
      if (p.status !== 'berubah' || !pilih.has(p.sumber_id)) continue;
      const lama = lokalPerId.get(String(p.lokal_id));
      await perubahanModel.ubahPesan(p.lokal_id, p, conn);
      // nama modul/menu mentah berubah: pemetaan lama tidak berlaku lagi, dipetakan ulang otomatis
      if (lama && (lama.modul_sumber !== p.modul_sumber || lama.menu_sumber !== p.menu_sumber)) await perubahanModel.hapusPetaPesan(p.lokal_id, conn);
      jumlah += 1;
    }
    return jumlah;
  }

  /** Mengelompokkan pesan menurut pasangan nama mentah beserta hasil pemetaannya (untuk pratinjau). */
  async function ringkasPasangan(pesan) {
    const pasangan = new Map();
    for (const p of pesan) {
      const kunci = kunciPasangan(p.modul_sumber, p.menu_sumber);
      const ada = pasangan.get(kunci) ?? { modul_sumber: p.modul_sumber, menu_sumber: p.menu_sumber, jumlah: 0 };
      ada.jumlah += 1;
      pasangan.set(kunci, ada);
    }
    for (const item of pasangan.values()) {
      item.peta = await namakanPeta(await hitungPeta(item.modul_sumber, item.menu_sumber));
    }
    return pasangan;
  }

  /** Memetakan langsung (tanpa alias) semua pesan dengan pasangan nama mentah tertentu. */
  async function petakanLangsung(modulSumber, menuSumber, modulId, menuId, conn) {
    const pesan = await perubahanModel.pesanBelumDipetakan({ modulSumber, menuSumber }, conn);
    for (const p of pesan) await perubahanModel.tambahPeta(p.id, modulId, menuId, conn);
    return pesan.length;
  }

  return {
    /** Kesiapan sumber untuk kedua tipe: { CR: {siap, alasan}, B: {...} }. */
    status() {
      return { CR: syncModel.status('CR'), B: syncModel.status('B') };
    },
    /** Pratinjau: ambil dari sumber, tandai pesan yang sudah ada, dan tampilkan pemetaan yang akan dipakai. */
    async pratinjau({ tipe, nomor }) {
      const { nomorSumber, pesan, hilang } = await muatPerbandingan(tipe, nomor);
      const pasangan = await ringkasPasangan(pesan);
      const jumlahStatus = (s) => pesan.filter((p) => p.status === s).length;

      const daftar = pesan.map((p) => ({
        ...p,
        sudah_ada: p.status === 'sudah_ada',
        peta: pasangan.get(kunciPasangan(p.modul_sumber, p.menu_sumber)).peta,
      }));
      return {
        tipe,
        nomor: nomorSumber,
        jumlah: daftar.length,
        jumlah_sudah_ada: jumlahStatus('sudah_ada'),
        jumlah_baru: jumlahStatus('baru'),
        jumlah_berubah: jumlahStatus('berubah'),
        jumlah_diabaikan: jumlahStatus('diabaikan'),
        pesan: daftar,
        hilang: hilang.map((h) => ({ sumber_id: h.sumber_id, pesan: h.pesan, user_name: h.user_name, tanggal: h.tanggal })),
        belum_dipetakan: [...pasangan.values()].filter((x) => x.peta.length === 0).map(({ modul_sumber, menu_sumber, jumlah }) => ({ modul_sumber, menu_sumber, jumlah })),
      };
    },
    /**
     * Menyimpan hasil sync. Data diambil ulang dari sumber (tidak percaya data dari browser).
     * Pesan yang sudah ada (perubahan_id + sumber_id) dilewati sehingga aman diulang.
     */
    async simpan({ tipe, nomor, simpan_ids, perbarui_ids, hapus_ids }) {
      return db.transaction(async (conn) => {
        const banding = await muatPerbandingan(tipe, nomor, conn);
        // perubahan dibuat bila belum ada (juga dibutuhkan untuk mencatat pesan yang diabaikan)
        const perubahanId = banding.perubahan?.id ?? (await perubahanModel.cariAtauBuat(tipe, banding.nomorSumber, conn));
        const lokal = await perubahanModel.pesanLokal(perubahanId, conn);
        // daftar pilihan dari user; tidak dikirim berarti perilaku bawaan (lihat simpanBaru)
        const hasilBaru = await simpanBaru(perubahanId, banding.pesan, simpan_ids ? new Set(simpan_ids) : null, conn);
        const diperbarui = await perbaruiPesan(banding.pesan, lokal, new Set(perbarui_ids ?? []), conn);
        // hanya pesan yang benar-benar hilang di sumber yang boleh dihapus (id dari browser tidak dipercaya)
        const hapusId = new Set(hapus_ids ?? []);
        const idHapus = banding.hilang.filter((h) => hapusId.has(String(h.sumber_id))).map((h) => h.id);
        await perubahanModel.hapusPesan(idHapus, conn);
        // juga coba petakan pesan lama yang sebelumnya belum dikenal (alias mungkin sudah ditambah)
        const terpetakan = await petakanOtomatis({ perubahanId }, conn);
        return {
          perubahan_id: perubahanId,
          baru: hasilBaru.baru,
          diabaikan: hasilBaru.diabaikan,
          diperbarui,
          dihapus: idHapus.length,
          terpetakan,
        };
      });
    },
    /**
     * Pemetaan manual: semua pesan (di perubahan mana pun) dengan nama mentah yang sama
     * dipetakan ke modul/menu pilihan, dan nama mentah disimpan sebagai alias database baru.
     */
    async petakanManual({ modul_sumber, menu_sumber, modul_id, menu_id }) {
      const modul = await modulModel.byId(modul_id);
      // modul pilihan tidak ada: hentikan
      if (!modul) throw new AppError('Modul tidak ditemukan.', 404);
      if (menu_id) {
        const menu = await menuModel.byId(menu_id);
        // menu harus milik modul yang dipilih agar pemetaan konsisten
        if (!menu || menu.modul_id !== modul_id) throw new AppError('Menu tidak sesuai dengan modul yang dipilih.', 400);
      }
      return db.transaction(async (conn) => {
        // simpan alias hanya bila nama mentahnya ada (nama kosong tidak bisa dijadikan alias)
        if (modul_sumber) await modulModel.tambahAlias(modul_id, modul_sumber, JENIS_ALIAS.DATABASE, conn);
        if (modul_sumber && menu_id && menu_sumber) await menuModel.tambahAlias(menu_id, menu_sumber, JENIS_ALIAS.DATABASE, conn);
        const jumlah = await petakanLangsung(modul_sumber, menu_sumber, modul_id, menu_id, conn);
        return { jumlah_pesan: jumlah };
      });
    },
    /** Menambah modul baru (stub) dari nama mentah, lalu memetakan pesan terkait ke modul itu. */
    async tambahModulDanPetakan({ repo_id, nama, path_kode, modul_sumber, menu_sumber }) {
      const { id } = await modulUsecase.buat({
        repo_id,
        kode: null,
        nama,
        path_kode,
        ringkasan: null,
        alias_database: modul_sumber ? [modul_sumber] : [],
        kata_kunci: [],
      });
      const hasil = await this.petakanManual({ modul_sumber, menu_sumber, modul_id: id, menu_id: null });
      return { modul_id: id, ...hasil };
    },
  };
}
