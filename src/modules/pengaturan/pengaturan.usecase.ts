import 'server-only';

/** Nilai bawaan bila baris pengaturan belum ada di database. */
const DEFAULT = {
  batas_karakter_poin: '150',
  batas_kalimat_poin: '2',
  ukuran_kelompok_blueprint: '4',
  mode_analisis_blueprint: 'aturan',
  mode_rapikan_bahasa: 'aturan',
};

/** Usecase pengaturan: menggabungkan nilai database dengan default dan menyimpan perubahan. */
export function buatPengaturanUsecase({ pengaturanModel, db }) {
  /** Semua pengaturan sebagai objek { kunci: nilai(teks) }. */
  async function semua() {
    const baris = await pengaturanModel.semua();
    const hasil = { ...DEFAULT };
    // nilai di database menimpa default
    for (const b of baris) hasil[b.kunci] = b.nilai;
    return hasil;
  }

  return {
    semua,
    /** Batas peringatan panjang poin: { karakter, kalimat } sebagai angka. */
    async batasPoin() {
      const p = await semua();
      return { karakter: Number(p.batas_karakter_poin), kalimat: Number(p.batas_kalimat_poin) };
    },
    /** Menyimpan beberapa pengaturan sekaligus dalam satu transaksi, lalu mengembalikan nilai terbaru. */
    async ubah(input) {
      await db.transaction(async (conn) => {
        for (const [kunci, nilai] of Object.entries(input)) {
          // kunci tanpa nilai (undefined) berarti tidak diubah
          if (nilai === undefined) continue;
          await pengaturanModel.simpan(kunci, nilai, conn);
        }
      });
      return semua();
    },
  };
}
