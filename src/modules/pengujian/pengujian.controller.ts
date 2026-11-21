import { validasi } from '@/utils/validasi';
import { idSchema } from '@/utils/schemaDasar';
import { berkasBuktiSchema, buktiSchema, catatanSchema, pdfIdSchema, pengujianIdSchema, ujiUlangSchema, pecahSchema, pengujianBaruSchema, pratinjauHasilSchema, simpanHasilSchema, unduhSchema } from './pengujian.schema';

/** Controller pengujian: validasi input lalu teruskan ke usecase. */
export function buatPengujianController({ pengujianUsecase }) {
  return {
    /** Memecah teks blueprint menjadi poin. */
    pratinjauPoin: (input) => pengujianUsecase.pratinjauPoin(validasi(pecahSchema, input)),
    /** Pilihan modul/menu untuk target poin. */
    opsiTarget: () => pengujianUsecase.opsiTarget(),
    /** Membuat Uji CR baru (putaran 1 dan prompt per repo). */
    buat: (input) => pengujianUsecase.buat(validasi(pengujianBaruSchema, input)),
    /** Daftar Uji CR. */
    daftar: () => pengujianUsecase.daftar(),
    /** Detail satu Uji CR. */
    detail: (id) => pengujianUsecase.detail(validasi(idSchema, id)),
    /** Unduh prompt uji satu repo sebagai .md. */
    unduh: (input) => pengujianUsecase.unduh(validasi(unduhSchema, input)),
    /** Membuat putaran uji ulang dari sel terpilih dan/atau poin baru. */
    ujiUlang: (input) => pengujianUsecase.ujiUlang(validasi(ujiUlangSchema, input)),
    /** Menyimpan (atau menghapus bila kosong) catatan keputusan sebuah sel. */
    simpanCatatan: (input) => pengujianUsecase.simpanCatatan(validasi(catatanSchema, input)),
    /** Pratinjau impor hasil uji: JSON mentah dan nama berkas bukti (tanpa isi berkas). */
    pratinjauHasil: (input) => pengujianUsecase.pratinjauHasil(validasi(pratinjauHasilSchema, input)),
    /** Simpan hasil uji dari form multipart: pengujian_id, json, dan berkas bukti pada kunci bukti_0, bukti_1, dst. */
    simpanHasil(input) {
      const { pengujian_id, json, buat_pdf, ...sisa } = input ?? {};
      const data = validasi(simpanHasilSchema, { pengujian_id, json, buat_pdf });
      // hanya kunci berawalan bukti_ yang dianggap berkas bukti; kunci lain diabaikan
      const files = validasi(berkasBuktiSchema, Object.entries(sisa).filter(([k]) => k.startsWith('bukti_')).map(([, v]) => v));
      return pengujianUsecase.simpanHasil({ ...data, files });
    },
    /** Membuat versi PDF baru untuk sebuah pengujian. */
    buatPdf: (input) => pengujianUsecase.buatPdf(validasi(pengujianIdSchema, input)),
    /** Membaca berkas PDF satu versi untuk diunduh. */
    ambilPdf: (input) => pengujianUsecase.ambilPdf(validasi(pdfIdSchema, input)),
    /** Membaca satu berkas bukti milik skenario. */
    ambilBukti: (input) => pengujianUsecase.ambilBukti(validasi(buktiSchema, input)),
  };
}
