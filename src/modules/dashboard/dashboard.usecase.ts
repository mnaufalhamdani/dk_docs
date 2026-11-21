import 'server-only';
import { MASA_CACHE_DASHBOARD, TAG_DASHBOARD } from './dashboard.cache';

/** Mengubah nilai hitungan dari database (bisa berupa string) menjadi angka. */
const angka = (nilai) => Number(nilai ?? 0);

/** Usecase dashboard: membentuk data widget dari hasil agregat model dan menyimpannya di cache. */
export function buatDashboardUsecase({ dashboardModel, cacheHasil }) {
  /**
   * Menjalankan pengambilan data lewat cache bawaan Next.js. Kunci mencakup nama widget dan
   * filter yang sudah dinormalisasi; seluruhnya ditandai agar bisa dikosongkan sekaligus.
   */
  function dariCache(widget, filter, ambil) {
    return cacheHasil(ambil, ['dashboard', widget, JSON.stringify(filter)], { revalidate: MASA_CACHE_DASHBOARD, tags: [TAG_DASHBOARD] })();
  }

  /** Mengelompokkan baris UNION antrean menurut kolom `kelompok`. */
  function kelompokkanAntrean(baris) {
    const hasil = { crb: [], peta: [], stub: [] };
    const total = { crb: 0, peta: 0, stub: 0 };
    let sync = null;
    for (const b of baris) {
      // baris penanda waktu Sync terakhir
      if (b.kelompok === 'sync') {
        sync = b.waktu ?? null;
        continue;
      }
      total[b.kelompok] = angka(b.total);
      hasil[b.kelompok].push(b);
    }
    return { hasil, total, sync };
  }

  /** Kelengkapan dokumentasi satu modul: belum, sebagian, atau lengkap. */
  function kelengkapan(m) {
    const halaman = angka(m.jumlah_halaman);
    const berpoin = angka(m.halaman_berpoin);
    // stub atau tidak ada halaman yang punya poin: belum didokumentasikan
    if (m.is_stub || berpoin === 0) return 'belum';
    return berpoin < halaman ? 'sebagian' : 'lengkap';
  }

  return {
    /** Daftar repo untuk pilihan filter (ringan, tanpa cache). */
    repoOpsi: () => dashboardModel.repoOpsi(),

    /** Widget 1: angka kartu ringkasan. */
    kartu(filter) {
      return dariCache('kartu', filter, async () => {
        const b = await dashboardModel.kartu(filter);
        return {
          repo: angka(b.jumlah_repo),
          modul: angka(b.jumlah_modul),
          halaman: angka(b.jumlah_halaman),
          crb: angka(b.jumlah_crb),
          crb_belum_dokumentasi: angka(b.crb_belum_dokumentasi),
          poin_beta: angka(b.poin_beta),
          poin_pending: angka(b.poin_pending),
          modul_stub: angka(b.modul_stub),
        };
      });
    },

    /** Widget 2: antrean "Perlu tindakan" (CR/B belum didokumentasi, belum dipetakan, modul stub). */
    antrean(filter) {
      return dariCache('antrean', filter, async () => {
        const { hasil, total, sync } = kelompokkanAntrean(await dashboardModel.antrean(filter));
        return {
          sync_terakhir: sync,
          crb: {
            total: total.crb,
            item: hasil.crb.map((b) => ({ id: b.ref_id, tipe: b.label_a, nomor: b.label_b, tanggal: b.waktu, belum_dipetakan: Boolean(angka(b.belum_dipetakan)) })),
          },
          // kelompok ini hanya dihitung untuk "Semua repo"
          peta: {
            tersedia: filter.repo.length === 0,
            total: total.peta,
            item: hasil.peta.map((b) => ({ perubahan_id: b.ref_id, modul_sumber: b.label_a, menu_sumber: b.label_b, jumlah_pesan: angka(b.jumlah), tanggal: b.waktu })),
          },
          stub: {
            total: total.stub,
            item: hasil.stub.map((b) => ({ id: b.ref_id, repo_nama: b.label_a, nama: b.label_b })),
          },
        };
      });
    },

    /** Widget 3: peta modul per repo, diwarnai menurut kelengkapan dokumentasi. */
    petaModul(filter) {
      return dariCache('peta_modul', filter, async () => {
        const perRepo = new Map();
        for (const b of await dashboardModel.petaModul(filter)) {
          const repo = perRepo.get(b.repo_id) ?? { id: b.repo_id, nama: b.repo_nama, modul: [] };
          // repo tanpa modul muncul sekali dengan modul_id kosong (LEFT JOIN)
          if (b.modul_id) {
            repo.modul.push({
              id: b.modul_id,
              nama: b.modul_nama,
              stub: Boolean(b.is_stub),
              kelengkapan: kelengkapan(b),
              halaman: angka(b.jumlah_halaman),
              berpoin: angka(b.halaman_berpoin),
              diperbarui: b.diperbarui ?? null,
            });
          }
          perRepo.set(b.repo_id, repo);
        }
        return [...perRepo.values()];
      });
    },

    /** Widget 4: aktivitas terbaru (CR/B dan dokumentasi yang diubah). Tanpa nama developer. */
    aktivitas(filter) {
      return dariCache('aktivitas', filter, async () => {
        const baris = await dashboardModel.aktivitas(filter);
        return baris.map((b) =>
          b.jenis === 'perubahan'
            ? { jenis: 'perubahan', id: b.ref_id, tipe: b.tipe, nomor: b.nama, waktu: b.waktu, jumlah_pesan: angka(b.jumlah), belum_dipetakan: Boolean(angka(b.belum_dipetakan)) }
            : { jenis: 'dokumentasi', id: b.ref_id, halaman_id: b.halaman_id, menu_id: b.menu_id, halaman_nama: b.nama, konteks: b.konteks, waktu: b.waktu },
        );
      });
    },

    /** Widget 5: poin beta terbaru dikelompokkan per halaman, beserta total seluruhnya. */
    poinBeta(filter) {
      return dariCache('poin_beta', filter, async () => {
        const baris = await dashboardModel.poinBeta(filter);
        const kelompok = new Map();
        for (const b of baris) {
          const g = kelompok.get(b.halaman_id) ?? { halaman_id: b.halaman_id, menu_id: b.menu_id, judul: `${b.repo_nama} / ${b.modul_nama} / ${b.halaman_nama}`, poin: [] };
          g.poin.push({ id: b.id, isi: b.isi, bagian: b.bagian, pending: Boolean(angka(b.pending)) });
          kelompok.set(b.halaman_id, g);
        }
        return { total: angka(baris[0]?.total), jumlah_tampil: baris.length, kelompok: [...kelompok.values()] };
      });
    },
  };
}
