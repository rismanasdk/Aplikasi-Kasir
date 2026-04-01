interface TopNavProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  totalCartItems: number;
  handleCheckout: () => void;
  onToggleSidebar: () => void;
}

const TopNav = ({
  searchTerm,
  setSearchTerm,
  onToggleSidebar,
//   totalCartItems,
//   handleCheckout
}: TopNavProps) => {
  return (
    <div className="sticky top-0 z-20 bg-white px-3 pb-3 pt-3 sm:rounded-b-2xl sm:px-4 sm:pb-3 sm:pt-2 sm:shadow-md">
      <div className="mx-auto w-full">
        <div className="flex min-h-[44px] flex-col gap-2 sm:min-h-[72px] md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleSidebar}
              className="mr-2 rounded-xl p-2 text-gray-600 transition hover:bg-amber-50 hover:text-amber-600 md:hidden"
              aria-label="Buka menu sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex flex-1 items-center md:flex-initial">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm ring-4 ring-amber-100 sm:h-11 sm:w-11">
                <span className="text-sm font-bold tracking-tight text-white sm:text-lg">K+</span>
              </div>
              <div className="ml-3 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-none tracking-tight text-gray-900 sm:text-xl">Kasir Plus</h1>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-700 sm:text-[10px]">
                    POS
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">Point of Sale System</p>
              </div>
            </div>
          </div>
          
          <div className="flex w-full items-center md:max-w-md md:justify-end">
            <div className="flex w-full items-center">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Cari nama atau kategori produk..."
                  className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm transition placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 sm:h-11 sm:rounded-2xl sm:pl-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* <div className="ml-4 flex items-center">
              <button onClick={() => handleCheckout()} className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {totalCartItems}
                  </span>
                )}
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
