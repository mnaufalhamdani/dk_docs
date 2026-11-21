// Fungsi murni untuk filter dashboard (aman dipakai di server maupun client): tanggal, preset, dan URL.

/** Kunci preset rentang tanggal; selain ini berarti rentang kustom. */
export const DAFTAR_PRESET = Object.freeze(['7', '30', '90', 'tahun_ini']);
/** Preset bawaan bila query string tidak memuat tanggal. */
export const PRESET_BAWAAN = '30';
/** Kelompok widget yang boleh diperluas lewat parameter `lihat` ("lihat semua"). */
export const DAFTAR_LIHAT = Object.freeze(['crb', 'peta', 'stub', 'beta']);
/** Batas rentang (hari) agar query tidak melebar tanpa batas. */
const MAKS_RENTANG_HARI = 3650;

/** Mengubah Date lokal menjadi YYYY-MM-DD (dibulatkan ke hari). */
export function formatTanggal(tanggal) {
  const dua = (n) => String(n).padStart(2, '0');
  return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
}

/** Tanggal hari ini (zona waktu server) dalam bentuk YYYY-MM-DD. */
export function hariIniLokal() {
  return formatTanggal(new Date());
}

/** Memeriksa teks YYYY-MM-DD yang benar-benar ada di kalender (bukan sekadar cocok pola). */
export function tanggalValid(teks) {
  if (typeof teks !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(teks)) return false;
  const [y, m, d] = teks.split('-').map(Number);
  const tanggal = new Date(y, m - 1, d);
  // Date menggeser tanggal yang tidak ada (31 Feb jadi Maret): bandingkan kembali untuk mendeteksinya
  return tanggal.getFullYear() === y && tanggal.getMonth() === m - 1 && tanggal.getDate() === d;
}

/** Menggeser tanggal YYYY-MM-DD sebanyak `hari` (boleh negatif). */
export function geser(teks, hari) {
  const [y, m, d] = teks.split('-').map(Number);
  return formatTanggal(new Date(y, m - 1, d + hari));
}

/** Rentang { dari, sampai } untuk sebuah preset, dihitung dari hari ini. */
export function rentangPreset(kunci, hariIni) {
  if (kunci === 'tahun_ini') return { dari: `${hariIni.slice(0, 4)}-01-01`, sampai: hariIni };
  const hari = Number(kunci);
  return { dari: geser(hariIni, -(hari - 1)), sampai: hariIni };
}

/** Mengenali preset dari pasangan tanggal; 'kustom' bila tidak ada yang cocok. */
export function kenaliPreset(dari, sampai, hariIni) {
  const cocok = DAFTAR_PRESET.find((k) => {
    const r = rentangPreset(k, hariIni);
    return r.dari === dari && r.sampai === sampai;
  });
  return cocok ?? 'kustom';
}

/** Mengurutkan id (teks digit) menurut nilai numeriknya tanpa kehilangan presisi. */
function urutkanId(daftar) {
  return [...new Set(daftar)].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
}

/**
 * Melengkapi dan menormalkan filter: repo unik dan terurut, tanggal valid dibulatkan ke hari,
 * bawaan 30 hari, dan tertukar dibetulkan. Hasilnya dipakai sebagai kunci cache.
 */
export function lengkapiFilter(mentah, hariIni) {
  const bawaan = rentangPreset(PRESET_BAWAAN, hariIni);
  const sampai = tanggalValid(mentah.sampai) ? mentah.sampai : tanggalValid(mentah.dari) ? hariIni : bawaan.sampai;
  let dari = tanggalValid(mentah.dari) ? mentah.dari : geser(sampai, -(Number(PRESET_BAWAAN) - 1));
  let akhir = sampai;
  // rentang terbalik: tukar agar tetap bermakna
  if (dari > akhir) [dari, akhir] = [akhir, dari];
  // rentang terlalu lebar: pangkas ke batas
  if (dari < geser(akhir, -MAKS_RENTANG_HARI)) dari = geser(akhir, -MAKS_RENTANG_HARI);
  return {
    repo: urutkanId(mentah.repo ?? []),
    dari,
    sampai: akhir,
    lihat: DAFTAR_LIHAT.includes(mentah.lihat) ? mentah.lihat : '',
  };
}

/** Membuat URL dashboard dari filter; parameter yang sama dengan bawaan tidak ditulis agar URL bersih. */
export function urlDashboard(filter, hariIni) {
  const p = new URLSearchParams();
  if (filter.repo?.length) p.set('repo', filter.repo.join(','));
  const bawaan = rentangPreset(PRESET_BAWAAN, hariIni);
  // tanggal bawaan (30 hari) tidak perlu ada di URL
  if (filter.dari !== bawaan.dari || filter.sampai !== bawaan.sampai) {
    p.set('dari', filter.dari);
    p.set('sampai', filter.sampai);
  }
  if (filter.lihat) p.set('lihat', filter.lihat);
  const teks = p.toString();
  return teks ? `/?${teks}` : '/';
}

/** Parameter query untuk membuka halaman daftar Perubahan dengan rentang dan repo (bila hanya satu) yang sama. */
export function paramDaftarPerubahan(filter, tambahan = {}) {
  const p = new URLSearchParams({ dari: filter.dari, sampai: filter.sampai, ...tambahan });
  // daftar Perubahan hanya mengenal satu repo; lebih dari satu berarti tidak difilter per repo
  if (filter.repo?.length === 1) p.set('repo_id', filter.repo[0]);
  return `/perubahan?${p.toString()}`;
}
