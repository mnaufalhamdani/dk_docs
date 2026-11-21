/**
 * Membaca kolom JSON berisi array. MariaDB mengembalikan JSON sebagai teks, MySQL sebagai objek;
 * isi rusak / bukan array dianggap kosong supaya halaman tetap bisa dibuka dan diperbaiki.
 */
export function bacaDaftarJson(nilai) {
  if (nilai == null) return [];
  if (typeof nilai === 'string') {
    try {
      const hasil = JSON.parse(nilai);
      return Array.isArray(hasil) ? hasil : [];
    } catch {
      // isi rusak: anggap kosong
      return [];
    }
  }
  return Array.isArray(nilai) ? nilai : [];
}
