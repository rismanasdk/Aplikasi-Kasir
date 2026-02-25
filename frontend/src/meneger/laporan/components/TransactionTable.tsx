// src/meneger/laporan/components/TransactionTable.tsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

interface TableDataItem {
  id: string;
  nama_produk: string;
  jumlah_terjual: number;
  hpp_per_porsi: number;
  pendapatan: number;
  laba_kotor: number;
  tanggal: string;
}

interface TransactionTableProps {
  tableData: TableDataItem[];
  itemsPerPage?: number;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
  tableData = [], // Tambahkan default value untuk mencegah undefined
  itemsPerPage = 10
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Tambahkan pengecekan untuk mencegah error jika tableData undefined
  const safeTableData = Array.isArray(tableData) ? tableData : [];
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeTableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeTableData.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Laporan HPP dan Laba per Produk', 105, 15, { align: 'center' });
    
    const tableDataForPDF = safeTableData.map((item, index) => [
      index + 1,
      item.tanggal,
      item.nama_produk,
      item.jumlah_terjual,
      `Rp ${item.hpp_per_porsi.toLocaleString('id-ID')}`,
      `Rp ${item.pendapatan.toLocaleString('id-ID')}`,
      `Rp ${item.laba_kotor.toLocaleString('id-ID')}`,
      item.pendapatan > 0 ? `${((item.laba_kotor / item.pendapatan) * 100).toFixed(2)}%` : '0%'
    ]);
    
    autoTable(doc, {
      head: [['No', 'Tanggal', 'Produk', 'Jumlah Terjual', 'HPP per Porsi', 'Pendapatan', 'Laba Kotor', 'Margin Laba']],
      body: tableDataForPDF,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save('laporan-hpp-laba.pdf');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      safeTableData.map((item, index) => ({
        'No': index + 1,
        'Tanggal': item.tanggal,
        'Produk': item.nama_produk,
        'Jumlah Terjual': item.jumlah_terjual,
        'HPP per Porsi': item.hpp_per_porsi,
        'Pendapatan': item.pendapatan,
        'Laba Kotor': item.laba_kotor,
        'Margin Laba': item.pendapatan > 0 ? ((item.laba_kotor / item.pendapatan) * 100).toFixed(2) + '%' : '0%'
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HPP dan Laba');
    
    XLSX.writeFile(workbook, 'laporan-hpp-laba.xlsx');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Detail HPP dan Laba per Produk</h3>
        <div className="flex space-x-2">
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>
      
      {currentItems.length > 0 ? (
        <>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Terjual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HPP per Porsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendapatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Laba Kotor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin Laba
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((item, index) => {
                    const profitPercentage = item.pendapatan > 0 ? ((item.laba_kotor / item.pendapatan) * 100).toFixed(2) : '0';
                    const profitPercentageNum = parseFloat(profitPercentage);
                    
                    return (
                      <tr 
                        key={index} 
                        className={`transition-colors hover:bg-gray-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.tanggal}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <Package className="h-5 w-5 text-blue-500 mr-2" />
                              {item.nama_produk}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.jumlah_terjual}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Rp {item.hpp_per_porsi.toLocaleString('id-ID')}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Rp {item.pendapatan.toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Rp {item.laba_kotor.toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs leading-5 font-semibold rounded-full ${profitPercentageNum >= 30 ? 'bg-green-100 text-green-800' : profitPercentageNum >= 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {profitPercentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {safeTableData.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, safeTableData.length)}</span> dari{' '}
                <span className="font-semibold text-gray-900">{safeTableData.length}</span> produk
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === pageNum 
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={nextPage}
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
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Tidak ada data produk</p>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;