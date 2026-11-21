import { randomInt } from 'node:crypto';

/** Karakter yang dipakai unique_id: huruf kecil dan angka. */
const KARAKTER = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Membuat unique_id acak 8 karakter (huruf kecil/angka) untuk satu sesi prompt. */
export function buatUniqueId(panjang = 8) {
  let hasil = '';
  for (let i = 0; i < panjang; i += 1) hasil += KARAKTER[randomInt(KARAKTER.length)];
  return hasil;
}
