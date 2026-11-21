/** Panjang minimal kata agar masuk indeks FULLTEXT InnoDB (innodb_ft_min_token_size default). */
const MIN_TOKEN_FULLTEXT = 3;

/** Escape karakter khusus LIKE agar input user dicari apa adanya. */
export function bentukLike(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Menyusun ekspresi FULLTEXT boolean: tiap kata wajib ada dengan awalan (+kata*).
 * Hanya huruf/angka yang dipertahankan sehingga operator boolean dari user tidak lolos.
 * Mengembalikan null bila tidak ada kata yang cukup panjang.
 */
export function bentukEkspresiFulltext(q) {
  const kata = (q.match(/[\p{L}\p{N}]+/gu) ?? []).filter((k) => k.length >= MIN_TOKEN_FULLTEXT);
  return kata.length ? kata.map((k) => `+${k}*`).join(' ') : null;
}
