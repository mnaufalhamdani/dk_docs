import 'server-only';

// Pemetaan kode error driver MySQL ke alasan singkat yang aman (tanpa host, user, atau password).
const ALASAN_ERROR = {
  ECONNREFUSED: 'koneksi ditolak (server database mati atau port salah)',
  ETIMEDOUT: 'waktu habis saat menghubungi database',
  PROTOCOL_CONNECTION_LOST: 'koneksi ke database terputus',
  ER_ACCESS_DENIED_ERROR: 'akses ditolak (periksa user dan password)',
  ER_BAD_DB_ERROR: 'database tidak ditemukan',
  // kode tambahan yang lazim muncul pada koneksi database
  ENOTFOUND: 'alamat server database tidak ditemukan',
  ECONNRESET: 'koneksi ke database terputus',
  SUMBER_BELUM_DIKONFIGURASI: 'koneksi database sumber belum diisi di konfigurasi server',
};

/** Usecase health: menentukan status aplikasi per komponen (database docs dan database sumber). */
export function buatHealthUsecase({ healthModel, syncModel, repoModel, healthService, logger, batasWaktuHealthMs }) {
  /** Mengubah error menjadi alasan singkat; kode tak dikenal tidak membocorkan pesan asli. */
  function alasanDari(error) {
    return ALASAN_ERROR[error?.code] ?? 'kesalahan tidak dikenal (lihat log server)';
  }

  /** Membatasi waktu tunggu sebuah proses agar health tidak menggantung. */
  async function denganBatasWaktu(proses) {
    let timer;
    const habis = new Promise((_, tolak) => {
      timer = setTimeout(() => tolak(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), batasWaktuHealthMs);
    });
    try {
      return await Promise.race([proses, habis]);
    } finally {
      // timer selalu dibersihkan agar tidak tertinggal setelah proses selesai
      clearTimeout(timer);
    }
  }

  /** Mengecek satu komponen dan mengembalikan status beserta alasan bila gagal. */
  async function cekKomponen(nama, ping) {
    try {
      await denganBatasWaktu(ping());
      return { status: 'ok' };
    } catch (error) {
      // detail lengkap hanya masuk log; ke pemanggil hanya alasan yang aman
      logger.error(`Health check: ${nama} gagal`, error);
      return { status: 'error', alasan: alasanDari(error) };
    }
  }

  /** Memeriksa satu URL (beta/live); URL kosong berarti tidak ada yang dicek (null). */
  async function cekUrl(url) {
    if (!url) return null;
    return { url, ...(await healthService.periksaUrl(url)) };
  }

  /** Memeriksa URL beta dan live semua repo secara paralel; tidak pernah melempar error. */
  async function cekRepo() {
    let daftar;
    try {
      daftar = await denganBatasWaktu(repoModel.repoDenganUrl());
    } catch (error) {
      // daftar repo gagal dibaca (mis. database docs mati): laporkan kosong beserta alasan aman
      logger.error('Health check: daftar repo gagal', error);
      return { repo: [], ringkasan_url: { online: 0, bermasalah: 0, offline: 0 }, repo_alasan: alasanDari(error) };
    }
    const repo = await Promise.all(
      daftar.map(async (r) => {
        const [beta, live] = await Promise.all([cekUrl(r.url_beta), cekUrl(r.url_live)]);
        return { id: r.id, kode: r.kode, nama: r.nama, beta, live };
      }),
    );
    const ringkasan = { online: 0, bermasalah: 0, offline: 0 };
    for (const r of repo) for (const hasil of [r.beta, r.live]) if (hasil) ringkasan[hasil.status] += 1;
    return { repo, ringkasan_url: ringkasan };
  }

  return {
    /**
     * Mengembalikan status aplikasi per komponen plus status URL beta/live tiap repo; tidak melempar error
     * agar endpoint tetap menjawab. `status` hanya mencerminkan database: situs beta/live yang mati tidak
     * membuat DK Docs sendiri dianggap bermasalah.
     */
    async cek() {
      const [docs, sumber, urlRepo] = await Promise.all([
        cekKomponen('database docs', () => healthModel.ping()),
        cekKomponen('database sumber', () => syncModel.ping()),
        cekRepo(),
      ]);
      const semuaOk = docs.status === 'ok' && sumber.status === 'ok';
      return {
        // salah satu komponen gagal: laporkan 'degraded' (bukan crash) supaya monitoring bisa membacanya
        status: semuaOk ? 'ok' : 'degraded',
        database: docs.status, // dipertahankan agar pembaca lama tetap kompatibel
        komponen: { database_docs: docs, database_sumber: sumber },
        ...urlRepo,
        waktu: new Date().toISOString(),
      };
    },
  };
}
