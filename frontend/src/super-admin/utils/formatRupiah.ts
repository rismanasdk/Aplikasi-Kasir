export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Dengan RP
export const formatRupiahRP = (value: number | string): string => {
  const angka = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
};

// Tidak Dengan RP
export const formatNumber = (value: number | string): string => {
  const angka = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return new Intl.NumberFormat('id-ID').format(angka);
};