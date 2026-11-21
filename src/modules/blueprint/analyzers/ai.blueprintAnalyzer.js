import { aiBelumTersedia } from '@/utils/pemilihImplementasi';

/**
 * Stub BlueprintAnalyzer berbasis AI. Belum memanggil model apa pun: setiap metode menyatakan
 * "belum tersedia" sehingga pemilih kembali ke implementasi aturan.
 * Kelak cukup mengisi metode ini dengan pemanggilan LLM yang mengembalikan JSON sesuai kontrak.
 */
export function buatAiBlueprintAnalyzer() {
  const belum = () => aiBelumTersedia('BlueprintAnalyzer');
  return {
    pecahPoin: belum,
    kelompokkan: belum,
    deteksiDependensi: belum,
    urutkan: belum,
  };
}
