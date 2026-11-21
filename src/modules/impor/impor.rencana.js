import 'server-only';
import { DAFTAR_BAGIAN } from '@/enums';
import { AMBANG_MIRIP, cariPoinTerdekat, kemiripan, normalisasi } from './impor.kemiripan';
import { adaPending } from '@/modules/tautan/tautan.util';

/**
 * Penyusun rencana review: membandingkan JSON agen dengan registry yang ada dan menghasilkan
 * pohon modul -> menu -> halaman -> poin yang bisa diedit user sebelum disimpan.
 */
export function buatPenyusunRencana({ imporModel, modulModel, menuModel, halamanModel, dokumentasiModel, tautanModel }) {
  /** Mencari kandidat entitas untuk satu dependensi, sesuai tingkatnya, dalam satu repo. */
  async function cariKandidat(tingkat, repoId, dep) {
    if (tingkat === 'modul') return (await imporModel.cariModul(repoId, dep.nama)).map((k) => ({ id: k.id, label: k.nama }));
    if (tingkat === 'menu') return (await imporModel.cariMenu(repoId, dep.nama, dep.route)).map((k) => ({ id: k.id, label: `${k.modul_nama} / ${k.nama}` }));
    return (await imporModel.cariHalaman(repoId, dep.nama, dep.route)).map((k) => ({ id: k.id, label: `${k.menu_nama} / ${k.nama}` }));
  }

  /**
   * Menyusun daftar dependensi satu entitas. Tepat satu kecocokan: ditautkan otomatis;
   * tidak ada: bawaan "daftarkan stub"; lebih dari satu: bawaan "abaikan" sampai user memilih.
   */
  async function susunDependensi(daftar, tingkat, repoId, kunciDasar, dirinyaId) {
    const hasil = [];
    for (const [i, dep] of daftar.entries()) {
      const kandidat = (await cariKandidat(tingkat, repoId, dep)).filter((k) => k.id !== dirinyaId);
      let pilihan = 'stub';
      let targetId = null;
      // satu kecocokan jelas: tautkan otomatis
      if (kandidat.length === 1) {
        pilihan = 'tautkan';
        targetId = kandidat[0].id;
      } else if (kandidat.length > 1) {
        // ambigu: jangan menebak, biarkan user memilih
        pilihan = 'abaikan';
      }
      hasil.push({
        kunci: `${kunciDasar}-d${i}`,
        nama: dep.nama,
        route: dep.route,
        keterangan: dep.keterangan,
        tingkat,
        pilihan,
        target_id: targetId,
        otomatis: kandidat.length === 1,
        kandidat,
      });
    }
    return hasil;
  }

  /** Bentuk kandidat untuk dropdown sasaran: id, isi, dan tautan CR/B-nya (agar UI tahu bila poin bertautan). */
  const ringkasKandidat = (p) => ({ id: p.id, isi: p.isi, tautan: p.tautan ?? [] });

  /**
   * Mencocokkan teks dari agen ke satu poin lama (ubah/hapus); mengembalikan sebagian field item.
   * Bila agen menyebut `poin_id` yang valid dan belum terpakai, id itu dipakai langsung (tanpa menebak).
   */
  function cocokkan(teks, poinIdAgen, poinAda, kandidatBagian, dipakai) {
    const langsung = poinIdAgen ? poinAda.find((p) => String(p.id) === String(poinIdAgen) && !dipakai.has(p.id)) : null;
    // id dari agen cocok dengan poin yang ada: tidak perlu mengira-ngira dari kemiripan teks
    if (langsung) {
      dipakai.add(langsung.id);
      return { poin_id: langsung.id, teks_lama: langsung.isi, mirip: false, perlu_pilih: false, kandidat: [ringkasKandidat(langsung)], tautan: langsung.tautan ?? [] };
    }
    const { cocok, mirip, kandidat } = cariPoinTerdekat(teks, kandidatBagian.filter((p) => !dipakai.has(p.id)));
    // satu poin lama hanya boleh dicocokkan sekali
    if (cocok) dipakai.add(cocok.id);
    const kandidatLengkap = kandidat.map((k) => ringkasKandidat(poinAda.find((p) => p.id === k.id) ?? k));
    return { poin_id: cocok?.id ?? null, teks_lama: cocok?.isi ?? null, mirip, perlu_pilih: !cocok, kandidat: kandidatLengkap, tautan: cocok?.tautan ?? [] };
  }

  /**
   * Penyesuaian item ubah/hapus menurut jenis impor. Pada sinkron_modul, poin pending TIDAK ikut
   * dibandingkan: operasinya dibatalkan otomatis (user tetap bisa melihatnya).
   */
  function sesuaikanSinkron(jenis, item) {
    // jenis lain tidak mengubah perilaku
    if (jenis !== 'sinkron_modul') return item;
    return adaPending(item.tautan) ? { ...item, batal: true, dilewati_pending: true } : item;
  }

  /** Menyusun operasi poin satu halaman dari objek `bagian` agen terhadap poin yang ada. */
  function susunPoin(bagianAgen, poinAda, halamanAda, kunciDasar, jenis) {
    const dipakai = new Set();
    const hasil = [];
    let n = 0;
    const kunci = () => `${kunciDasar}-p${n++}`;

    for (const bagian of DAFTAR_BAGIAN) {
      const ops = bagianAgen[bagian];
      if (!ops) continue;
      const kandidatBagian = poinAda.filter((p) => p.bagian === bagian);

      for (const u of ops.ubah) {
        // halaman belum ada: tidak ada poin lama, perlakukan "menjadi" sebagai poin baru
        if (!halamanAda) {
          hasil.push({ kunci: kunci(), op: 'tambah', bagian, isi: u.menjadi, batal: false, status: 'beta', pending: false, jenis_impor: jenis, tautan: [] });
          continue;
        }
        const dasar = { kunci: kunci(), op: 'ubah', bagian, isi: u.menjadi, teks_dari: u.dari, batal: false, status: 'beta', pending: false, jenis_impor: jenis };
        hasil.push(sesuaikanSinkron(jenis, { ...dasar, ...cocokkan(u.dari, u.poin_id, poinAda, kandidatBagian, dipakai) }));
      }
      for (const h of ops.hapus) {
        // halaman belum ada: tidak ada yang bisa dihapus
        if (!halamanAda) continue;
        const dasar = { kunci: kunci(), op: 'hapus', bagian, isi: '', teks_dari: h.teks, batal: false, status: 'beta', pending: false, jenis_impor: jenis };
        hasil.push(sesuaikanSinkron(jenis, { ...dasar, ...cocokkan(h.teks, h.poin_id, poinAda, kandidatBagian, dipakai) }));
      }
      for (const teks of ops.tambah) {
        const duplikat = kandidatBagian.some((p) => normalisasi(p.isi) === normalisasi(teks));
        // identik/sangat mirip dengan poin yang sedang pending: jangan ditambahkan lagi
        const duplikatPending = !duplikat && kandidatBagian.some((p) => adaPending(p.tautan) && kemiripan(p.isi, teks) >= AMBANG_MIRIP);
        // teks sudah ada persis (atau mirip poin pending): lewati secara bawaan agar tidak dobel
        hasil.push({ kunci: kunci(), op: 'tambah', bagian, isi: teks, batal: duplikat || duplikatPending, duplikat, duplikat_pending: duplikatPending, status: 'beta', pending: false, jenis_impor: jenis, tautan: [] });
      }
    }
    return hasil;
  }

  /** Menempelkan tautan CR/B (aktif/pending) ke setiap poin sebuah halaman. */
  async function poinDenganTautan(halamanId) {
    const poin = await dokumentasiModel.poinByHalaman(halamanId);
    const tautan = await tautanModel.byPoinIds(poin.map((p) => p.id));
    return poin.map((p) => ({
      ...p,
      tautan: tautan.filter((x) => String(x.poin_id) === String(p.id)).map((x) => ({ id: x.id, perubahan_id: x.perubahan_id, tipe: x.tipe, nomor: x.nomor, status: x.status })),
    }));
  }

  /** Menyusun item halaman. */
  async function susunHalaman(h, menuAda, repoId, kunciDasar, jenis) {
    const ada = menuAda ? await halamanModel.byKode(menuAda.id, h.id_halaman) : null;
    const poinAda = ada ? await poinDenganTautan(ada.id) : [];
    return {
      kunci: kunciDasar,
      kode: h.id_halaman,
      aksi: h.aksi,
      ada: Boolean(ada),
      id: ada?.id ?? null,
      jenis: h.jenis,
      nama: h.nama,
      route: h.route,
      file_utama: h.file_utama,
      // menghapus halaman yang memang tidak ada: tidak ada yang dikerjakan
      batal: h.aksi === 'hapus' && !ada,
      dependensi: await susunDependensi(h.bergantung_pada, 'halaman', repoId, kunciDasar, ada?.id ?? null),
      poin: susunPoin(h.bagian, poinAda, Boolean(ada), kunciDasar, jenis),
    };
  }

  /** Menyusun item menu beserta halamannya. */
  async function susunMenu(mn, modulAda, repoId, kunciDasar, jenis) {
    const ada = modulAda ? await menuModel.byKode(modulAda.id, mn.id_menu) : null;
    const halaman = [];
    for (const [i, h] of mn.halaman.entries()) halaman.push(await susunHalaman(h, ada, repoId, `${kunciDasar}-h${i}`, jenis));
    return {
      kunci: kunciDasar,
      kode: mn.id_menu,
      aksi: mn.aksi,
      ada: Boolean(ada),
      id: ada?.id ?? null,
      nama: mn.nama,
      pola: mn.pola,
      route: mn.route,
      path_kode: mn.path_kode,
      ringkasan: mn.ringkasan,
      batal: mn.aksi === 'hapus' && !ada,
      dependensi: await susunDependensi(mn.bergantung_pada, 'menu', repoId, kunciDasar, ada?.id ?? null),
      halaman,
    };
  }

  /** Menyusun item modul beserta menunya. */
  async function susunModul(m, repoId, kunciDasar, jenis) {
    const ada = await modulModel.byKode(repoId, m.id_modul);
    const menu = [];
    for (const [i, mn] of m.menu.entries()) menu.push(await susunMenu(mn, ada, repoId, `${kunciDasar}-n${i}`, jenis));
    return {
      kunci: kunciDasar,
      kode: m.id_modul,
      aksi: m.aksi,
      ada: Boolean(ada),
      id: ada?.id ?? null,
      nama: m.nama,
      path_kode: m.path_kode,
      ringkasan: m.ringkasan,
      batal: false,
      dependensi: await susunDependensi(m.bergantung_pada, 'modul', repoId, kunciDasar, ada?.id ?? null),
      menu,
    };
  }

  return {
    /** Menyusun pohon rencana dari dokumen agen yang sudah valid. */
    async susun(dokumen, repoId) {
      const hasil = [];
      for (const [i, m] of dokumen.modul.entries()) hasil.push(await susunModul(m, repoId, `m${i}`, dokumen.jenis));
      return hasil;
    },
  };
}
