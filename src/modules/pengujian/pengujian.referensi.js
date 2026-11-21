import 'server-only';
import { KATEGORI_PERUBAHAN, STATUS_UJI } from '@/enums';
import { hitungSelPoin } from './pengujian.status';
import { bangunPanel, kunciPanel } from './pengujian.matriks';
import { formatLabelCr, normalisasiCr } from './pengujian.dokumen';

/** Panjang maksimal teks poin/skenario yang dikutip, dan jumlah maksimal skenario ringkas per poin. */
const MAKS_TEKS = 300;
const MAKS_SKENARIO = 8;

/** Kategori analisis perubahan yang berguna sebagai referensi perilaku tervalidasi. */
const KATEGORI_REFERENSI = [KATEGORI_PERUBAHAN.MATCHES, KATEGORI_PERUBAHAN.SUPPORTING];

/** Meringkas teks multibaris menjadi satu baris pendek. */
function ringkas(teks, maks = MAKS_TEKS) {
  const satuBaris = String(teks ?? '').replace(/\s+/g, ' ').trim();
  return satuBaris.length > maks ? `${satuBaris.slice(0, maks)}...` : satuBaris;
}

/** Butir poin yang lulus: teks poin, skenario ringkas, dan kategori perubahan dari analisis. */
function butirLulus(p) {
  const baris = [`- Poin ${p.nomor}: ${ringkas(p.isi)}`];
  const skenario = p.skenario.slice(0, MAKS_SKENARIO).map((s) => `${s.kode} ${ringkas(s.nama, 120)} [${s.jenis}]`);
  const sisa = p.skenario.length - skenario.length;
  if (skenario.length > 0) baris.push(`  - skenario: ${skenario.join('; ')}${sisa > 0 ? `; dan ${sisa} lainnya` : ''}`);
  for (const a of p.perubahan) baris.push(`  - perubahan (${a.kategori}): ${ringkas(a.ringkasan, 200)}${a.file.length ? ` (${a.file.join(', ')})` : ''}`);
  return baris;
}

/** Teks bagian "Hasil uji CR (referensi)"; kosong bila belum ada poin yang berstatus PASS, FAIL, atau BLOCKED. */
function formatReferensi({ crId, lulus, belumLulus }) {
  // belum ada hasil uji yang berarti: jangan menambah bagian kosong ke prompt
  if (lulus.length === 0 && belumLulus.length === 0) return '';
  const baris = [
    '',
    '',
    '## Hasil uji CR (referensi)',
    `CR ini sudah diuji tim testing (Uji CR ${crId}). Pakai sebagai referensi perilaku yang sudah tervalidasi.`,
    'Jika berbeda dengan kode, kode yang benar. Status PASS pada pengujian BUKAN berarti perubahan sudah live.',
  ];
  if (lulus.length > 0) baris.push('', '### Sudah lulus uji (PASS)', ...lulus.flatMap(butirLulus));
  if (belumLulus.length > 0) {
    baris.push('', '### Belum lulus uji (FAIL/BLOCKED)', 'Hanya catatan: poin berikut belum lulus uji, jadi dokumentasinya mungkin berubah.');
    for (const p of belumLulus) baris.push(`- Poin ${p.nomor} (${p.status}): ${ringkas(p.isi)}`);
  }
  return baris.join('\n');
}

/** Analisis perubahan (matches/supporting) sebuah sel dari putaran terbaru yang memuatnya. */
function perubahanSel(perubahan, poinId, repoId) {
  const cocok = perubahan.filter((x) => x.poin_id === poinId && x.repo_id === repoId && KATEGORI_REFERENSI.includes(x.kategori));
  const terbaru = Math.max(0, ...cocok.map((x) => Number(x.putaran_nomor)));
  return cocok.filter((x) => Number(x.putaran_nomor) === terbaru);
}

/**
 * Referensi hasil uji untuk prompt "Usulkan perubahan dokumentasi": mencari pengujian dengan CR ID yang sama
 * (tanpa membedakan huruf besar/kecil) dan meringkas status poin pada repo prompt itu.
 */
export function buatReferensiUji({ pengujianModel }) {
  return {
    /** Teks referensi untuk satu repo; string kosong bila tidak ada pengujian atau belum ada hasil berarti. */
    async ringkasan({ nomor, tipe, repoId }) {
      // Uji CR menyimpan nomor polos, sedangkan nomor perubahan bisa berawalan (mis. bugfix "B..."): cocokkan bentuk bakunya
      const pengujian = await pengujianModel.byCrId(normalisasiCr(nomor));
      // tidak ada pengujian untuk CR ini: prompt tetap seperti semula
      if (!pengujian) return '';
      const [poin, targetSemua, sel, skenario, perubahan] = await Promise.all([
        pengujianModel.poinByPengujian(pengujian.id),
        pengujianModel.targetRepo(pengujian.id),
        pengujianModel.selPutaran(pengujian.id),
        pengujianModel.skenarioByPengujian(pengujian.id),
        pengujianModel.perubahanByPengujian(pengujian.id),
      ]);
      const targetRepo = targetSemua.filter((t) => t.repo_id === repoId);
      const status = hitungSelPoin({ target: targetRepo, sel, skenario: skenario.filter((s) => s.poin_id !== null) });
      const panel = bangunPanel({ targetRepo, sel, skenario });
      const daftar = poin
        .filter((p) => status.get(p.id))
        .map((p) => ({
          ...p,
          status: status.get(p.id)[repoId],
          skenario: panel[kunciPanel(p.id, repoId)].skenario.filter((s) => s.status === 'PASS'),
          perubahan: perubahanSel(perubahan, p.id, repoId),
        }));
      return formatReferensi({
        crId: formatLabelCr(nomor, { tipe, nomor }),
        lulus: daftar.filter((p) => p.status === STATUS_UJI.PASS),
        belumLulus: daftar.filter((p) => p.status === STATUS_UJI.FAIL || p.status === STATUS_UJI.BLOCKED),
      });
    },
  };
}
