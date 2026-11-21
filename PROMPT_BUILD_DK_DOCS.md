# PROMPT: Bangun DK Docs

> **Cara pakai:** taruh file ini dan `schema.sql` di root project, lalu di chat agent tulis:
> `Baca PROMPT_BUILD_DK_DOCS.md lalu kerjakan Fase 1.`
> Kerjakan **satu fase per permintaan**. Jika fase tidak disebut, mulai dari Fase 1.

---

## 1. Tujuan

**DK Docs** adalah website internal untuk developer dengan dua fungsi:

1. **Belajar sistem**: mencari repo/modul/menu/halaman sebuah aplikasi dan membaca dokumentasinya yang **singkat dan padat** tanpa membuka kode.
2. **Tracking perubahan**: melacak perubahan berdasarkan nomor **CR** (change request) dan **B** (bugfix), dengan pencarian isi pesan pengerjaan.

Dokumentasi **tidak ditulis oleh website**. Alurnya:

```
Website membuat prompt (.md / salin)  ->  developer menjalankannya di agent pada repo target
 ->  agent menulis JSON hasil ke folder doc-generated/ (di repo target)  ->  JSON diimpor ke website
 ->  developer meninjau & mengedit  ->  Simpan (langsung final)
```

Tahap saat ini adalah **prototype**, **satu project Next.js**, tanpa API eksternal. Alurnya `*.jsx` (tampilan) -> `*.controller.ts` -> `*.usecase.ts` -> `*.model.js`, dan model **langsung query MySQL**. Nanti dipindah bertahap ke API: `*.model.js` diganti `*.service.js` (komunikasi ke API/URL lain) **tanpa mengubah usecase**, jadi arsitektur harus memudahkan penggantian sumber data (lihat bagian 2). **Tanpa login** (jaringan internal).

**Contoh data nyata untuk dijadikan acuan:**

```
Repo: DK Apps
 └─ Modul: Transport
     ├─ Menu: Transport Daily     (pola: crud)  -> Halaman: Daftar, Form, Detail
     ├─ Menu: Transport Monthly   (pola: crud)  -> Halaman: Daftar, Form, Detail
     └─ Menu: Transport Khusus    (pola: crud)  -> Halaman: Daftar, Form, Detail
```

---

## 2. Aturan pengerjaan

- Jika project memiliki `rules.md` dan `architecture.md`, **baca dan ikuti keduanya**. Jika bertentangan dengan dokumen ini, keduanya yang menang; catat konfliknya di laporan akhir.
- **Scope**: kerjakan hanya fase yang diminta. Jangan mengubah file di luar kebutuhan fase.
- **Tanpa test** (unit/widget/dll) kecuali diminta khusus.
- **Jangan menghapus kode** yang tidak terpakai atau yang dikomentari, baik milik project maupun yang ditulis dalam pengerjaan ini.
- **Jangan commit.** Perubahan ditinjau developer lewat editor.
- **Berhenti hanya jika butuh keputusan**; selain itu selesaikan fase sampai tuntas.
- **Arsitektur (clean architecture + dependency injection).** Satu project Next.js, **satu pola modul**: tiap modul berisi semua lapisannya dalam satu folder `src/modules/<modul>/`. Struktur folder di bagian 4 adalah **acuan**: ikuti polanya, tambahkan yang kurang seperlunya, dan catat penyimpangan di laporan.
  - **Alur:** `*.jsx` (tampilan/interaksi) -> `<modul>.controller.ts` (penghubung tampilan dan usecase; validasi input memakai `<modul>.schema.js`; logika ringan) -> `<modul>.usecase.ts` (logika bisnis dan orkestrasi data) -> `<modul>.model.js` (**semua query SQL ada di model**, tidak boleh di lapisan lain).
  - Tampilan membaca data dengan memanggil controller langsung pada komponen halaman, dan mengubah data lewat **Actions Next.js** (fungsi berdirektif `'use server'`) yang memanggil controller. Controller adalah satu-satunya pintu dari tampilan ke usecase.
  - `<modul>.routes.js`: daftar endpoint HTTP modul (metode, path, fungsi controller, schema). Dipakai untuk kebutuhan yang tidak cocok dengan Actions: unduh `.md`, upload/tampil gambar, health, dan kelak API. File di `src/app/api/` hanya menyalurkan ke daftar ini.
  - `<modul>.service.js` **opsional**: hanya dibuat untuk komunikasi ke API/URL lain (belum dipakai di prototype). Kelak ia menggantikan `*.model.js` tanpa mengubah usecase.
  - **Dependency injection global** di `src/di/container.js` (awilix): model, usecase, dan controller diregistrasi di sana. Dependency **tidak dibuat di dalam class/function**: controller menerima usecase dari container, usecase menerima model dari container.
  - Pasang paket `server-only` (`import 'server-only'`) pada `*.model.js` dan `*.usecase.ts` agar kode database tidak ikut ke browser. File di `src/app/` hanya routing tipis, **tanpa logika**.
  - Saat dev (hot reload), simpan container DI dan pool MySQL di `globalThis` agar tidak dibuat berulang.
- **Dokumentasi kode:** setiap function diberi komentar ringkas dalam **Bahasa Indonesia**. Setiap percabangan non-trivial (if/else, switch, try-catch, loop bersyarat) diberi komentar singkat tentang **alasan/maksud**, bukan mengulang isi kode. Cek ulang komentar ini sebelum selesai.
- **Kompleksitas:** nesting maksimal 2-3 level (pakai early return / extract function), function ±40-50 baris maksimal, satu function satu tanggung jawab, logika berulang di banyak file diekstrak ke helper.
- **Keamanan:** semua query **parameterized**; koneksi ke database sumber CR/B memakai user **read-only**; kredensial hanya di `.env` (sediakan `.env.example`, jangan commit `.env`).

---

## 3. Teknologi

- **Next.js (App Router)**, React, JavaScript. `tsconfig` dengan `allowJs` agar `*.controller.ts` dan `*.usecase.ts` (sesuai referensi) bisa hidup berdampingan dengan file JS lain.
- **Node.js 20+**, **awilix** (DI), **mysql2** (connection pool, tanpa ORM, SQL ditulis di `*.model.js`).
- State tampilan memakai React hooks (`useState`/`useReducer`), tanpa library store. **Tailwind CSS** untuk gaya. Library drag-and-drop bebas dipilih (misal `@dnd-kit`).
- Validasi (`*.schema.js` dan JSON impor): **zod**.
- Upload gambar lewat `request.formData()` di route handler, disimpan ke folder `uploads/`.
- i18n cukup `src/locales/id_ID.json` dengan helper `t()` sederhana di `src/utils/` (tanpa library).
- Database: **MySQL 8**, nama `dk_docs`, skema di `schema.sql`.
- `package.json` bernama `dk-docs`; judul aplikasi di UI: **DK Docs**.

---

## 4. Struktur folder (acuan)

Satu project, **satu pola modul**. Pola utama mengikuti referensi developer; yang diberi tanda `+` adalah tambahan di luar referensi. Folder yang tidak dibutuhkan **tidak dibuat**.

```
dk-docs/
├── schema.sql
├── .env.example
├── uploads/                           # + gambar halaman (masuk .gitignore)
└── src/
    ├── app/                           # + routing Next.js (App Router), tipis, tanpa logika
    │   ├── layout.jsx
    │   ├── page.jsx                   # beranda
    │   ├── <halaman UI>/page.jsx      # memakai komponen dari modules/<modul>
    │   └── api/v1/<modul>/route.js    # menyalurkan ke <modul>.routes.js
    ├── assets/                        # contoh-impor.json untuk uji manual
    ├── config/                        # database.js (dashboard), database.sumber.js (read-only),
    │                                  #   sumber.config.js, i18n
    ├── di/                            # Global dependency injection (container.js, awilix)
    ├── enums/                         # + konstanta: bagian dokumentasi, jenis halaman, pola menu,
    │                                  #   status poin, tipe CR/B, jenis sesi
    ├── locales/                       # id_ID.json
    ├── logger/                        # + catat error
    ├── middlewares/                   # + pembungkus endpoint HTTP: validasi (*.schema.js), error global
    ├── modules/                       # modul bisnis
    │   ├── health/                    # + cek health
    │   ├── layout/                    # + sidebar pohon, topbar, palet pencarian
    │   ├── shared/                    # + komponen lintas modul: badge, editor poin, diff
    │   └── <modul>/
    │       ├── *.jsx                  # tampilan / interaksi user
    │       ├── <modul>.controller.ts  # penghubung tampilan dan usecase
    │       ├── <modul>.usecase.ts     # logika bisnis
    │       ├── <modul>.model.js       # akses data / query database
    │       ├── <modul>.routes.js      # daftar endpoint HTTP
    │       ├── <modul>.schema.js      # validasi input / tampilan
    │       └── <modul>.service.js     # + opsional: komunikasi ke API/URL lain (nanti)
    ├── templates/
    │   └── prompts/                   # + template prompt .md ({{...}}), isi di bagian 9
    └── utils/                         # + helper global: responseHandler, pembuat uniqueId,
                                       #   pemecah poin blueprint, t() i18n, dll
```

Dari referensi, `config/apiClient`, `guard`, `pinia`, dan `router` **tidak dibuat**: tidak ada API eksternal, tidak ada login, tidak ada library store, dan routing memakai `src/app/`. Ejaan berkas dibakukan menjadi `*.controller.ts`. Endpoint HTTP berawalan `/api/v1/<modul>`.

**Daftar modul aplikasi** (jangan dibingungkan dengan "modul" pada hierarki dokumentasi):

| Modul | Tanggung jawab |
|---|---|
| `repo` | CRUD repo |
| `modul` | CRUD modul, alias (`database`, `kata_kunci`), dependensi modul |
| `menu` | CRUD menu (pola, route), alias, dependensi menu |
| `halaman` | CRUD halaman (jenis, route, file utama), kata kunci, gambar, dependensi halaman |
| `dokumentasi` | poin dokumentasi, flag `beta`/`live`, "jadikan semua live", riwayat versi |
| `perubahan` | perubahan CR/B, pesan, pemetaan modul/menu, dampak, pencarian isi pesan, riwayat |
| `sync` | baca database sumber (read-only), pratinjau, simpan (lihat bagian 5) |
| `prompt` | `sesi_prompt`, pembuat prompt dari template A-D, unduh `.md` |
| `impor` | `impor_hasil`, validasi JSON, review, simpan dalam transaksi |
| `blueprint` | blueprint, pemecah poin, pencocokan, kelompok, urutan |
| `pencarian` | pencarian global (modul, menu, halaman, isi poin, perubahan) |
| `pengaturan` | tabel `pengaturan` |

---

## 5. Database

- Gunakan `schema.sql` apa adanya (27 tabel, konvensi **snake_case**, nama tabel **singular**). Sediakan script `npm run db:init` untuk menjalankannya dan `npm run db:seed` untuk data contoh (repo **DK Apps** -> modul **Transport** -> tiga menu CRUD -> halaman Daftar, Form, Detail, dengan beberapa poin contoh) sebagai bahan uji manual. Jangan mengubah nama tabel/kolom tanpa alasan kuat; jika perlu, catat di laporan.
- Database dashboard (`dk_docs`) dan **database sumber CR/B terpisah**. Sumber hanya dibaca.
- Kolom `*_kunci` pada tabel `perubahan_pesan_peta`, `perubahan_dampak`, `audit_bugfix_dampak`, dan `blueprint_poin_target` adalah **generated column** agar UNIQUE bekerja pada kolom opsional (`menu_id`, `halaman_id`). Saat `INSERT`, **jangan mengisi** kolom `*_kunci`.
- **Nama tabel/kolom di database sumber tidak rapi dan belum diketahui. Jangan ditebak.** Buat `src/modules/sync/sync.model.js` yang memakai pool read-only `src/config/database.sumber.js` dan membaca pemetaan dari `src/config/sumber.config.js`. Fungsinya berupa satu kontrak, misalnya `ambilPesanPerNomor(tipe, nomor)`; kelak `sync.service.js` (versi API) mengimplementasikan fungsi yang sama dan ditukar lewat DI:

```js
// Contoh bentuk konfigurasi; nilainya DIISI developer, bukan ditebak agent.
export default {
  tabel: '<ISI>',
  kolom: {
    sumber_id: '<ISI>',   // id unik baris pesan pengerjaan
    nomor: '<ISI>',       // nomor CR/B, misal CR2605060003
    pesan: '<ISI>',
    developer: '<ISI>',
    tanggal: '<ISI>',
    modul: '<ISI>',       // nama mentah (bisa level modul atau level menu)
  },
  // cara menentukan tipe dari nomor: awalan 'CR' atau 'B'
};
```
Jika konfigurasi masih `<ISI>`, fitur Sync menampilkan pesan jelas bahwa konfigurasi sumber belum diisi (bukan error).

---

## 6. Konsep domain (wajib dipahami)

- **Hierarki empat tingkat:** `Repo -> Modul -> Menu -> Halaman`, lalu `Bagian -> Poin` di dalam halaman.
  - **Repo**: satu repository git (aplikasi, API, website masing-masing sendiri), contoh **DK Apps**. Dokumentasi per repo.
  - **Modul**: folder module, atau path di luar folder module, contoh **Transport**. **Kode bersama (helper, base class) bukan modul.**
  - **Menu**: menu di aplikasi, contoh **Transport Daily**. Punya `pola`: `crud` atau `lainnya`.
  - **Halaman**: layar/route di dalam menu. **Tempat dokumentasi detail.** Punya `jenis`: `daftar`, `form`, `detail`, `lainnya`.
  - **Pola CRUD:** menu `crud` berisi halaman standar **Daftar** (termasuk filter, paginasi, dan aksi **hapus**), **Form** (tambah dan ubah digabung bila memakai satu form), dan **Detail** (hanya bila layarnya ada). **Hapus adalah aksi, bukan halaman.**
  - **Bagian** (nilai tetap): `tujuan`, `komponen_ui`, `validasi`, `alur`, `api`, `catatan`.
  - **Poin**: satu butir dokumentasi dengan flag `beta` (masih testing) atau `live` (sudah rilis). **Flag per poin.** Poin hasil impor default `beta`; diubah manual ke `live`.
- **Alias database** (nama di data CR/B sumber) bisa menunjuk **modul atau menu**; keduanya didukung (`modul_alias`, `menu_alias`). Kata kunci pencocokan blueprint ada di modul, menu, dan halaman.
- **Stub** (`is_stub = 1`) berlaku untuk modul, menu, dan halaman: terdaftar tapi belum didokumentasikan; tampil redup dengan label "belum didokumentasikan". Menjadi non-stub saat dokumentasinya disimpan.
- **Dependensi** satu tingkat saja (`dependensi_modul`, `dependensi_menu`, `dependensi_halaman`), sebagai tautan referensi; tidak didokumentasikan berantai.
- **Dampak** (`perubahan_dampak`, `audit_bugfix_dampak`): saat impor disimpan, catat modul/menu/halaman yang benar-benar berubah (dari JSON). Dasar tab **Riwayat** pada modul, menu, dan halaman.
- **Gaya dokumentasi: singkat, padat, jelas.** Satu poin satu kalimat sudah cukup; lebih panjang hanya jika perlu. Batas lunak dari tabel `pengaturan` (`batas_karakter_poin`, `batas_kalimat_poin`): **peringatan**, bukan penolakan.
- **Nomor CR/B** berbentuk `CR2605060003` dan `B2609090002`. Commit tanpa nomor memakai awalan `bugfix:`, `refactor:`, `optimize:`, `docs:`.
- **Simpan = final.** Tidak ada status draf/disetujui. Riwayat versi disimpan diam-diam di `halaman_versi` (snapshot) setiap kali halaman disimpan.

---

## 7. Fase pengerjaan

### Fase 1 - Fondasi, registry, dokumentasi

1. Setup Next.js (App Router, JavaScript; `tsconfig` dengan `allowJs`), awilix di `src/di/`, pool MySQL, pembungkus endpoint HTTP (validasi dan error global), `responseHandler`, logger, `/api/v1/health`, i18n `id_ID`, layout dasar bernama **DK Docs**, serta modul `pengaturan` (baca/ubah tabel `pengaturan`). Script `db:init` dan `db:seed`.
2. CRUD **repo**, **modul** (alias `database` dan `kata_kunci`), **menu** (route, pola, alias), **halaman** (jenis, route, file utama, kata kunci). Saat membuat menu berpola `crud`, tawarkan membuat halaman standar Daftar, Form, Detail sekaligus.
3. **Editor poin** per halaman: tambah, edit, hapus, urutkan (drag), pilih bagian, flag `beta`/`live` per poin, **penghitung karakter**, penanda peringatan bila melewati batas. Tombol **"Jadikan semua live"** (per halaman, menu, dan modul). Upload gambar opsional (`gambar_halaman`, file di disk). Tulis `halaman_versi` tiap simpan.
4. **Tampilan baca**: sidebar pohon **Repo -> Modul -> Menu** (halaman **tidak** masuk sidebar); detail menu menampilkan halaman sebagai **tab** (Daftar | Form | Detail | Riwayat); badge "ada poin beta" pada modul/menu/halaman yang masih punya poin beta; stub tampil redup.
5. **Pencarian** (palet Ctrl/Cmd+K): nama, route, alias, kata kunci (modul/menu/halaman) dan isi poin (FULLTEXT); hasil dikelompokkan.

**Selesai jika:** bisa membuat DK Apps -> Transport -> Transport Daily -> Daftar/Form/Detail, menulis dan menyimpan poin, mengubah flag, melihat versi tersimpan di database, dan mencari.

### Fase 2 - Sync CR/B dan riwayat

1. Tombol **Sync**: pilih tipe (CR/B) -> input nomor -> ambil dari sumber lewat `sync.model.js` -> **pratinjau** -> Simpan. Ambil: nomor, isi pesan, developer, tanggal, modul. Satu nomor punya banyak pesan: ambil semua; yang sudah ada (`perubahan_id + sumber_id`) **dilewati**, tanpa duplikat.
2. **Pemetaan**: nama mentah dicocokkan ke `modul_alias` dan `menu_alias` jenis `database` (menghasilkan baris `perubahan_pesan_peta`; bisa banyak modul di repo berbeda). Yang tidak dikenali ditandai **"belum dipetakan"**: developer memilih modul (dan menu bila perlu) yang benar (disimpan sebagai alias baru) atau **Tambah modul** (nama, repo, path kode opsional; `is_stub = 1`).
3. Modul/menu tanpa dokumentasi menampilkan **"Belum ada dokumentasi"** dengan tombol **Buat dokumentasi** (aktif di Fase 3).
4. Tab **Riwayat** di modul, menu, dan halaman: timeline perubahan CR/B (dari `perubahan_dampak`, dan dari `perubahan_pesan_peta` untuk yang belum punya dampak) serta entri audit bugfix; ID bisa diklik.
5. Halaman **Perubahan**: daftar dan pencarian isi pesan (FULLTEXT), filter tipe, tanggal, modul, repo, developer. Detail perubahan: semua pesan, modul terdampak, dan menu/halaman terdampak bila sudah diimpor.

**Selesai jika:** sync nomor yang sama dua kali tidak menggandakan data, nama yang belum dikenal bisa dipetakan, dan pencarian pesan berfungsi.

### Fase 3 - Generator prompt dan Impor

1. **Usulkan perubahan dokumentasi** (di detail CR/B): buat satu `unique_id` (8 karakter huruf kecil/angka) untuk sesi; tentukan repo terlibat dari modul terpetakan (boleh tambah manual); tampilkan **satu tab prompt per repo**, semuanya memakai `unique_id` yang sama. Tiap tab punya tombol **Salin** dan **Unduh .md** (`prompt_<kodeRepo>_<uniqueId>.md`). Simpan ke `sesi_prompt` dan `sesi_prompt_modul`. Dokumentasi yang disisipkan: **menu dan halaman** milik modul terpetakan (lengkap); modul dan menu lain cukup daftar ringkas.
2. **Buat dokumentasi modul**: pilih 1-5 modul (satu repo) -> prompt mode baru (agent menemukan menu dan halaman dari kode).
3. **Audit bugfix** per repo: memakai `hash_audit_terakhir` (cadangan: `tanggal_audit_terakhir`) dan `branch_utama`.
4. **Halaman Impor**: unggah file atau tempel JSON.
   - Validasi terhadap skema (bagian 8). Pesan error harus jelas; JSON rusak tetap bisa dirapikan manual di kolom teks.
   - `unique_id` dan `repo` di JSON harus cocok dengan `sesi_prompt`; jika tidak, tolak dengan alasan.
   - Simpan JSON mentah ke `impor_hasil`. Boleh impor beberapa kali untuk `unique_id` yang sama (repo berbeda).
   - **Review**: kartu per modul -> menu -> halaman -> bagian -> poin, dengan tanda tambah/ubah/hapus. Setiap poin bisa **diedit, dibuang, atau ditambah**; halaman/menu/modul utuh bisa dibatalkan. Ringkasan di atas (jumlah modul, menu, halaman, poin tambah/ubah/hapus). Poin yang melewati batas panjang diberi peringatan dan ditampilkan lebih dulu. Poin baru default `beta`.
   - **Dependensi** (`bergantung_pada`) yang belum ada di registry menampilkan tiga pilihan: **Daftarkan sebagai stub**, **Tautkan ke yang sudah ada** (disimpan sebagai alias), **Abaikan**.
   - **Simpan** dalam satu transaksi: terapkan perubahan poin, tulis `halaman_versi`, set `is_stub = 0` pada yang kini terdokumentasi, simpan dependensi, catat `perubahan_dampak` (atau `audit_bugfix_dampak`), tandai `sesi_prompt`/`impor_hasil` sebagai disimpan. Untuk audit: perbarui `repo.hash_audit_terakhir` **hanya setelah Simpan**, dan catat `audit_bugfix`.
5. Template prompt disimpan sebagai **file** di `src/templates/prompts/` dengan placeholder `{{...}}` (isi di bagian 9), bukan ditulis keras di kode.

**Selesai jika:** dari satu CR bisa membuat prompt per repo, mengimpor JSON contoh (buat satu file contoh di `src/assets/contoh-impor.json` untuk Transport Daily), meninjau, mengedit, dan menyimpan, lalu Riwayat menu/halaman menampilkan CR itu.

### Fase 4 - Blueprint

1. Halaman **Blueprint**: tempel teks blueprint (misal 10 poin) dan pilih repo.
2. **Merapikan** (tanpa AI): deteksi poin dari pola `1.`, `1)`, `-`, `*`, atau paragraf dipisah baris kosong. Tampilkan daftar poin yang bisa **digabung, dipecah, diedit, diurutkan**.
3. **Pencocokan** (tanpa AI): cocokkan teks tiap poin (tanpa membedakan huruf besar/kecil) dengan nama, alias, route, dan **kata kunci** modul, menu, dan halaman. Hasil sebagai chip saran (disimpan di `blueprint_poin_target`) yang bisa dihapus/ditambah. Pencocokan **opsional**; tanpa kecocokan prompt tetap jalan.
4. **Pengelompokan per modul**: satu modul = satu prompt; bila poin satu modul melebihi `ukuran_kelompok_blueprint` (3-4), pecah lagi. Poin lintas-modul: pilih satu modul **pemilik**, modul lain **terkait** (hanya konteks). Developer bisa memindahkan poin antar kelompok.
5. **Urutan eksekusi + alasan**: saran otomatis (poin yang menyebut tabel/kolom/migrasi didahulukan; modul yang dirujuk modul lain didahulukan), alasan terisi otomatis dan bisa ditulis ulang.
6. **Prompt per kelompok** (template D, bagian 9), tiap kelompok memiliki `unique_id` sendiri, dengan: blueprint lengkap sebagai konteks, poin yang ditugaskan, urutan dan alasan, jalur laporan kelompok sebelumnya, dokumentasi **menu dan halaman relevan** (yang lain di modul yang sama cukup judulnya; modul terkait cukup ringkasan). Modul tanpa dokumentasi: tulis "Belum ada dokumentasi, baca langsung dari kode".
7. Laporan agent berupa `.md` untuk dibaca manusia; **tidak diimpor**.

**Selesai jika:** blueprint contoh 10 poin menghasilkan beberapa prompt terurut dengan alasan, bisa disalin/diunduh.

### Fase 5 - Kerangka titik AI (tanpa memanggil AI)

Sediakan kontrak dan implementasi **berbasis aturan** saja, siap diganti implementasi LLM kelak. Tempatkan di subfolder dalam modul terkait (satu-satunya tambahan di luar pola file referensi):

- `BlueprintAnalyzer` di `modules/blueprint/analyzers/` (pecah poin, cocokkan, urutan + alasan, deteksi dependensi).
- `ModuleMatcher` di `modules/blueprint/matchers/`.
- `DocPolisher` di `modules/dokumentasi/polishers/` (rapikan/ringkas bahasa poin; implementasi aturan cukup memeriksa panjang dan mengusulkan pemangkasan sederhana).

Tiap kontrak punya `aturan.*.js` (berfungsi) dan `ai.*.js` (stub: mengembalikan "belum tersedia"). Pilih implementasi lewat `pengaturan` (`mode_analisis_blueprint`, `mode_rapikan_bahasa`: `aturan` | `ai`) saat meregistrasi di `container.js`; mode `ai` **kembali ke aturan**. Output kontrak berbentuk data terstruktur (JSON) yang sama untuk kedua implementasi. Isi kolom `asal` pada poin (`manual`, `impor`, `aturan`, `ai`).

---

## 8. Skema JSON hasil agent (impor)

Nama file (ditulis agent di repo target): `doc-generated/docs_<kodeRepo>_<uniqueId>.json`. Bentuk:

```json
{
  "unique_id": "a1b2c3d4",
  "repo": "dk-apps",
  "jenis": "usulan_perubahan",
  "perubahan": "CR2605060003",
  "hash_terakhir_diaudit": null,
  "selisih_dokumentasi": ["dokumentasi menyebut X, kode sebenarnya Y"],
  "modul": [
    {
      "id_modul": "transport",
      "aksi": "ubah",
      "nama": "Transport",
      "path_kode": "src/modules/transport",
      "ringkasan": "Pengelolaan data transport harian, bulanan, dan khusus.",
      "bergantung_pada": [],
      "menu": [
        {
          "id_menu": "transport-daily",
          "aksi": "ubah",
          "nama": "Transport Daily",
          "pola": "crud",
          "route": "/transport/daily",
          "path_kode": "src/modules/transport/daily",
          "ringkasan": "Kelola data transport harian.",
          "bergantung_pada": [
            { "nama": "Master Driver", "route": "/master/driver", "keterangan": "Pilihan driver diambil dari Master Driver." }
          ],
          "halaman": [
            {
              "id_halaman": "form",
              "aksi": "ubah",
              "jenis": "form",
              "nama": "Form",
              "route": "/transport/daily/form",
              "file_utama": ["src/modules/transport/daily/form.js"],
              "bagian": {
                "validasi": {
                  "tambah": ["Driver dan tanggal wajib diisi."],
                  "ubah": [{ "dari": "teks lama", "menjadi": "teks baru" }],
                  "hapus": ["teks yang dihapus"]
                }
              },
              "bergantung_pada": []
            }
          ]
        }
      ]
    }
  ]
}
```

Aturan:
- `jenis`: `usulan_perubahan` | `dokumentasi_baru` | `audit_bugfix`. `perubahan` hanya untuk `usulan_perubahan`; `hash_terakhir_diaudit` hanya untuk `audit_bugfix` (hash HEAD branch saat audit).
- `aksi` modul: `baru` | `ubah`. `aksi` menu dan halaman: `baru` | `ubah` | `hapus`.
- `pola` menu: `crud` | `lainnya`. `jenis` halaman: `daftar` | `form` | `detail` | `lainnya`.
- `bagian` hanya berisi kunci yang valid (`tujuan`, `komponen_ui`, `validasi`, `alur`, `api`, `catatan`) dan, di dalamnya, `tambah` / `ubah` / `hapus`. Halaman `baru` hanya memakai `tambah`.
- `ubah[].dari` dicocokkan ke poin yang ada (teks persis, atau paling mirip); bila tidak ketemu, tampilkan di review sebagai poin yang perlu dipilih manual.
- `id_modul`, `id_menu`, `id_halaman` = `kode` (huruf kecil, angka, `-` atau `_`). Kode baru boleh diusulkan agent.
- `bergantung_pada` ada di tingkat modul, menu, dan halaman; isinya modul/menu/halaman lain yang dipanggil, satu tingkat saja.
- `selisih_dokumentasi` opsional: catatan bila dokumentasi lama berbeda dengan kode.

---

## 9. Template prompt (disimpan sebagai file di `src/templates/prompts/`)

Placeholder: `{{unique_id}}`, `{{kode_repo}}`, `{{branch}}`, `{{nomor_perubahan}}`, `{{daftar_pesan_pengerjaan}}`, `{{dokumentasi_terkait}}`, `{{daftar_ringkas}}`, `{{aturan_tulis}}`, `{{format_json}}` (isi bagian 8), dst.

### Blok bersama: `aturan_tulis`

```
- Hanya berdasarkan kode. Jangan menulis alasan bisnis atau kebijakan.
- Satu poin = satu kalimat singkat (±150 karakter). Lebih dari itu hanya jika perlu
  (maksimal 2-3 kalimat, misalnya alur bercabang).
- Tulis apa yang developer perlu tahu untuk bekerja di kode itu. Jangan mengulang
  yang sudah jelas dari nama field/tombol. Hindari "berfungsi untuk", "digunakan untuk".
- Contoh gaya. Kurang baik: "Halaman ini berfungsi untuk melakukan proses login
  pengguna dengan memasukkan username dan password." Baik: "Login dengan username
  dan password, sukses diarahkan ke Beranda."
- Hierarki: modul -> menu -> halaman. Menu = menu di aplikasi. Halaman = layar/route.
- Menu berpola CRUD memakai halaman standar: Daftar (termasuk filter, paginasi, dan aksi
  hapus), Form (tambah dan ubah digabung jika satu form), Detail (hanya jika ada layarnya).
  Hapus adalah aksi, jangan dibuat halaman. Jangan mengulang penjelasan umum yang sama
  di tiap menu; tulis hanya yang spesifik untuk menu itu.
- Bagian yang valid: tujuan, komponen_ui, validasi, alur, api, catatan.
- Gunakan id_modul/id_menu/id_halaman dari daftar valid. Jika baru, usulkan kode huruf
  kecil (huruf, angka, '-' atau '_').
- bergantung_pada: modul/menu/halaman lain yang dipanggil, satu tingkat saja. Jangan
  mendokumentasikannya.
- Kode bersama (helper, base class) bukan modul/menu/halaman.
- Jangan mengubah file apa pun selain file output. Jangan commit.
```

### Template A - `usulan_perubahan.md`

```
# Usulan Perubahan Dokumentasi: {{nomor_perubahan}}
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Cari commit di branch {{branch}} yang memuat "{{nomor_perubahan}}":
  git log {{branch}} --grep="{{nomor_perubahan}}" --format="%H %s"
Baca diff tiap commit dan file terkait (pemanggil, import, komponen turunan) untuk
memahami alurnya. Tentukan modul, menu, dan halaman yang dokumentasinya berubah, lalu
tulis perubahannya (poin ditambah/diubah/dihapus). Hanya baca, jangan ubah kode.

## Konteks pengerjaan (dari database)
{{daftar_pesan_pengerjaan}}

## Dokumentasi saat ini (referensi, bisa tertinggal)
Jika berbeda dengan kode, kode yang benar; catat selisihnya di "selisih_dokumentasi".
{{dokumentasi_terkait}}

## Daftar valid lainnya (modul, menu, halaman ringkas)
{{daftar_ringkas}}

## Aturan tulis
{{aturan_tulis}}

## Output
Tulis JSON ke file `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json` dengan
jenis "usulan_perubahan". Jangan menulis JSON di chat.
Format:
{{format_json}}
```

### Template B - `dokumentasi_baru.md`

```
# Dokumentasi Baru Modul
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Buat dokumentasi awal untuk modul berikut dengan membaca SELURUH kode di path-nya.
Temukan menu di dalam modul (menu di aplikasi), tentukan polanya (crud/lainnya), lalu
temukan halamannya dan tulis dokumentasi tiap halaman.
{{daftar_modul_target}}   (nama, id_modul, path_kode, alias)

## Daftar valid lainnya (untuk bergantung_pada)
{{daftar_ringkas}}

## Aturan tulis
{{aturan_tulis}}

## Output
Tulis ke `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json`, jenis "dokumentasi_baru",
aksi modul "baru"/"ubah", aksi menu dan halaman "baru"; setiap bagian hanya berisi "tambah".
Format:
{{format_json}}
```

### Template C - `audit_bugfix.md`

```
# Audit Commit bugfix
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}

## Tugas
Audit commit di branch {{branch}} dari {{hash_terakhir}} sampai HEAD:
  git log {{branch}} {{hash_terakhir}}..{{branch}} --format="%H %s"
(Jika hash tidak ditemukan, pakai: --since="{{tanggal_terakhir}}".)
Ambil hanya commit berawalan "bugfix:". Abaikan refactor:, optimize:, docs:, dan
commit yang sudah memuat nomor CR/B. Untuk tiap commit, baca diff dan file terkait,
lalu tentukan apakah ia mengubah hal yang terdokumentasi (alur, validasi, komponen UI,
API). Jika tidak, lewati.

## Dokumentasi saat ini (referensi)
{{dokumentasi_terkait}}

## Daftar valid (modul, menu, halaman ringkas)
{{daftar_ringkas}}

## Aturan tulis
{{aturan_tulis}}

## Output
Tulis ke `doc-generated/docs_{{kode_repo}}_{{unique_id}}.json`, jenis "audit_bugfix",
isi "hash_terakhir_diaudit" dengan hash HEAD branch saat ini (git rev-parse).
Format:
{{format_json}}
```

### Template D - `blueprint_kelompok.md`

```
# Pengerjaan Blueprint: {{judul_blueprint}}
Sesi: {{unique_id}} | Repo: {{kode_repo}} | Branch: {{branch}}
Modul: {{nama_modul}}   Urutan: prompt {{urutan}} dari {{total}}
Alasan urutan: {{alasan_urutan}}

## Blueprint lengkap (hanya konteks)
{{blueprint_lengkap}}

## Kerjakan hanya poin ini
{{poin_ditugaskan}}

## Poin terkait modul lain (jangan dikerjakan di sini)
{{poin_terkait}}

## Laporan kelompok sebelumnya
{{jalur_laporan_sebelumnya atau "tidak ada"}}   (baca bila ada, agar tahu apa yang sudah berubah)

## Dokumentasi referensi (menu dan halaman relevan)
Ringkasan dari kode, bisa tertinggal. Jika berbeda dengan kode, kode yang benar dan
catat selisihnya di laporan.
{{dokumentasi_relevan}}
{{judul_menu_dan_halaman_lain}}

## Tahap
1. Analisis: baca kode modul terkait, catat kondisi awal tiap poin.
2. Kerjakan poin demi poin, hanya file yang berkaitan dengan poin tersebut. Jangan commit.
3. Perubahan tabel/kolom: nama **snake_case**; tulis HANYA script migrasi (jangan
   dijalankan). Ikuti lokasi migrasi project; jika tidak ada, taruh di
   `doc-generated/migrasi/`. Untuk poin yang bergantung pada nama tabel/kolom,
   beri saran nama + alasan, lalu BERHENTI di poin itu dan minta keputusan.
   Poin lain tetap dilanjutkan.
4. Laporan: tulis `.md` ke `doc-generated/blueprint_{{kode_repo}}_{{unique_id}}.md`.

## Format laporan
Per poin: kondisi awal; yang dikerjakan/diubah (+ path file); status
(selesai | sebagian | belum | butuh keputusan); catatan.
Lalu: daftar file diubah, file baru, selisih dokumentasi (bila ada), saran nama
tabel/kolom (tabel/kolom, nama saran, alasan, dampak ke kode), dan ringkasan
kondisi sekarang.
```

---

## 10. Desain UI

Ini alat untuk developer: **cepat, padat informasi, minim dekorasi**. Acuan rasa: Linear/Docusaurus. Nama di topbar dan judul tab: **DK Docs**.

- **Tata letak:** sidebar kiri berupa pohon **Repo -> Modul -> Menu** (bisa dilipat, ingat posisi buka); topbar berisi pencarian (Ctrl/Cmd+K) dan aksi utama (Sync, Impor, Blueprint); konten di tengah dengan lebar baca nyaman. Di layar sempit sidebar menjadi drawer.
- **Visual:** netral dan bersih, satu warna aksen, font sans untuk teks dan **mono untuk route, path, kode**. Dukung **mode terang dan gelap**. Kontras cukup, navigasi keyboard.
- **Badge dan warna:** `beta` amber, `live` hijau. Tipe **CR biru**, **B merah muda/merah**. Stub abu-abu dengan garis putus-putus dan label "belum didokumentasikan". Pola `crud` sebagai badge kecil di menu.
- **Detail menu:** judul + route (mono) + badge; ringkasan satu kalimat; lalu **tab per halaman** (Daftar | Form | Detail) dan tab **Riwayat**. Pada tab halaman: **Tujuan** (satu kalimat) paling atas, lalu bagian sebagai blok dengan judul kecil dan daftar poin; titik kecil status per poin; **File utama** dengan tombol salin path; bagian jarang dipakai bisa dilipat; gambar pendukung di bagian bawah.
- **Detail modul:** ringkasan, daftar menu (kartu padat dengan badge beta/stub), dependensi, dan tab Riwayat.
- **Editor:** edit langsung di tempat (hover menampilkan aksi), drag untuk urutan, penghitung karakter per poin dengan penanda halus saat melebihi batas.
- **Review impor:** kartu per modul -> menu -> halaman, diff berwarna (tambah hijau, ubah kuning dengan teks lama dicoret, hapus merah), ringkasan jumlah di atas, poin yang terlalu panjang di atas daftar.
- **Pencarian:** palet dengan grup hasil: Menu, Halaman, Modul, Isi dokumentasi, Perubahan.
- **Daftar Perubahan:** tabel padat dengan filter di atas, chip tipe CR/B, tanggal, developer, modul/menu.
- Prototype **tanpa login**; asumsikan jaringan internal.

---

## 11. Laporan akhir tiap fase

Setelah fase selesai, beri ringkasan singkat: **apa yang dikerjakan**, **file diubah/baru** (path), **kondisi sekarang** (apa yang sudah berjalan dan bagaimana mengujinya), **penyimpangan dari struktur folder acuan dan konflik dengan rules.md/architecture.md** (bila ada), dan **keputusan yang dibutuhkan** dari developer (misalnya konfigurasi `sumber.config.js`). Jangan menyalin isi kode ke laporan.
