import { validasi } from '@/utils/validasi';
import { sesiUsulanSchema, sesiDokumentasiBaruSchema, sesiSinkronSchema, sesiAuditSchema, unduhSchema, uniqueIdSchema } from './prompt.schema';

/** Controller prompt: validasi input lalu teruskan ke usecase. */
export function buatPromptController({ promptUsecase }) {
  return {
    /** Membuat sesi usulan perubahan dokumentasi (satu prompt per repo). */
    buatSesiUsulan: (input) => promptUsecase.buatSesiUsulan(validasi(sesiUsulanSchema, input)),
    /** Membuat sesi dokumentasi baru untuk 1-5 modul. */
    buatSesiDokumentasiBaru: (input) => promptUsecase.buatSesiDokumentasiBaru(validasi(sesiDokumentasiBaruSchema, input)),
    /** Membuat sesi sinkron dokumentasi dengan kode untuk satu modul. */
    buatSesiSinkron: (input) => promptUsecase.buatSesiSinkron(validasi(sesiSinkronSchema, input)),
    /** Membuat sesi audit bugfix untuk satu repo. */
    buatSesiAudit: (input) => promptUsecase.buatSesiAudit(validasi(sesiAuditSchema, input)),
    /** Semua prompt satu unique_id. */
    ambilSesi: (uniqueId) => promptUsecase.ambilSesi(validasi(uniqueIdSchema, uniqueId)),
    /** Daftar sesi terbaru. */
    daftar: () => promptUsecase.daftar(),
    /** Unduh prompt satu repo sebagai .md. */
    unduh: (input) => promptUsecase.unduh(validasi(unduhSchema, input)),
  };
}
