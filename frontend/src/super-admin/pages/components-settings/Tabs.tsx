// src/admin/settings/components/Tabs.tsx
import React from 'react';

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'general'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('general')}
        >
          Umum
        </button>
        <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'receipt'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('receipt')}
        >
          Struk
        </button>
        <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'payment'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('payment')}
        >
          Pembayaran
        </button>
        {/* <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'biaya-operasional'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('biaya-operasional')}
        >
          Biaya Operasional
        </button> */}
        {/* <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'advanced'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('advanced')}
        >
          Lanjutan
        </button> */}
      </nav>
    </div>
  );
};

export default Tabs;