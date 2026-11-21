import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from './appError';

/**
 * Penyimpanan berkas di disk (folder uploads/). Nama berkas dibuat sendiri (UUID),
 * tidak pernah memakai nama dari user, sehingga aman dari path traversal.
 */
export function buatPenyimpananFile() {
  const akar = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

  /** Mengubah path relatif menjadi path absolut dan memastikan tetap di dalam folder uploads. */
  function resolveAman(pathRelatif) {
    const absolut = path.resolve(/* turbopackIgnore: true */ akar, pathRelatif);
    // path keluar dari folder uploads: tolak (indikasi manipulasi path)
    if (!absolut.startsWith(akar + path.sep)) throw new AppError('Path berkas tidak valid.', 400);
    return absolut;
  }

  return {
    /** Menyimpan buffer sebagai berkas baru; mengembalikan { namaFile, pathRelatif }. */
    async simpan(buffer, ekstensi) {
      const namaFile = `${randomUUID()}.${ekstensi}`;
      await fs.mkdir(akar, { recursive: true });
      await fs.writeFile(resolveAman(namaFile), buffer);
      return { namaFile, pathRelatif: namaFile };
    },
    /**
     * Menyimpan buffer pada path relatif tertentu (boleh berfolder; folder dibuat bila belum ada).
     * Pemanggil bertanggung jawab memastikan nama tiap segmen sudah divalidasi; path yang keluar dari
     * folder uploads tetap ditolak. Berkas dengan path sama ditimpa. Mengembalikan { pathRelatif }.
     */
    async simpanDi(pathRelatif, buffer) {
      const absolut = resolveAman(pathRelatif);
      await fs.mkdir(path.dirname(absolut), { recursive: true });
      await fs.writeFile(absolut, buffer);
      return { pathRelatif };
    },
    /** Membaca isi berkas. */
    async baca(pathRelatif) {
      return fs.readFile(resolveAman(pathRelatif));
    },
    /** Menghapus berkas; berkas yang sudah tidak ada dianggap tidak masalah. */
    async hapus(pathRelatif) {
      try {
        await fs.unlink(resolveAman(pathRelatif));
      } catch (error) {
        // berkas memang sudah hilang: tujuan penghapusan tercapai, abaikan
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}
