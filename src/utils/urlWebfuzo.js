/**
 * Membentuk URL halaman CR/B di webfuzo dari template per tipe.
 * `templates` berbentuk { CR: '...{nomor}...', B: '...{nomor}...' }.
 * Mengembalikan null bila template tipe itu kosong atau tidak memuat {nomor}.
 * Nomor dipakai apa adanya (tanpa menambah/membuang awalan), hanya di-URL-encode.
 */
export function bentukUrlDokumen(templates, tipe, nomor) {
  const template = templates?.[tipe];
  // template belum diisi di .env, atau tidak punya placeholder: tombol disembunyikan
  if (!template || !template.includes('{nomor}') || !nomor) return null;
  // split/join dipakai (bukan replace) agar karakter khusus pada nomor tidak ditafsirkan sebagai pola
  return template.split('{nomor}').join(encodeURIComponent(String(nomor)));
}
