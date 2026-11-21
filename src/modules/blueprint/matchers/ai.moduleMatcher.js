import { aiBelumTersedia } from '@/utils/pemilihImplementasi';

/**
 * Stub ModuleMatcher berbasis AI. Belum memanggil model apa pun: menyatakan "belum tersedia"
 * sehingga pemilih kembali ke implementasi aturan.
 */
export function buatAiModuleMatcher() {
  return {
    cocokkan: () => aiBelumTersedia('ModuleMatcher'),
  };
}
