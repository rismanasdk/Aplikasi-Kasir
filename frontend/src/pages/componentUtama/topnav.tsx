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
    <div className="bg-white shadow-md rounded-b-xl">
      <div className="max-w-10x4 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="md:hidden mr-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Buka menu sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-amber-500 p-2 rounded-xl shadow-md">
                <span className="text-white text-xl font-bold">K+</span>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">KasirPlus</h1>
                <p className="text-xs text-gray-500">Point of Sale System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="ml-3 flex items-center">
              <div className="relative max-w-md w-full">
                <input type="text" placeholder="Search for your favorite food..."
                  className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
