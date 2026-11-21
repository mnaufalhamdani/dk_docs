import 'server-only';
import sharp from 'sharp';
import { AppError } from '@/utils/appError';
import { putaranTercakup, ringkasanStatus, susunLaporan } from './pengujian.laporan';
import { renderPdf } from './pengujian.pdf.render';
import { formatLabelCr, normalisasiCr } from './pengujian.dokumen';

/** Lebar maksimal (piksel) gambar bukti di PDF dan kualitas JPEG hasil kecilan agar PDF tidak membengkak. */
const LEBAR_GAMBAR_MAKS = 900;
const KUALITAS_JPEG = 70;

/** Jumlah percobaan memesan nomor versi bila bentrok dengan permintaan lain. */
const MAKS_COBA_VERSI = 5;

/** Nama berkas PDF: pengujian_<CR-ID>_v<versi>.pdf (karakter di luar huruf, angka, titik, "-" dan "_" diganti). */
export function namaBerkasPdf(crId, versi) {
  return `pengujian_${String(crId).replace(/[^A-Za-z0-9_.-]/g, '_')}_v${versi}.pdf`;
}

/** Tanggal pembuatan dalam Bahasa Indonesia (WIB). */
function tanggalSekarang() {
  return `${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date())} WIB`;
}

/**
 * Pembuat PDF Uji CR: menyusun laporan kumulatif dari database, menggambarnya dengan pdfkit,
 * menyimpannya sebagai versi baru (versi lama tidak pernah ditimpa), dan mencatatnya di pengujian_pdf.
 */
export function buatPembuatPdf({ pengujianModel, penyimpananFile }) {
  /** Memuat semua data pengujian yang dibutuhkan laporan. */
  async function muatData(pengujian) {
    const id = pengujian.id;
    const [poin, target, putaran, putaranRepo, targetRepo, sel, skenario, perubahan, catatan] = await Promise.all([
      pengujianModel.poinByPengujian(id),
      pengujianModel.targetByPengujian(id),
      pengujianModel.putaranByPengujian(id),
      pengujianModel.putaranRepoByPengujian(id),
      pengujianModel.targetRepo(id),
      pengujianModel.selPutaran(id),
      pengujianModel.skenarioByPengujian(id),
      pengujianModel.perubahanByPengujian(id),
      pengujianModel.catatanByPengujian(id),
    ]);
    return { pengujian, poin, target, putaran, putaranRepo, targetRepo, sel, skenario, perubahan, catatan };
  }

  /** Membaca gambar bukti dan mengecilkannya (JPEG, lebar terbatas); berkas hilang atau rusak dilewati. */
  async function siapkanGambar(lampiran) {
    const peta = new Map();
    for (const x of lampiran) {
      try {
        const asli = await penyimpananFile.baca(x.path);
        const kecil = await sharp(asli)
          .rotate()
          .resize({ width: LEBAR_GAMBAR_MAKS, withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: KUALITAS_JPEG })
          .toBuffer();
        peta.set(x.path, kecil);
      } catch {
        // berkas bukti sudah tidak ada di disk atau bukan gambar yang bisa dibaca: lampiran ini dilewati
      }
    }
    return peta;
  }

  /**
   * Memesan nomor versi dengan mencatat barisnya lebih dulu (UNIQUE pengujian_id+versi). Bila nomor yang sama
   * diambil permintaan lain bersamaan, dicoba nomor berikutnya, sehingga dua permintaan tidak pernah berbagi berkas.
   */
  async function pesanVersi(pengujian, data) {
    for (let i = 0; i < MAKS_COBA_VERSI; i += 1) {
      const versi = await pengujianModel.versiPdfBerikut(pengujian.id);
      const laporan = susunLaporan({ data, versi, tanggal: tanggalSekarang() });
      const pathFile = `pengujian/${pengujian.id}/pdf/${namaBerkasPdf(pengujian.cr_id, versi)}`;
      try {
        const id = await pengujianModel.buatPdf({
          pengujian_id: pengujian.id,
          versi,
          putaran_tercakup: putaranTercakup(data.putaran, data.putaranRepo),
          path_file: pathFile,
          ringkasan_status: ringkasanStatus(laporan),
        });
        return { id, versi, laporan, pathFile };
      } catch (error) {
        // nomor versi sudah diambil permintaan lain: coba nomor berikutnya; error lain dilempar apa adanya
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
    }
    throw new AppError('Gagal memesan nomor versi PDF, coba lagi.', 409);
  }

  return {
    /** Membuat versi PDF baru untuk sebuah pengujian; mengembalikan { id, versi }. */
    async buat(pengujianId) {
      const pengujian = await pengujianModel.byId(pengujianId);
      // id Uji CR tidak dikenal: 404
      if (!pengujian) throw new AppError('Uji CR tidak ditemukan.', 404);
      // judul dan nama berkas PDF memakai label dengan awalan seperti pesan commit (mis. CR202502030002)
      const label = formatLabelCr(pengujian.cr_id, await pengujianModel.tipePerubahan(normalisasiCr(pengujian.cr_id)));
      const bernama = { ...pengujian, cr_id: label };
      const { id, versi, laporan, pathFile } = await pesanVersi(bernama, await muatData(bernama));
      try {
        const buffer = await renderPdf(laporan, await siapkanGambar(laporan.lampiran));
        await penyimpananFile.simpanDi(pathFile, buffer);
        return { id, versi };
      } catch (error) {
        // gagal menggambar/menulis: cabut catatan versi agar tidak ada versi tanpa berkas
        await pengujianModel.hapusPdf(id);
        await penyimpananFile.hapus(pathFile);
        throw error;
      }
    },
  };
}
