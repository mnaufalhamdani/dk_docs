import { validasi } from './validasi';

/**
 * Penanda yang dikembalikan stub AI: implementasi belum tersedia.
 * Pemilih akan kembali memakai implementasi aturan.
 */
export function aiBelumTersedia(nama) {
  return { tersedia: false, alasan: `Implementasi AI untuk ${nama} belum tersedia, memakai aturan.` };
}

/** Memastikan sebuah implementasi memiliki semua metode yang diwajibkan kontrak. */
function pastikanLengkap(nama, jenis, impl, metode) {
  const kurang = metode.filter((m) => typeof impl[m] !== 'function');
  // implementasi tidak lengkap adalah kesalahan pemrogram: gagal saat aplikasi dibuat, bukan saat dipakai
  if (kurang.length) throw new Error(`Implementasi ${jenis} ${nama} belum punya metode: ${kurang.join(', ')}`);
}

/**
 * Mencoba implementasi AI. Mengembalikan { ok: true, hasil } bila AI tersedia dan keluarannya
 * sesuai kontrak; selain itu { ok: false, alasan } agar pemanggil kembali ke aturan.
 */
async function cobaAi(nama, metode, fungsi, masukan, skemaKeluaran, logger) {
  try {
    const mentah = await fungsi(masukan);
    // stub / AI menyatakan belum tersedia
    if (mentah?.tersedia === false) return { ok: false, alasan: mentah.alasan };
    const cek = skemaKeluaran.safeParse(mentah);
    // keluaran tidak berbentuk sama dengan kontrak: jangan dipakai
    if (!cek.success) return { ok: false, alasan: `Keluaran AI ${nama}.${metode} tidak sesuai kontrak, memakai aturan.` };
    return { ok: true, hasil: cek.data };
  } catch (error) {
    // AI gagal (jaringan, kuota, dll): catat, lalu aturan mengambil alih
    logger.error(`AI ${nama}.${metode} gagal`, error);
    return { ok: false, alasan: `AI ${nama}.${metode} gagal, memakai aturan.` };
  }
}

/**
 * Membangun fasad sebuah kontrak. Mode dibaca dari tabel pengaturan SETIAP panggilan, sehingga perubahan
 * di halaman Pengaturan langsung berlaku. Mode 'ai' selalu kembali ke 'aturan' bila AI belum tersedia
 * atau keluarannya tidak sesuai kontrak.
 *
 * - kontrak: { metode: { masukan: zod, keluaran: zod } }
 * - hasil tiap metode: { asal: 'aturan' | 'ai', catatan: string | null, hasil: <keluaran kontrak> }
 */
export function buatPemilihImplementasi({ nama, kontrak, aturan, ai, kunciMode, pengaturanUsecase, logger }) {
  const daftarMetode = Object.keys(kontrak);
  pastikanLengkap(nama, 'aturan', aturan, daftarMetode);
  pastikanLengkap(nama, 'ai', ai, daftarMetode);

  const fasad = {};
  for (const metode of daftarMetode) {
    const { masukan: skemaMasukan, keluaran: skemaKeluaran } = kontrak[metode];
    fasad[metode] = async (input) => {
      const bersih = validasi(skemaMasukan, input);
      const mode = (await pengaturanUsecase.semua())[kunciMode];
      let catatan = null;

      if (mode === 'ai') {
        const percobaan = await cobaAi(nama, metode, ai[metode], bersih, skemaKeluaran, logger);
        if (percobaan.ok) return { asal: 'ai', catatan: null, hasil: percobaan.hasil };
        catatan = percobaan.alasan; // alasan fallback ikut dilaporkan ke pemanggil
      }
      // implementasi aturan juga divalidasi agar bentuknya selalu sama dengan kontrak
      const hasil = validasi(skemaKeluaran, await aturan[metode](bersih));
      return { asal: 'aturan', catatan, hasil };
    };
  }
  return fasad;
}
