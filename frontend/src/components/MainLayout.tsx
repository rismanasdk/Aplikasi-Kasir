import Footer from "./Footer";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white sm:bg-gray-50">
      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-screen">
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-0 py-0 sm:px-4 sm:pt-4 sm:pb-2 md:px-6 md:pt-6 md:pb-3">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
