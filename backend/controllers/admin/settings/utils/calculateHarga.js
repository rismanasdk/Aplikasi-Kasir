import { calculateHargaFinal as calculateRoundedHargaFinal } from "../../../helpers/priceHelper.js";

export const calculateHargaFinal = (hargaJual, taxRate = 0, globalDiscount = 0, serviceCharge = 0) => {
  return calculateRoundedHargaFinal({
    hargaJual,
    taxRate,
    discountRate: globalDiscount,
    serviceCharge,
    roundingMode: 'up',
  });
};

// Fungsi untuk mengupdate hargaFinal pada semua barang
export const updateAllBarangHargaFinal = async (Barang, settings) => {
  const barang = await Barang.find();
  const { taxRate = 0, globalDiscount = 0, serviceCharge = 0 } = settings;
  const roundingMode = settings.roundingMode || 'up';
  
  for (let b of barang) {
    b.hargaFinal = calculateRoundedHargaFinal({
      hargaJual: b.harga_jual,
      taxRate,
      discountRate: globalDiscount,
      serviceCharge,
      roundingMode,
    });
    await b.save();
  }
  
  return barang;
};