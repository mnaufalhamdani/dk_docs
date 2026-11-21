import 'server-only';
import { createContainer, asFunction, asValue, InjectionMode } from 'awilix';
import { ambilPool, buatDb } from '@/config/database';
import { logger } from '@/logger/logger';
import { buatPenyimpananFile } from '@/utils/penyimpananFile';
import IdGenerator from '@/utils/idGenerator';

import { buatHealthModel } from '@/modules/health/health.model';
import { buatHealthService } from '@/modules/health/health.service';
import { periksaSertifikat } from '@/modules/health/health.sertifikat';
import { buatHealthUsecase } from '@/modules/health/health.usecase';
import { buatHealthController } from '@/modules/health/health.controller';
import { buatPengaturanModel } from '@/modules/pengaturan/pengaturan.model';
import { buatPengaturanUsecase } from '@/modules/pengaturan/pengaturan.usecase';
import { buatPengaturanController } from '@/modules/pengaturan/pengaturan.controller';
import { buatRepoModel } from '@/modules/repo/repo.model';
import { buatRepoUsecase } from '@/modules/repo/repo.usecase';
import { buatRepoController } from '@/modules/repo/repo.controller';
import { buatModulModel } from '@/modules/modul/modul.model';
import { buatModulUsecase } from '@/modules/modul/modul.usecase';
import { buatModulController } from '@/modules/modul/modul.controller';
import { buatMenuModel } from '@/modules/menu/menu.model';
import { buatMenuUsecase } from '@/modules/menu/menu.usecase';
import { buatMenuController } from '@/modules/menu/menu.controller';
import { buatHalamanModel } from '@/modules/halaman/halaman.model';
import { buatHalamanUsecase } from '@/modules/halaman/halaman.usecase';
import { buatHalamanController } from '@/modules/halaman/halaman.controller';
import { buatDokumentasiModel } from '@/modules/dokumentasi/dokumentasi.model';
import { buatDokumentasiUsecase } from '@/modules/dokumentasi/dokumentasi.usecase';
import { buatDokumentasiController } from '@/modules/dokumentasi/dokumentasi.controller';
import { buatPencarianModel } from '@/modules/pencarian/pencarian.model';
import { buatPencarianUsecase } from '@/modules/pencarian/pencarian.usecase';
import { buatPencarianController } from '@/modules/pencarian/pencarian.controller';
import { buatSyncModel } from '@/modules/sync/sync.model';
import { buatSyncUsecase } from '@/modules/sync/sync.usecase';
import { buatSyncController } from '@/modules/sync/sync.controller';
import { buatPerubahanModel } from '@/modules/perubahan/perubahan.model';
import { buatPerubahanUsecase } from '@/modules/perubahan/perubahan.usecase';
import { buatPerubahanController } from '@/modules/perubahan/perubahan.controller';
import { buatPemilihImplementasi } from '@/utils/pemilihImplementasi';
import { KUNCI_PENGATURAN } from '@/enums';
import { kontrakBlueprintAnalyzer } from '@/modules/blueprint/analyzers/blueprintAnalyzer.kontrak';
import { buatAturanBlueprintAnalyzer } from '@/modules/blueprint/analyzers/aturan.blueprintAnalyzer';
import { buatAiBlueprintAnalyzer } from '@/modules/blueprint/analyzers/ai.blueprintAnalyzer';
import { kontrakModuleMatcher } from '@/modules/blueprint/matchers/moduleMatcher.kontrak';
import { buatAturanModuleMatcher } from '@/modules/blueprint/matchers/aturan.moduleMatcher';
import { buatAiModuleMatcher } from '@/modules/blueprint/matchers/ai.moduleMatcher';
import { kontrakDocPolisher } from '@/modules/dokumentasi/polishers/docPolisher.kontrak';
import { buatAturanDocPolisher } from '@/modules/dokumentasi/polishers/aturan.docPolisher';
import { buatAiDocPolisher } from '@/modules/dokumentasi/polishers/ai.docPolisher';
import { buatBlueprintModel } from '@/modules/blueprint/blueprint.model';
import { buatBlueprintUsecase } from '@/modules/blueprint/blueprint.usecase';
import { buatBlueprintController } from '@/modules/blueprint/blueprint.controller';
import { buatImporModel } from '@/modules/impor/impor.model';
import { buatImporUsecase } from '@/modules/impor/impor.usecase';
import { buatImporController } from '@/modules/impor/impor.controller';
import { buatPenyusunRencana } from '@/modules/impor/impor.rencana';
import { buatPenerapRencana } from '@/modules/impor/impor.terapkan';
import { buatPenerapDependensi } from '@/modules/impor/impor.dependensi';
import { buatPromptModel } from '@/modules/prompt/prompt.model';
import { buatPromptUsecase } from '@/modules/prompt/prompt.usecase';
import { buatPromptController } from '@/modules/prompt/prompt.controller';
import { buatPengujianModel } from '@/modules/pengujian/pengujian.model';
import { buatPengujianUsecase } from '@/modules/pengujian/pengujian.usecase';
import { buatPengujianController } from '@/modules/pengujian/pengujian.controller';
import { buatPenerimaHasil } from '@/modules/pengujian/pengujian.hasil';
import { buatPerakitUji } from '@/modules/pengujian/pengujian.perakit';
import { buatPengujiUlang } from '@/modules/pengujian/pengujian.ulang';
import { buatPembuatPdf } from '@/modules/pengujian/pengujian.pdf';
import { buatReferensiUji } from '@/modules/pengujian/pengujian.referensi';
import { ambilPoolSumber } from '@/config/database.sumber';
import sumberConfig from '@/config/sumber.config';
import { bacaWebfuzoConfig } from '@/config/webfuzo.config';
import { buatTautanModel } from '@/modules/tautan/tautan.model';
import { buatTautanUsecase } from '@/modules/tautan/tautan.usecase';
import { buatTautanController } from '@/modules/tautan/tautan.controller';
import { buatLayoutModel } from '@/modules/layout/layout.model';
import { buatLayoutUsecase } from '@/modules/layout/layout.usecase';
import { buatLayoutController } from '@/modules/layout/layout.controller';
import { buatDashboardModel } from '@/modules/dashboard/dashboard.model';
import { buatDashboardUsecase } from '@/modules/dashboard/dashboard.usecase';
import { buatDashboardController } from '@/modules/dashboard/dashboard.controller';
import { unstable_cache } from 'next/cache';

/** Mendaftarkan satu modul (model -> usecase -> controller) ke container sebagai singleton. */
function daftarModul(container, nama, { model, usecase, controller }) {
  container.register({
    [`${nama}Model`]: asFunction(model).singleton(),
    [`${nama}Usecase`]: asFunction(usecase).singleton(),
    [`${nama}Controller`]: asFunction(controller).singleton(),
  });
}

/**
 * Membangun container DI global. Dependency TIDAK dibuat di dalam class/function:
 * model menerima `db`, usecase menerima model, controller menerima usecase.
 * Mengganti sumber data (model -> service API) cukup dengan mengubah registrasi di sini.
 */
function buatContainer() {
  const container = createContainer({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    db: asFunction(() => buatDb(ambilPool())).singleton(),
    logger: asValue(logger),
    penyimpananFile: asFunction(buatPenyimpananFile).singleton(),
    // Pembuat ID semua primary key. Kelasnya disimpan di globalThis agar state (timestamp & counter)
    // satu untuk seluruh bundle Next.js; bila tidak, tiap salinan bundle punya counter sendiri dan
    // bisa menghasilkan ID kembar di milidetik yang sama.
    idGen: asValue({ generate: () => (globalThis.__dkDocsIdGenerator ??= IdGenerator).generate() }),
    // pool sumber bernilai null bila .env sumber belum diisi (Sync menampilkan pesan, bukan error)
    poolSumber: asFunction(() => ambilPoolSumber()).singleton(),
    sumberConfig: asValue(sumberConfig),
    // batas waktu (ms) tiap pengecekan komponen di endpoint health agar tidak menggantung
    batasWaktuHealthMs: asValue(3000),
    // batas waktu (ms) per URL beta/live; sengaja di bawah batas health agar jawaban endpoint tetap cepat
    batasWaktuUrlMs: asValue(2500),
    // batas waktu (ms) pembacaan sertifikat SSL per URL; paralel dengan pemeriksaan HTTP
    batasWaktuSslMs: asValue(3000),
    periksaSertifikat: asValue(periksaSertifikat),
    // pembungkus cache data bawaan Next.js (dipakai usecase dashboard)
    cacheHasil: asValue(unstable_cache),
    // template URL halaman CR/B di webfuzo (dari .env), dipakai usecase perubahan
    webfuzoConfig: asFunction(() => bacaWebfuzoConfig()).singleton(),
  });

  // Titik AI: implementasi dipilih lewat tabel `pengaturan` (aturan | ai). Mode 'ai' kembali ke aturan
  // selama implementasi AI belum tersedia. Mengganti ke AI sungguhan cukup mengisi berkas ai.*.js.
  container.register({
    blueprintAnalyzer: asFunction(({ pengaturanUsecase, logger: log }) =>
      buatPemilihImplementasi({ nama: 'BlueprintAnalyzer', kontrak: kontrakBlueprintAnalyzer, aturan: buatAturanBlueprintAnalyzer(), ai: buatAiBlueprintAnalyzer(), kunciMode: KUNCI_PENGATURAN.MODE_ANALISIS_BLUEPRINT, pengaturanUsecase, logger: log }),
    ).singleton(),
    moduleMatcher: asFunction(({ pengaturanUsecase, logger: log }) =>
      buatPemilihImplementasi({ nama: 'ModuleMatcher', kontrak: kontrakModuleMatcher, aturan: buatAturanModuleMatcher(), ai: buatAiModuleMatcher(), kunciMode: KUNCI_PENGATURAN.MODE_ANALISIS_BLUEPRINT, pengaturanUsecase, logger: log }),
    ).singleton(),
    docPolisher: asFunction(({ pengaturanUsecase, logger: log }) =>
      buatPemilihImplementasi({ nama: 'DocPolisher', kontrak: kontrakDocPolisher, aturan: buatAturanDocPolisher(), ai: buatAiDocPolisher(), kunciMode: KUNCI_PENGATURAN.MODE_RAPIKAN_BAHASA, pengaturanUsecase, logger: log }),
    ).singleton(),
  });

  container.register({ healthService: asFunction(buatHealthService).singleton() });
  daftarModul(container, 'health', { model: buatHealthModel, usecase: buatHealthUsecase, controller: buatHealthController });
  daftarModul(container, 'pengaturan', { model: buatPengaturanModel, usecase: buatPengaturanUsecase, controller: buatPengaturanController });
  daftarModul(container, 'repo', { model: buatRepoModel, usecase: buatRepoUsecase, controller: buatRepoController });
  daftarModul(container, 'modul', { model: buatModulModel, usecase: buatModulUsecase, controller: buatModulController });
  daftarModul(container, 'menu', { model: buatMenuModel, usecase: buatMenuUsecase, controller: buatMenuController });
  daftarModul(container, 'halaman', { model: buatHalamanModel, usecase: buatHalamanUsecase, controller: buatHalamanController });
  daftarModul(container, 'dokumentasi', { model: buatDokumentasiModel, usecase: buatDokumentasiUsecase, controller: buatDokumentasiController });
  daftarModul(container, 'pencarian', { model: buatPencarianModel, usecase: buatPencarianUsecase, controller: buatPencarianController });
  daftarModul(container, 'perubahan', { model: buatPerubahanModel, usecase: buatPerubahanUsecase, controller: buatPerubahanController });
  daftarModul(container, 'prompt', { model: buatPromptModel, usecase: buatPromptUsecase, controller: buatPromptController });
  // penerima hasil uji adalah kolaborator usecase pengujian (validasi JSON/bukti dan simpan transaksional)
  container.register({
    penerimaHasil: asFunction(buatPenerimaHasil).singleton(),
    // perakit prompt/poin dipakai bersama pembuatan Uji CR baru dan uji ulang
    perakitUji: asFunction(buatPerakitUji).singleton(),
    pengujiUlang: asFunction(buatPengujiUlang).singleton(),
    pembuatPdf: asFunction(buatPembuatPdf).singleton(),
    // ringkasan hasil uji untuk prompt usulan perubahan dokumentasi (modul prompt)
    referensiUji: asFunction(buatReferensiUji).singleton(),
  });
  daftarModul(container, 'pengujian', { model: buatPengujianModel, usecase: buatPengujianUsecase, controller: buatPengujianController });
  daftarModul(container, 'blueprint', { model: buatBlueprintModel, usecase: buatBlueprintUsecase, controller: buatBlueprintController });
  daftarModul(container, 'impor', { model: buatImporModel, usecase: buatImporUsecase, controller: buatImporController });
  // penyusun & penerap rencana impor adalah kolaborator usecase impor (bukan modul penuh)
  container.register({
    penyusunRencana: asFunction(buatPenyusunRencana).singleton(),
    penerapRencana: asFunction(buatPenerapRencana).singleton(),
    penerapDependensi: asFunction(buatPenerapDependensi).singleton(),
  });
  daftarModul(container, 'sync', { model: buatSyncModel, usecase: buatSyncUsecase, controller: buatSyncController });
  daftarModul(container, 'tautan', { model: buatTautanModel, usecase: buatTautanUsecase, controller: buatTautanController });
  daftarModul(container, 'layout', { model: buatLayoutModel, usecase: buatLayoutUsecase, controller: buatLayoutController });
  daftarModul(container, 'dashboard', { model: buatDashboardModel, usecase: buatDashboardUsecase, controller: buatDashboardController });

  return container;
}

/**
 * Mengambil container tunggal. Disimpan di globalThis agar hot reload saat dev
 * tidak membuat container (dan koneksi) baru berulang kali.
 */
export function ambilContainer() {
  // container belum ada: bangun sekali saja
  if (!globalThis.__dkDocsContainer) globalThis.__dkDocsContainer = buatContainer();
  return globalThis.__dkDocsContainer;
}

/** Jalan pintas ke cradle container: ambilDep().repoController, dst. */
export function ambilDep() {
  return ambilContainer().cradle;
}
