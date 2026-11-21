Baca file manifest di akar repo bila ada: `pubspec.yaml`, `build.gradle` atau `build.gradle.kts`
(termasuk `app/build.gradle*`), `composer.json`, `package.json`, dan `.nvmrc`. Dari file itu tentukan:
- bahasa dan versi runtime (misal Dart, Kotlin, PHP, Node.js),
- framework utama beserta versinya (misal Flutter, Next.js, Laravel).
Tulis di kunci `teknologi` pada tingkat paling atas JSON, satu objek per teknologi:
`{ "nama": "Flutter", "versi": "3.x", "sumber_file": "pubspec.yaml" }`.
- Cukup bahasa/runtime dan framework utama; jangan mendaftar semua paket atau library.
- `versi` boleh berupa rentang atau versi mayor seperti tertulis di manifest (misal "^3.2.0" ditulis "3.2"); isi null bila tidak tertulis.
- Bandingkan dengan "Teknologi tercatat" di bawah. Isi `teknologi` HANYA bila repo ini belum punya
  catatan (pertama kali), atau ada teknologi yang baru/versinya berubah. Cantumkan hanya yang baru atau berubah.
  Bila tidak ada yang baru atau berubah, hilangkan kunci `teknologi` atau isi `[]`.
- Hanya baca file manifest; jangan mengubah apa pun.
