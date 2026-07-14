// src/admin/branch/component-branch/pagination.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) end = Math.min(totalPages - 1, 5);
    if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 4);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');

    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
      <div className="text-sm text-gray-600">
        Menampilkan <span className="font-semibold text-gray-900">{startItem}-{endItem}</span> dari{' '}
        <span className="font-semibold text-gray-900">{totalItems}</span> cabang
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  currentPage === page
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
          }`}
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;