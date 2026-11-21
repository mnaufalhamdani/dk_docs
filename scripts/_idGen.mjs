import 'dotenv/config';

/**
 * Pembuat ID untuk script (seed/migrasi) memakai IdGenerator yang sama dengan aplikasi.
 * SERVER_ID script dibedakan dari aplikasi (default 99, atau SCRIPT_SERVER_ID di .env)
 * agar ID hasil script tidak pernah bentrok dengan ID yang dibuat aplikasi.
 * SERVER_ID dibaca generator saat kelas dimuat, jadi harus diatur SEBELUM import.
 */
process.env.SERVER_ID = process.env.SCRIPT_SERVER_ID ?? '99';
const { default: IdGenerator } = await import('../src/utils/idGenerator.js');

/** Batas counter yang dianggap aman; counter generator hanya 2 digit (>= 100 merusak urutan ID). */
const BATAS_COUNTER = 90;

/**
 * Membuat satu ID baru (string). Script membuat ribuan ID dalam satu milidetik, jadi
 * bila counter hampir 100 kita tunggu milidetik berikutnya agar urutan ID tetap naik.
 */
export function buatId() {
  // masih milidetik yang sama dan counter hampir penuh: tunggu sampai milidetik berganti
  if (IdGenerator.counter >= BATAS_COUNTER && Date.now() === IdGenerator.lastTimestamp) {
    while (Date.now() === IdGenerator.lastTimestamp);
  }
  return IdGenerator.generate();
}
