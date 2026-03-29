import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Menu, Plus, Search } from "lucide-react";
import Sidebar from "./components/Sidebar";
import QuickLogModal from "./components/QuickLogModal";
import GlobalSearchModal from "./components/GlobalSearchModal";

import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import Pipeline from "./pages/Pipeline";
import MarketMap from "./pages/MarketMap";
import Competitors from "./pages/Competitors";
import Workflows from "./pages/Workflows";
import PricingTool from "./pages/PricingTool";
import AICoach from "./pages/AICoach";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/accounts": "Tài khoản",
  "/pipeline": "Pipeline & Deal",
  "/market-map": "Bản đồ thị trường",
  "/competitors": "Phân tích đối thủ",
  "/workflows": "Quy trình sản phẩm",
  "/pricing": "Báo giá & Giá",
  "/ai-coach": "AI Sales Coach"
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/accounts/") ? "Chi tiết tài khoản" : "Biomedia SI");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (modifier && e.key === "l") {
        e.preventDefault();
        setQuickLogOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickLogOpen(false);
        setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>

          <h1 className="font-semibold text-gray-900 text-base flex-1">{pageTitle}</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              title="Tìm kiếm (Ctrl+K)"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Tìm kiếm</span>
              <kbd className="hidden sm:inline text-xs bg-white border border-gray-300 rounded px-1">⌘K</kbd>
            </button>

            <button
              onClick={() => setQuickLogOpen(true)}
              className="btn-primary text-sm"
              title="Ghi nhanh (Ctrl+L)"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Ghi nhanh</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard showToast={showToast} />} />
            <Route path="/accounts" element={<Accounts showToast={showToast} />} />
            <Route path="/accounts/:id" element={<AccountDetail showToast={showToast} />} />
            <Route path="/pipeline" element={<Pipeline showToast={showToast} />} />
            <Route path="/market-map" element={<MarketMap showToast={showToast} />} />
            <Route path="/competitors" element={<Competitors showToast={showToast} />} />
            <Route path="/workflows" element={<Workflows showToast={showToast} />} />
            <Route path="/pricing" element={<PricingTool showToast={showToast} />} />
            <Route path="/ai-coach" element={<AICoach />} />
          </Routes>
        </main>
      </div>

      {/* Modals */}
      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onSuccess={() => showToast("Đã ghi tương tác thành công!")}
      />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all
            ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
