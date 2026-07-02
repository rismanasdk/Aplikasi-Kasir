import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersediaanSummary } from '../controllers/helpers/persediaanHelper.js';

test('buildPersediaanSummary classifies fast and slow moving from backend rules', () => {
  const payload = {
    total_produk: 4,
    semua_produk: [
      {
        kode_barang: 'A',
        nama_barang: 'Aqua',
        kategori: 'Minuman',
        stok: 10,
        stok_minimal: 5,
        harga_beli: 2000,
        harga_jual: 3000,
        jumlah_terjual: 10,
        omzet: 30000,
      },
      {
        kode_barang: 'B',
        nama_barang: 'Biskuit',
        kategori: 'Makanan',
        stok: 5,
        stok_minimal: 3,
        harga_beli: 5000,
        harga_jual: 7000,
        jumlah_terjual: 5,
        omzet: 35000,
      },
      {
        kode_barang: 'C',
        nama_barang: 'Coklat',
        kategori: 'Makanan',
        stok: 2,
        stok_minimal: 4,
        harga_beli: 4000,
        harga_jual: 6000,
        jumlah_terjual: 1,
        omzet: 6000,
      },
      {
        kode_barang: 'D',
        nama_barang: 'Dodol',
        kategori: 'Makanan',
        stok: 1,
        stok_minimal: 4,
        harga_beli: 3000,
        harga_jual: 5000,
        jumlah_terjual: 0,
        omzet: 0,
      },
    ],
  };

  const summary = buildPersediaanSummary(payload);

  assert.equal(summary.total_stok, 18);
  assert.equal(summary.nilai_persediaan, 56000);
  assert.deepEqual(summary.produk_habis.map((item) => item.kode_barang), []);
  assert.deepEqual(summary.produk_hampir_habis.map((item) => item.kode_barang), ['D', 'C']);
  assert.deepEqual(summary.fast_moving.map((item) => item.kode_barang), ['A', 'B']);
  assert.deepEqual(summary.slow_moving.map((item) => item.kode_barang), ['D', 'C']);
});
