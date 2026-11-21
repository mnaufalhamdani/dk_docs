// Deteksi tipe berkas dari ISI (byte), bukan dari nama atau MIME kiriman client.

/** Mendeteksi tipe gambar (png, jpeg, gif, webp) dari byte awal; null bila bukan gambar yang didukung. */
export function deteksiTipeGambar(buf) {
  if (buf.length >= 8 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png';
  if (buf.length >= 3 && buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buf.length >= 6 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  // WebP: "RIFF" + 4 byte ukuran + "WEBP"
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Jumlah byte awal yang diperiksa untuk menebak berkas teks. */
const BYTE_PERIKSA_TEKS = 8192;

/** Apakah isi berkas tampak teks biasa (tanpa byte NUL pada bagian awal). */
export function tampakTeks(buf) {
  return !buf.subarray(0, BYTE_PERIKSA_TEKS).includes(0);
}
