export const normalizeRoundingMode = (mode) => {
  const normalized = String(mode || 'up').trim().toLowerCase();
  if (['down', 'ke bawah', 'bawah'].includes(normalized)) return 'down';
  if (['nearest', 'ke tengah', 'tengah', 'mid'].includes(normalized)) return 'nearest';
  return 'up';
};

export const roundHargaFinal = (value, mode = 'up') => {
  const amount = Number(value) || 0;
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const roundingMode = normalizeRoundingMode(mode);
  const applyRounding = (value, step) => {
    if (roundingMode === 'down') return Math.floor(value / step) * step;
    if (roundingMode === 'nearest') return Math.round(value / step) * step;
    return Math.ceil(value / step) * step;
  };

  if (amount < 1000) {
    return applyRounding(amount, 10);
  }

  if (amount < 10000) {
    return applyRounding(amount, 100);
  }

  if (amount < 100000) {
    return applyRounding(amount, 1000);
  }

  if (amount < 1000000) {
    return applyRounding(amount, 5000);
  }

  return applyRounding(amount, 10000);
};

export const calculateHargaFinal = ({ hargaJual, taxRate = 0, discountRate = 0, serviceCharge = 0, roundingMode = 'up' }) => {
  const baseHargaJual = Number(hargaJual) || 0;
  const hargaSetelahDiskon = baseHargaJual - (baseHargaJual * discountRate / 100);
  const hargaSetelahPajak = hargaSetelahDiskon + (hargaSetelahDiskon * taxRate / 100);
  const hargaFinal = hargaSetelahPajak + (hargaSetelahPajak * serviceCharge / 100);

  return roundHargaFinal(hargaFinal, roundingMode);
};
