// Pencocokan teks poin blueprint dengan registry modul/menu/halaman (tanpa AI, fungsi murni).

/** Istilah yang lebih pendek dari ini diabaikan (terlalu umum). */
const MIN_PANJANG_ISTILAH = 3;

/** Menormalkan teks/istilah: huruf kecil, '-' dan '_' menjadi spasi, spasi dirapatkan. */
function normal(teks) {
  return String(teks ?? '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape karakter khusus regex. */
function esc(teks) {
  return teks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Posisi pertama istilah (sebagai kata utuh) di dalam teks ternormalisasi, atau -1 bila tidak ada. */
function posisiKata(teks, istilah) {
  const t = normal(istilah);
  // istilah terlalu pendek: terlalu banyak salah cocok
  if (t.length < MIN_PANJANG_ISTILAH) return -1;
  const m = new RegExp(`(?<![\\p{L}\\p{N}])${esc(t)}(?![\\p{L}\\p{N}])`, 'u').exec(teks);
  return m ? m.index : -1;
}

/** Posisi route di dalam teks (pencarian substring, huruf kecil), atau -1. */
function posisiRoute(teksAsli, route) {
  // route kosong / terlalu pendek tidak dipakai
  if (!route || route.length < MIN_PANJANG_ISTILAH) return -1;
  return teksAsli.toLowerCase().indexOf(route.toLowerCase());
}

/** Posisi terkecil dari kumpulan istilah (kata utuh) dan route; -1 bila tidak ada yang cocok. */
function cocokTerkecil(teks, teksAsli, istilah, route) {
  const posisi = [...istilah.map((i) => posisiKata(teks, i)), posisiRoute(teksAsli, route)].filter((p) => p >= 0);
  return posisi.length ? Math.min(...posisi) : -1;
}

/**
 * Membangun indeks pencarian dari data registry satu repo.
 * Masukan: modul/menu/halaman (baris tabel) dan alias/kata kunci.
 */
export function bangunIndeks({ modul, menu, halaman, aliasModul, aliasMenu, kataKunciHalaman }) {
  return {
    modul: modul.map((m) => ({ id: m.id, istilah: [m.nama, m.kode, ...aliasModul.filter((a) => a.modul_id === m.id).map((a) => a.alias)] })),
    menu: menu.map((m) => ({ id: m.id, modul_id: m.modul_id, istilah: [m.nama, m.kode, ...aliasMenu.filter((a) => a.menu_id === m.id).map((a) => a.alias)], route: m.route })),
    halaman: halaman.map((h) => ({
      id: h.id,
      menu_id: h.menu_id,
      nama: h.nama,
      kunci: kataKunciHalaman.filter((k) => k.halaman_id === h.id).map((k) => k.kata_kunci),
      route: h.route,
    })),
  };
}

/** Mencari menu yang disebut dalam teks. */
function cariMenu(teks, teksAsli, indeks) {
  return indeks.menu
    .map((m) => ({ m, posisi: cocokTerkecil(teks, teksAsli, m.istilah, m.route) }))
    .filter((x) => x.posisi >= 0);
}

/**
 * Halaman yang disebut: cocok lewat route/kata kunci, atau lewat nama bila menunya juga disebut
 * (nama halaman seperti "Form"/"Daftar" terlalu umum bila berdiri sendiri).
 */
function cariHalaman(teks, teksAsli, indeks, menuCocok) {
  const idMenu = new Set(menuCocok.map((x) => x.m.id));
  const hasil = [];
  for (const h of indeks.halaman) {
    const spesifik = cocokTerkecil(teks, teksAsli, h.kunci, h.route);
    const lewatNama = idMenu.has(h.menu_id) ? posisiKata(teks, h.nama) : -1;
    const posisi = [spesifik, lewatNama].filter((p) => p >= 0);
    if (posisi.length) hasil.push({ h, posisi: Math.min(...posisi) });
  }
  return hasil;
}

/**
 * Mencocokkan satu poin. Mengembalikan daftar modul yang disebut, terurut dari skor tertinggi
 * (lalu yang disebut paling awal): [{ modul_id, skor, posisi, menu_ids, halaman_ids }].
 */
export function cocokkanPoin(teksAsli, indeks) {
  const teks = normal(teksAsli);
  const peta = new Map();
  /** Mengambil/menyiapkan entri sebuah modul pada peta hasil. */
  const entri = (modulId) => {
    if (!peta.has(modulId)) peta.set(modulId, { modul_id: modulId, skor: 0, posisi: Infinity, menu_ids: [], halaman_ids: [] });
    return peta.get(modulId);
  };

  for (const m of indeks.modul) {
    const jumlah = m.istilah.filter((i) => posisiKata(teks, i) >= 0).length;
    // modul tidak disebut sama sekali: lewati
    if (jumlah === 0) continue;
    const e = entri(m.id);
    e.skor += jumlah;
    e.posisi = Math.min(e.posisi, ...m.istilah.map((i) => posisiKata(teks, i)).filter((p) => p >= 0));
  }
  const menuCocok = cariMenu(teks, teksAsli, indeks);
  for (const { m, posisi } of menuCocok) {
    const e = entri(m.modul_id);
    e.skor += 2; // menu yang disebut lebih spesifik daripada nama modul
    e.posisi = Math.min(e.posisi, posisi);
    e.menu_ids.push(m.id);
  }
  for (const { h, posisi } of cariHalaman(teks, teksAsli, indeks, menuCocok)) {
    const menu = indeks.menu.find((m) => m.id === h.menu_id);
    const e = entri(menu.modul_id);
    e.skor += 1;
    e.posisi = Math.min(e.posisi, posisi);
    e.halaman_ids.push(h.id);
  }
  return [...peta.values()].sort((a, b) => b.skor - a.skor || a.posisi - b.posisi);
}

/**
 * Mengubah hasil pencocokan menjadi baris target { modul_id, menu_id, halaman_id, peran }.
 * Modul teratas menjadi pemilik, modul lain hanya terkait (konteks). Setiap entitas disimpan
 * pada tingkat paling spesifik yang disebut (halaman > menu > modul).
 */
export function susunTarget(hasil, indeks) {
  const baris = [];
  hasil.forEach((e, i) => {
    const peran = i === 0 ? 'pemilik' : 'terkait';
    const menuTertutup = new Set();
    for (const hid of e.halaman_ids) {
      const h = indeks.halaman.find((x) => x.id === hid);
      baris.push({ modul_id: e.modul_id, menu_id: h.menu_id, halaman_id: hid, peran });
      menuTertutup.add(h.menu_id);
    }
    for (const mid of e.menu_ids) {
      // menu sudah terwakili oleh halamannya: tidak perlu baris tambahan
      if (!menuTertutup.has(mid)) baris.push({ modul_id: e.modul_id, menu_id: mid, halaman_id: null, peran });
    }
    // hanya nama modul yang disebut: satu baris tingkat modul
    if (e.menu_ids.length === 0 && e.halaman_ids.length === 0) baris.push({ modul_id: e.modul_id, menu_id: null, halaman_id: null, peran });
  });
  return baris;
}
