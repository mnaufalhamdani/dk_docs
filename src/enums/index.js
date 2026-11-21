// Konstanta bersama. Nilai sama persis dengan yang dipakai di schema.sql.

/** Bagian dokumentasi sebuah halaman (urutan = urutan tampil). */
export const BAGIAN = Object.freeze({
  TUJUAN: 'tujuan',
  KOMPONEN_UI: 'komponen_ui',
  VALIDASI: 'validasi',
  ALUR: 'alur',
  API: 'api',
  CATATAN: 'catatan',
});
export const DAFTAR_BAGIAN = Object.values(BAGIAN);

/** Jenis halaman. */
export const JENIS_HALAMAN = Object.freeze({
  DAFTAR: 'daftar',
  FORM: 'form',
  DETAIL: 'detail',
  LAINNYA: 'lainnya',
});
export const DAFTAR_JENIS_HALAMAN = Object.values(JENIS_HALAMAN);

/** Pola menu. */
export const POLA_MENU = Object.freeze({ CRUD: 'crud', LAINNYA: 'lainnya' });
export const DAFTAR_POLA_MENU = Object.values(POLA_MENU);

/** Status sebuah poin dokumentasi. */
export const STATUS_POIN = Object.freeze({ BETA: 'beta', LIVE: 'live' });
export const DAFTAR_STATUS_POIN = Object.values(STATUS_POIN);

/** Asal sebuah poin dokumentasi. */
export const ASAL_POIN = Object.freeze({ MANUAL: 'manual', IMPOR: 'impor', ATURAN: 'aturan', AI: 'ai' });

/** Jenis alias modul/menu. */
export const JENIS_ALIAS = Object.freeze({ DATABASE: 'database', KATA_KUNCI: 'kata_kunci' });

/** Platform repo. */
export const DAFTAR_PLATFORM = Object.freeze(['js', 'php', 'flutter', 'kotlin', 'lainnya']);

/** Lingkup operasi massal "jadikan semua live". */
export const LINGKUP_LIVE = Object.freeze({ HALAMAN: 'halaman', MENU: 'menu', MODUL: 'modul' });
export const DAFTAR_LINGKUP_LIVE = Object.values(LINGKUP_LIVE);

/** Tipe perubahan sumber (dipakai mulai Fase 2). */
export const TIPE_PERUBAHAN = Object.freeze({ CR: 'CR', B: 'B' });

/** Jenis sesi prompt (dipakai mulai Fase 3). */
export const JENIS_SESI = Object.freeze({
  USULAN_PERUBAHAN: 'usulan_perubahan',
  DOKUMENTASI_BARU: 'dokumentasi_baru',
  AUDIT_BUGFIX: 'audit_bugfix',
  SINKRON_MODUL: 'sinkron_modul',
  BLUEPRINT: 'blueprint',
  PENGUJIAN: 'pengujian',
});

/** Status sebuah skenario uji (satu-satunya status pengujian yang disimpan di database). */
export const STATUS_SKENARIO = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL', BLOCKED: 'BLOCKED', NOT_EXECUTED: 'NOT_EXECUTED' });
export const DAFTAR_STATUS_SKENARIO = Object.values(STATUS_SKENARIO);

/** Status turunan (dihitung saat tampil) sebuah sel poin x repo atau sebuah poin; BELUM = belum diuji. */
export const STATUS_UJI = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL', BLOCKED: 'BLOCKED', BELUM: 'BELUM' });

/** Tipe skenario uji: planned (dari poin blueprint) atau unplanned (di luar blueprint). */
export const TIPE_SKENARIO = Object.freeze({ PLANNED: 'planned', UNPLANNED: 'unplanned' });
export const DAFTAR_TIPE_SKENARIO = Object.values(TIPE_SKENARIO);

/** Jenis skenario uji. */
export const JENIS_SKENARIO = Object.freeze({ POSITIVE: 'positive', NEGATIVE: 'negative', REGRESSION: 'regression', IMPACT: 'impact' });
export const DAFTAR_JENIS_SKENARIO = Object.values(JENIS_SKENARIO);

/** Kategori hasil analisis perubahan (Git Diff dibanding blueprint). */
export const KATEGORI_PERUBAHAN = Object.freeze({ MATCHES: 'matches', SUPPORTING: 'supporting', OUTSIDE: 'outside', RISKY: 'risky' });
export const DAFTAR_KATEGORI_PERUBAHAN = Object.values(KATEGORI_PERUBAHAN);

/**
 * Tools umum per jenis pengujian (pengingat di UI dan pernyataan di prompt Uji CR; tidak semuanya wajib).
 * Yang menentukan tools mana yang benar-benar belum tersedia adalah agent saat eksekusi.
 */
export const TOOLS_UJI = Object.freeze({
  web: {
    nama: 'Web',
    tools: 'Runtime project (misal Node.js), browser yang didukung, dependency project',
    executor: 'Playwright, Selenium, Puppeteer, atau Cypress (Playwright bukan kewajiban mutlak)',
  },
  api: {
    nama: 'API',
    tools: 'Runtime project, HTTP client, akses ke environment/API yang diuji',
    executor: 'curl, Postman/Newman, atau script HTTP',
  },
  kotlin: {
    nama: 'Kotlin Android',
    tools: 'JDK, Gradle/Gradle Wrapper, Android SDK, ADB, emulator atau perangkat untuk UI/instrumentation test',
    executor: 'Gradle Test, JUnit, Espresso, atau Appium',
  },
  flutter: {
    nama: 'Flutter',
    tools: 'Flutter SDK, Dart SDK, Android SDK untuk target Android, emulator atau perangkat untuk integration/UI test',
    executor: 'flutter test, Flutter Integration Test, atau Appium',
  },
});

/** Jenis pengujian yang relevan untuk tiap platform repo (js/php bisa berupa aplikasi web sekaligus API). */
export const PROFIL_UJI_PLATFORM = Object.freeze({
  js: ['web', 'api'],
  php: ['web', 'api'],
  flutter: ['flutter'],
  kotlin: ['kotlin'],
  lainnya: ['web', 'api'],
});

/** Kunci pengaturan yang dikenal dan nilai defaultnya. */
export const KUNCI_PENGATURAN = Object.freeze({
  BATAS_KARAKTER_POIN: 'batas_karakter_poin',
  BATAS_KALIMAT_POIN: 'batas_kalimat_poin',
  UKURAN_KELOMPOK_BLUEPRINT: 'ukuran_kelompok_blueprint',
  MODE_ANALISIS_BLUEPRINT: 'mode_analisis_blueprint',
  MODE_RAPIKAN_BAHASA: 'mode_rapikan_bahasa',
});

/** Mode implementasi titik AI. */
export const MODE_ANALISIS = Object.freeze(['aturan', 'ai']);

/** Tipe MIME gambar yang boleh diunggah beserta ekstensi simpannya. */
export const MIME_GAMBAR = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
});
