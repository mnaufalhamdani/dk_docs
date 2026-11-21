import 'server-only';
import http from 'node:http';
import https from 'node:https';

// Pemetaan kode error jaringan ke alasan singkat yang aman (tanpa membocorkan detail internal).
const ALASAN_JARINGAN = {
  ECONNREFUSED: 'koneksi ditolak (server mati atau port salah)',
  ENOTFOUND: 'alamat tidak ditemukan (DNS)',
  EAI_AGAIN: 'alamat tidak ditemukan (DNS)',
  ECONNRESET: 'koneksi terputus',
  ETIMEDOUT: 'waktu habis saat menghubungi server',
  UND_ERR_CONNECT_TIMEOUT: 'waktu habis saat menghubungi server',
  EHOSTUNREACH: 'server tidak terjangkau',
  ENETUNREACH: 'jaringan tidak terjangkau',
  CERT_HAS_EXPIRED: 'sertifikat HTTPS kedaluwarsa',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'sertifikat HTTPS tidak tepercaya',
  SELF_SIGNED_CERT_IN_CHAIN: 'sertifikat HTTPS tidak tepercaya',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'sertifikat HTTPS tidak tepercaya',
  ERR_TLS_CERT_ALTNAME_INVALID: 'sertifikat HTTPS tidak cocok dengan nama server',
};

/** Kode HTTP 401/403 berarti server hidup tetapi meminta login; tetap dianggap online. */
const KODE_BUTUH_LOGIN = new Set([401, 403]);

/**
 * Service health: komunikasi keluar ke URL aplikasi (beta/live) milik repo.
 * Hanya mengambil kode status HTTP dan info sertifikat; isi respons tidak dibaca dan tidak dikembalikan.
 */
export function buatHealthService({ batasWaktuUrlMs, batasWaktuSslMs, periksaSertifikat }) {
  /** Mengubah error koneksi menjadi alasan singkat yang aman. */
  function alasanDari(error) {
    // permintaan diputus oleh AbortController karena melewati batas waktu
    if (error?.name === 'AbortError') return 'waktu habis saat menghubungi server';
    return ALASAN_JARINGAN[error?.cause?.code] ?? ALASAN_JARINGAN[error?.code] ?? 'tidak dapat dihubungi';
  }

  /*
   * Versi lama pengiriman permintaan lewat fetch (verifikasi sertifikat aktif). Tidak dipakai lagi: galat
   * sertifikat membuat fetch gagal sehingga URL salah dilaporkan 'offline'. Dibiarkan sebagai arsip.
   */
  async function kirimDenganFetch(url, metode) {
    const pengendali = new AbortController();
    const timer = setTimeout(() => pengendali.abort(), batasWaktuUrlMs);
    try {
      const respons = await fetch(url, { method: metode, redirect: 'manual', cache: 'no-store', signal: pengendali.signal });
      await respons.body?.cancel();
      return respons.status;
    } finally {
      clearTimeout(timer);
    }
  }
  void kirimDenganFetch;

  /**
   * Mengirim satu permintaan HEAD/GET dengan batas waktu; redirect tidak diikuti. Verifikasi sertifikat
   * dimatikan karena hanya kode status yang dibaca (tanpa data sensitif); masalah sertifikat dilaporkan
   * terpisah lewat pemeriksaan SSL, bukan sebagai URL offline.
   */
  function kirim(url, metode) {
    const pengendali = new AbortController();
    const timer = setTimeout(() => pengendali.abort(), batasWaktuUrlMs);
    const klien = new URL(url).protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const permintaan = klien.request(url, { method: metode, rejectUnauthorized: false, signal: pengendali.signal }, (respons) => {
        // isi respons tidak dibutuhkan: putuskan agar koneksi cepat dilepas
        resolve(respons.statusCode);
        respons.destroy();
      });
      permintaan.on('error', reject);
      permintaan.end();
    }).finally(() => clearTimeout(timer));
  }

  /** Menentukan status dari kode HTTP: online, atau bermasalah bila server menjawab dengan galat. */
  function statusDariKode(kode) {
    // 2xx/3xx: normal; 401/403: server hidup tetapi butuh login
    if (kode < 400 || KODE_BUTUH_LOGIN.has(kode)) return { status: 'online', kode_http: kode };
    return { status: 'bermasalah', kode_http: kode, alasan: `server menjawab dengan kesalahan (HTTP ${kode})` };
  }

  /** Pemeriksaan HTTP: online / bermasalah / offline. Tidak melempar error. */
  async function periksaHttp(url) {
    try {
      let kode = await kirim(url, 'HEAD');
      // sebagian server menolak HEAD: ulangi dengan GET agar tidak salah dianggap bermasalah
      if (kode === 405 || kode === 501) kode = await kirim(url, 'GET');
      return statusDariKode(kode);
    } catch (error) {
      return { status: 'offline', alasan: alasanDari(error) };
    }
  }

  /**
   * Menggabungkan hasil HTTP dan SSL: server yang menjawab tetapi sertifikatnya bermasalah menjadi
   * 'bermasalah' (bukan 'online'). 'offline' tetap hanya untuk server yang tidak terjangkau.
   */
  function gabungkan(hasilHttp, ssl) {
    const hasil = { ...hasilHttp, ssl };
    // server menjawab normal tetapi SSL punya error: tandai bermasalah dengan alasan SSL pertama
    if (hasilHttp.status === 'online' && ssl?.pesan_error?.length > 0) {
      hasil.status = 'bermasalah';
      hasil.alasan = ssl.pesan_error[0];
    }
    return hasil;
  }

  return {
    /**
     * Memeriksa satu URL. Hasil: { status: 'online' | 'bermasalah' | 'offline', kode_http?, alasan?, ssl }.
     * `ssl` null untuk URL http. Tidak melempar error: kegagalan jaringan menjadi status 'offline'.
     */
    async periksaUrl(url) {
      const [hasilHttp, ssl] = await Promise.all([periksaHttp(url), periksaSertifikat(url, batasWaktuSslMs)]);
      return gabungkan(hasilHttp, ssl);
    },
  };
}
