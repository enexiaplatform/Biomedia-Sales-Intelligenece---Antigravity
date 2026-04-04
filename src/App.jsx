import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Menu, Plus, Search } from "lucide-react";
import Sidebar from "./components/SidebarVFinal";
import QuickLogModal from "./components/QuickLogModal";
import GlobalSearchModal from "./components/GlobalSearchModal";
import MobileNav from "./components/MobileNav";

import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import Pipeline from "./pages/Pipeline";
import MarketMap from "./pages/MarketMap";
import Competitors from "./pages/Competitors";
import Workflows from "./pages/Workflows";
import PricingTool from "./pages/PricingTool";
import KPITracker from "./pages/KPITracker";
import MarketScan from "./pages/MarketScan";
import AICoach from "./pages/AICoach";
import ProductManagement from "./pages/ProductManagement";
import BDTool from "./pages/BDTool";
import GMSimulator from "./pages/GMSimulator";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/accounts": "Tài khoản",
  "/pipeline": "Pipeline & Deal",
  "/market-map": "Bản đồ thị trường",
  "/competitors": "Phân tích đối thủ",
  "/workflows": "Quy trình sản phẩm",
  "/pricing": "Báo giá & Giá",
  "/kpi": "KPI & Hiệu suất",
  "/market-scan": "Market Scan",
  "/ai-coach": "AI Sales Coach",
  "/products": "Sản Phẩm",
  "/bd-tool": "BD Tool",
  "/gm-hub": "GM Simulator"
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
    <div style={{ background: '#020617', color: 'white', minHeight: '100vh', display: 'flex' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-surface-950/40 backdrop-blur-md border-b border-white/5 lg:hidden">
          <div className="text-sm font-black uppercase tracking-widest text-slate-100">{pageTitle}</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400">
            <Menu size={20} />
          </button>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard showToast={showToast} />} />
            <Route path="/accounts" element={<Accounts showToast={showToast} />} />
            <Route path="/accounts/:id" element={<AccountDetail showToast={showToast} />} />
            <Route path="/pipeline" element={<Pipeline showToast={showToast} />} />
            <Route path="/market-map" element={<MarketMap showToast={showToast} />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/pricing" element={<PricingTool showToast={showToast} />} />
            <Route path="/kpi" element={<KPITracker />} />
            <Route path="/market-scan" element={<MarketScan />} />
            <Route path="/ai-coach" element={<AICoach />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/bd-tool" element={<BDTool />} />
            <Route path="/gm-hub" element={<GMSimulator />} />
            <Route path="*" element={<Dashboard showToast={showToast} />} />
          </Routes>
        </div>
      </main>

      <MobileNav 
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onAddClick={() => setQuickLogOpen(true)}
      />

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickLogModal open={quickLogOpen} onClose={() => setQuickLogOpen(false)} />

      {toast && (
        <div className={`fixed bottom-24 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300
          ${toast.type === 'success' ? 'bg-primary/20 border-primary/20 text-primary' : 'bg-red-500/20 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-primary animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
