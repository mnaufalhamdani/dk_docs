import 'server-only';
import tls from 'node:tls';

const RANTAI_TIDAK_COCOK =
  'Rantai sertifikat tidak lengkap atau tidak cocok. Periksa urutan dan penerbit sertifikat di server.';

const PESAN_HOST_TIDAK_COCOK = 'Nama host tidak cocok dengan sertifikat.';

// Pemetaan kode galat verifikasi TLS ke pesan berbahasa Indonesia yang mudah dipahami.
const PESAN_SSL = {
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: RANTAI_TIDAK_COCOK,
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: RANTAI_TIDAK_COCOK,
  UNABLE_TO_GET_ISSUER_CERT: RANTAI_TIDAK_COCOK,
  ERR_TLS_CERT_ALTNAME_INVALID: PESAN_HOST_TIDAK_COCOK,
  CERT_HAS_EXPIRED: 'Sertifikat sudah kedaluwarsa.',
  CERT_NOT_YET_VALID: 'Sertifikat belum berlaku.',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'Sertifikat ditandatangani sendiri (self-signed).',
  SELF_SIGNED_CERT_IN_CHAIN: 'Sertifikat ditandatangani sendiri (self-signed).',
};

// Galat jaringan murni: server tidak terjangkau, bukan masalah sertifikat.
const KODE_JARINGAN = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH']);

/** Sisa hari di bawah angka ini memicu peringatan (bukan error). */
const AMBANG_PERINGATAN_HARI = 30;
const MS_PER_HARI = 86400000;

// Dua formatter terpisah (tanggal dan jam) agar format tidak bergantung pada konektor bawaan ICU.
const formatTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
const formatJam = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Menyusun teks kedaluwarsa dalam WIB, contoh: "25 Desember 2026, 14.32 WIB". */
function teksKedaluwarsa(tanggal) {
  return `${formatTanggal.format(tanggal)}, ${formatJam.format(tanggal)} WIB`;
}

/** Hasil saat sertifikat tidak berhasil dibaca; tanggal kedaluwarsa tidak tersedia. */
function tanpaSertifikat(pesanError = []) {
  return { berlaku_sampai: null, berlaku_sampai_teks: 'tidak tersedia', sisa_hari: null, pesan_error: pesanError, peringatan: null };
}

/** Kode galat verifikasi dari socket (bisa berupa teks kode atau objek Error, tergantung versi Node). */
function kodeVerifikasi(galat) {
  return typeof galat === 'string' ? galat : (galat?.code ?? String(galat));
}

/** Menyusun daftar pesan error SSL; kosong bila sertifikat sehat. */
function susunPesanError(socket, cert, host) {
  const pesan = [];
  if (!socket.authorized) {
    // galat verifikasi rantai atau masa berlaku; kode tak dikenal tetap diberi pesan umum
    const kode = kodeVerifikasi(socket.authorizationError);
    pesan.push(PESAN_SSL[kode] ?? `Sertifikat tidak dapat diverifikasi (kode: ${kode}).`);
  }
  // nama host dicek terpisah karena rejectUnauthorized dimatikan
  if (tls.checkServerIdentity(host, cert)) pesan.push(PESAN_HOST_TIDAK_COCOK);
  // Node kadang sudah melaporkan nama host tidak cocok lewat authorizationError: hindari pesan ganda
  return [...new Set(pesan)];
}

/** Menyusun hasil lengkap dari sertifikat yang berhasil dibaca. */
function susunHasil(socket, cert, host) {
  const berakhir = new Date(cert.valid_to);
  // format tanggal sertifikat tidak terbaca: jangan mengarang isinya
  if (Number.isNaN(berakhir.getTime())) return tanpaSertifikat(['Tanggal kedaluwarsa sertifikat tidak dapat dibaca.']);
  const sisaHari = Math.floor((berakhir - Date.now()) / MS_PER_HARI);
  return {
    berlaku_sampai: berakhir.toISOString(),
    berlaku_sampai_teks: teksKedaluwarsa(berakhir),
    sisa_hari: sisaHari,
    pesan_error: susunPesanError(socket, cert, host),
    // masih berlaku tetapi hampir habis: peringatan, bukan error
    peringatan: sisaHari >= 0 && sisaHari < AMBANG_PERINGATAN_HARI ? `Sertifikat akan kedaluwarsa dalam ${sisaHari} hari.` : null,
  };
}

/**
 * Memeriksa sertifikat TLS sebuah URL https memakai host dan port dari URL itu sendiri.
 * Tidak melempar error: URL http menghasilkan null; selain itu selalu ada hasil.
 */
export function periksaSertifikat(url, batasWaktuMs) {
  let alamat;
  try {
    alamat = new URL(url);
  } catch {
    // URL tidak valid: tidak ada yang bisa diperiksa
    return Promise.resolve(null);
  }
  // URL http biasa tidak memakai TLS sehingga tidak ada yang diperiksa
  if (alamat.protocol !== 'https:') return Promise.resolve(null);

  return new Promise((resolve) => {
    let selesai = false;
    // hasil hanya boleh dikirim sekali walau beberapa kejadian (error, timeout) terjadi bersamaan
    const akhiri = (hasil) => {
      if (selesai) return;
      selesai = true;
      resolve(hasil);
    };
    // rejectUnauthorized dimatikan supaya sertifikat tetap terbaca walau verifikasinya gagal
    const socket = tls.connect({ host: alamat.hostname, port: Number(alamat.port) || 443, servername: alamat.hostname, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      // server tidak mengirim sertifikat yang bisa dibaca
      akhiri(cert?.valid_to ? susunHasil(socket, cert, alamat.hostname) : tanpaSertifikat(['Server tidak mengirim sertifikat yang dapat dibaca.']));
      socket.end();
    });
    // koneksi yang menggantung dianggap gagal; sertifikat tidak terbaca
    socket.setTimeout(batasWaktuMs, () => {
      socket.destroy();
      akhiri(tanpaSertifikat());
    });
    socket.on('error', (error) => {
      // galat jaringan = offline (dilaporkan pemeriksaan HTTP); galat TLS lain dilaporkan sebagai pesan
      akhiri(KODE_JARINGAN.has(error.code) ? tanpaSertifikat() : tanpaSertifikat([`Koneksi TLS gagal (kode: ${error.code ?? 'tidak diketahui'}).`]));
    });
  });
}
