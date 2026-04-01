import React, { useState, useMemo } from 'react';
import type { Barang } from "../../admin/stok-barang";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Barang[];
  isLoading: boolean;
  onAddToCart: (product: Barang, quantity: number) => void;
  onBuyNow: (product: Barang, quantity: number) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: Array<{ id: string; name: string; icon: string }>;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  isLoading, 
  onAddToCart, 
  onBuyNow,
  selectedCategory,
  setSelectedCategory,
  categories
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy] = useState<'name' | 'price' | 'stock'>('name');

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => 
      product.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.kategori.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nama.localeCompare(b.nama);
        case 'price':
          return (a.hargaFinal || a.hargaJual) - (b.hargaFinal || b.hargaJual);
        case 'stock':
          return b.stok - a.stok;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-3 rounded-[24px] bg-white p-4 shadow-sm lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded-lg bg-gray-200 sm:h-8 sm:w-48"></div>
            <div className="h-3 w-28 animate-pulse rounded bg-gray-200 sm:h-4 sm:w-32"></div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 w-16 flex-shrink-0 animate-pulse rounded-2xl bg-gray-200 sm:h-10 sm:w-20"></div>
            ))}
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-24 bg-gray-200 sm:h-48"></div>
              <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                <div className="h-3 w-24 rounded bg-gray-200 sm:h-4"></div>
                <div className="h-5 w-3/4 rounded bg-gray-200 sm:h-6"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 rounded bg-gray-200 sm:h-5 sm:w-20"></div>
                  <div className="h-7 w-20 rounded bg-gray-200 sm:h-8 sm:w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 sm:py-24">
        <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center overflow-hidden">
          <img 
            src="/images/nostokbarang.jpg" 
            alt="Tidak ada produk" 
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-3">Tidak ada produk</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Produk belum tersedia. Silakan hubungi administrator untuk menambahkan produk.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Categories Filter */}
      <div className="space-y-2">
        <div className="px-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
            Jelajahi Kategori
          </p>
        </div>
        
        <div className="relative">
          <div 
            id="categories-container"
            className="flex gap-2 overflow-x-auto rounded-[28px] border border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-white p-2 scrollbar-hide snap-x snap-mandatory"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex min-w-[40px] sm:min-w-[88px] flex-shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-0.5 py-0.5 sm:px-3 sm:py-3 text-[9px] sm:text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'scale-[1.02] border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-white/90 text-gray-700 border-white hover:border-amber-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <span className="mb-0.5 text-xs sm:text-lg">{category.icon}</span>
                <span className="text-[9px] sm:text-xs text-center leading-tight line-clamp-2 truncate">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>  

      {/* Results Info */}
      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            Menampilkan {filteredAndSortedProducts.length} produk untuk "{searchQuery}"
          </p>
        </div>
      )}

      {/* Products Grid */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Produk tidak ditemukan</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Tidak ada produk yang cocok dengan pencarian Anda. Coba kata kunci lain atau kategori yang berbeda.
          </p>
          {(searchQuery || selectedCategory !== "Semua") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("Semua");
              }}
              className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Tampilkan Semua Produk
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredAndSortedProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default ProductGrid;
