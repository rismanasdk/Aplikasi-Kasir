// src/admin/biaya/biaya-layanan/components/tabs.tsx
import React from 'react';

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'operasional', label: 'Biaya Operasional' },
    { id: 'layanan', label: 'Biaya Layanan' },
    { id: 'service', label: 'Biaya Service' }
  ];

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav
        className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-0 min-w-max sm:min-w-0"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;