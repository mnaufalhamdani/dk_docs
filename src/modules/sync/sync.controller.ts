import { validasi } from '@/utils/validasi';
import { sumberSchema, simpanSyncSchema, petakanSchema, tambahModulSchema } from './sync.schema';

/** Controller sync: validasi input lalu teruskan ke usecase. */
export function buatSyncController({ syncUsecase }) {
  return {
    /** Kesiapan sumber CR/B. */
    status: () => syncUsecase.status(),
    /** Pratinjau pesan dari sumber. */
    pratinjau: (input) => syncUsecase.pratinjau(validasi(sumberSchema, input)),
    /** Menyimpan hasil sync. */
    simpan: (input) => syncUsecase.simpan(validasi(simpanSyncSchema, input)),
    /** Pemetaan manual nama mentah ke modul/menu. */
    petakanManual: (input) => syncUsecase.petakanManual(validasi(petakanSchema, input)),
    /** Tambah modul baru dari nama mentah lalu petakan. */
    tambahModulDanPetakan: (input) => syncUsecase.tambahModulDanPetakan(validasi(tambahModulSchema, input)),
  };
}
