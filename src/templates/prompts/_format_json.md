```json
{
  "unique_id": "{{unique_id}}",
  "repo": "{{kode_repo}}",
  "jenis": "usulan_perubahan",
  "perubahan": "CR2605060003",
  "hash_terakhir_diaudit": null,
  "selisih_dokumentasi": ["dokumentasi menyebut X, kode sebenarnya Y"],
  "teknologi": [{ "nama": "Next.js", "versi": "16", "sumber_file": "package.json" }],
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
                  "ubah": [{ "poin_id": "id poin (opsional)", "dari": "teks lama", "menjadi": "teks baru" }],
                  "hapus": ["teks yang dihapus", { "teks": "teks yang dihapus", "poin_id": "id poin (opsional)" }]
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

Aturan format:
- `unique_id` dan `repo` harus persis seperti di atas (jangan diubah).
- `jenis`: "usulan_perubahan" | "dokumentasi_baru" | "audit_bugfix" | "sinkron_modul". Isi sesuai jenis tugas ini.
  `perubahan` hanya untuk "usulan_perubahan"; `hash_terakhir_diaudit` hanya untuk "audit_bugfix"
  (hash HEAD branch saat audit). Kunci yang tidak dipakai boleh diisi null atau dihilangkan.
- `aksi` modul: "baru" | "ubah". `aksi` menu dan halaman: "baru" | "ubah" | "hapus".
- `pola` menu: "crud" | "lainnya". `jenis` halaman: "daftar" | "form" | "detail" | "lainnya".
- `bagian` hanya berisi kunci yang valid (tujuan, komponen_ui, validasi, alur, api, catatan) dan,
  di dalamnya, `tambah` / `ubah` / `hapus`. Halaman "baru" hanya memakai `tambah`.
- `ubah[].dari` dicocokkan ke poin yang ada (salin teks persis dari dokumentasi saat ini, tanpa awalan
  `[id: ...]`/`[CR ...]`). `poin_id` opsional dan harus berupa string persis dari `[id: ...]`; bila diisi,
  poin dirujuk lewat id itu. `hapus[]` boleh teks saja atau objek { "teks", "poin_id" }.
- `id_modul`, `id_menu`, `id_halaman` = kode (huruf kecil, angka, `-` atau `_`).
- `bergantung_pada` ada di tingkat modul, menu, dan halaman; isinya modul/menu/halaman lain
  yang dipanggil, satu tingkat saja.
- `selisih_dokumentasi` opsional: catatan bila dokumentasi lama berbeda dengan kode.
- `teknologi` opsional (tingkat repo): array `{ nama, versi, sumber_file }`. Isi hanya bila tugas ini
  memintanya (lihat bagian "Teknologi repo"); selain itu hilangkan atau isi `[]`.
