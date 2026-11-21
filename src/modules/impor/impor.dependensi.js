import 'server-only';
import { AppError } from '@/utils/appError';
import { buatKode } from '@/utils/slug';
import { JENIS_ALIAS } from '@/enums';

/**
 * Penerap dependensi (bergantung_pada) saat Simpan. Sifatnya menambah saja:
 * dependensi lama tidak dihapus. Pilihan per entri: tautkan ke yang ada, daftarkan stub, atau abaikan.
 */
export function buatPenerapDependensi({ imporModel, modulModel, menuModel, halamanModel }) {
  /** Nama entitas target (untuk memutuskan perlu tidaknya menyimpan alias). */
  async function namaEntitas(tingkat, id, conn) {
    const baris = await { modul: modulModel, menu: menuModel, halaman: halamanModel }[tingkat].byId(id, conn);
    return baris?.nama ?? null;
  }

  /** Menyimpan nama dependensi sebagai alias target agar dikenali otomatis pada impor berikutnya. */
  async function simpanAlias(tingkat, targetId, nama, conn) {
    const namaTarget = await namaEntitas(tingkat, targetId, conn);
    // nama sama dengan nama target: alias tidak menambah informasi
    if (!namaTarget || namaTarget.toLowerCase() === nama.toLowerCase()) return;
    if (tingkat === 'modul') await modulModel.tambahAlias(targetId, nama, JENIS_ALIAS.KATA_KUNCI, conn);
    else if (tingkat === 'menu') await menuModel.tambahAlias(targetId, nama, JENIS_ALIAS.KATA_KUNCI, conn);
    else await imporModel.tambahKataKunciHalaman(targetId, nama, conn);
  }

  /** Membuat (atau memakai ulang bila kodenya sudah ada) entitas stub untuk dependensi yang belum terdaftar. */
  async function buatStub(dep, konteks, conn) {
    const kode = buatKode(dep.nama);
    if (dep.tingkat === 'modul') {
      const ada = await modulModel.byKode(konteks.repoId, kode, conn);
      return ada?.id ?? modulModel.buat({ repo_id: konteks.repoId, kode, nama: dep.nama, path_kode: null, ringkasan: null }, conn);
    }
    if (dep.tingkat === 'menu') {
      const ada = await menuModel.byKode(konteks.modulId, kode, conn);
      return ada?.id ?? menuModel.buat({ modul_id: konteks.modulId, kode, nama: dep.nama, route: dep.route, path_kode: null, ringkasan: null, pola: 'lainnya' }, conn);
    }
    const ada = await halamanModel.byKode(konteks.menuId, kode, conn);
    return ada?.id ?? halamanModel.buat({ menu_id: konteks.menuId, kode, nama: dep.nama, jenis: 'lainnya', route: dep.route, file_utama: [] }, conn);
  }

  /** Menentukan id target dependensi sesuai pilihan; null bila tidak ada yang perlu ditautkan. */
  async function tentukanTarget(dep, konteks, conn) {
    if (dep.pilihan === 'stub') return buatStub(dep, konteks, conn);
    // tautkan: target harus dipilih dan milik repo yang sama (klien tidak dipercaya begitu saja)
    if (!dep.target_id) throw new AppError(`Dependensi "${dep.nama}": pilih target yang akan ditautkan.`, 400);
    if (!(await imporModel.milikRepo(dep.tingkat, dep.target_id, konteks.repoId, conn))) {
      throw new AppError(`Dependensi "${dep.nama}": target tidak ada di repo ini.`, 400);
    }
    await simpanAlias(dep.tingkat, dep.target_id, dep.nama, conn);
    return dep.target_id;
  }

  return {
    /**
     * Menerapkan daftar dependensi satu entitas. `konteks` = { repoId, modulId, menuId }.
     * Mengembalikan jumlah tautan dependensi yang diproses.
     */
    async terapkan(deps, tingkat, dariId, konteks, conn) {
      let jumlah = 0;
      for (const dep of deps) {
        // diabaikan user: tidak ada efek apa pun
        if (dep.pilihan === 'abaikan') continue;
        // dependensi hanya satu tingkat yang sama (modul->modul, menu->menu, halaman->halaman)
        if (dep.tingkat !== tingkat) throw new AppError(`Dependensi "${dep.nama}" bertingkat ${dep.tingkat}, seharusnya ${tingkat}.`, 400);
        const targetId = await tentukanTarget(dep, konteks, conn);
        // menaut ke dirinya sendiri tidak bermakna
        if (!targetId || targetId === dariId) continue;
        await imporModel.tambahDependensi(tingkat, dariId, targetId, dep.keterangan, conn);
        jumlah += 1;
      }
      return jumlah;
    },
  };
}
