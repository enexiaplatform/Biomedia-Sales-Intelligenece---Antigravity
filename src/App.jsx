import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/SidebarVFinal";
import QuickLogModal from "./components/QuickLogModal";
import GlobalSearchModal from "./components/GlobalSearchModal";
import MobileNav from "./components/MobileNav";

// Auth
import { useAuth } from './contexts/AuthContext';
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

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 animate-fade-in">
    <div className="spinner" />
    <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Đang tải...</span>
  </div>
);

// ============================================================================
// PROTECTED ROUTE
// ============================================================================

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================
function DashboardLayout() {
  const [theme, setTheme] = useState(localStorage.getItem("biomedia_theme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const { signOut } = useAuth();

  // Handle Theme Switching
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("biomedia_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    await signOut();
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
  }, []);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-base)', color: 'var(--text-1)', transition: 'background 0.2s ease, color 0.2s ease' }}
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 lg:pl-60 min-w-0">
        {/* Mobile header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 lg:hidden backdrop-blur-xl"
          style={{
            background: 'rgba(var(--bg-surface), 0.8)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
            {pageTitle}
          </span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
          >
            <Menu size={18} />
          </button>
        </header>

        <div className="w-full px-6 py-8 min-h-screen">
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

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-in"
          style={{
            background:    toast.type === 'success' ? 'rgba(34,197,94,0.1)'  : 'rgba(239,68,68,0.1)',
            border:        toast.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
            color:         toast.type === 'success' ? '#4ade80' : '#f87171',
            backdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: toast.type === 'success' ? '#4ade80' : '#f87171' }}
          />
          <span className="text-[13px] font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// APP ROOT
// ============================================================================
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
