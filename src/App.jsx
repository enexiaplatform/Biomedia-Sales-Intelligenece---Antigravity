import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/SidebarVFinal";
import QuickLogModal from "./components/QuickLogModal";
import GlobalSearchModal from "./components/GlobalSearchModal";
import MobileNav from "./components/MobileNav";
import Login from "./pages/Login";

// Lazy Load Pages for Performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const MarketMap = lazy(() => import("./pages/MarketMap"));
const Competitors = lazy(() => import("./pages/Competitors"));
const Workflows = lazy(() => import("./pages/Workflows"));
const PricingTool = lazy(() => import("./pages/PricingTool"));
const KPITracker = lazy(() => import("./pages/KPITracker"));
const MarketScan = lazy(() => import("./pages/MarketScan"));
const AICoach = lazy(() => import("./pages/AICoach"));
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const BDTool = lazy(() => import("./pages/BDTool"));
const GMSimulator = lazy(() => import("./pages/GMSimulator"));

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

// Premium Loading State
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
    <div className="spinner mb-4" />
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Đang tải dữ liệu...</span>
  </div>
);

export default function App() {
  const [isLogged, setIsLogged] = useState(localStorage.getItem("biomedia_auth") === "true");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  const handleLogin = () => {
    localStorage.setItem("biomedia_auth", "true");
    setIsLogged(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("biomedia_auth");
    setIsLogged(false);
  };

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/accounts/") ? "Chi tiết tài khoản" : "Biomedia SI");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isLogged) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "k") { e.preventDefault(); setSearchOpen((v) => !v); }
      if (modifier && e.key === "l") { e.preventDefault(); setQuickLogOpen((v) => !v); }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickLogOpen(false);
        setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLogged]);

  if (!isLogged) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
      
      <main className="flex-1 lg:pl-64 transition-all duration-300">
        {/* Header - Optimized for Premium Look */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-5 bg-surface-950/60 backdrop-blur-xl border-b border-white/5 lg:hidden shadow-lg">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">{pageTitle}</div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
          <Suspense fallback={<PageLoader />}>
            <div className="animate-fade-in">
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Suspense>
        </div>
      </main>

      {/* Global Modals */}
      <MobileNav 
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onAddClick={() => setQuickLogOpen(true)}
      />

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickLogModal open={quickLogOpen} onClose={() => setQuickLogOpen(false)} />

      {/* Premium Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300
          ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
