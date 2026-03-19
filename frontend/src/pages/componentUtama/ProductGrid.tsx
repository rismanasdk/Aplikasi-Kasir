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
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Categories Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-12 bg-gray-200 rounded-xl w-20 animate-pulse flex-shrink-0"></div>
          ))}
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 sm:h-48 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
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
    <div className="space-y-6">
      {/* Categories Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Kategori
          </h3>
        </div>
        
        <div className="relative">
          <div 
            id="categories-container"
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-col justify-content-center p-3 rounded-xl text-sm font-medium transition-all duration-200 border snap-start flex-shrink-0 ${
                  selectedCategory === category.id
                    ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25 transform scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <span className="text-lg mb-1">{category.icon}</span>
                <span className="text-xs text-center leading-tight line-clamp-2">{category.name}</span>
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
