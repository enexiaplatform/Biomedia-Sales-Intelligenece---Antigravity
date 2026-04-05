import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Users,
  TrendingUp,
  Map,
  Target,
  GitBranch,
  Brain,
  X,
  Activity,
  Tag,
  BarChart2,
  Radar,
  Package,
  Network,
  Activity as Flask,
  Briefcase,
  LogOut,
  Sun,
  Moon
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/accounts", label: "Tài khoản", icon: Users },
  { to: "/products", label: "Sản Phẩm", icon: Package },
  { to: "/bd-tool", label: "BD Tool", icon: Network },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/market-map", label: "Bản đồ thị trường", icon: Map },
  { to: "/competitors", label: "Đối thủ", icon: Target },
  { to: "/workflows", label: "Quy trình", icon: GitBranch },
  { to: "/pricing", label: "Báo giá & Giá", icon: Tag },
  { to: "/lab-tools", label: "Công cụ Lab", icon: Flask },
  { to: "/kpi", label: "KPI & Hiệu suất", icon: BarChart2 },
  { to: "/gm-hub", label: "GM Simulator", icon: Briefcase },
  { to: "/market-scan", label: "Market Scan", icon: Radar },
  { to: "/ai-coach", label: "AI Coach", icon: Brain }
];

export default function Sidebar({ open, onClose, onLogout, theme, onToggleTheme }) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 w-64 border-r border-[#30363D] flex flex-col transition-all duration-300 ease-in-out shadow-xl dark:shadow-[20px_0_40px_rgba(0,0,0,0.6)]
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 bg-white dark:bg-[#0D1117]`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-black/5 dark:border-[#30363D] bg-slate-50/50 dark:bg-[#161B22]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-900/10 rounded-xl shadow-[0_0_15px_rgba(139,0,0,0.1)] border border-red-500/20">
              <Activity className="text-[#8B0000] drop-shadow-red" size={20} />
            </div>
            <div>
              <div className="font-black text-slate-900 dark:text-white text-sm tracking-tighter uppercase leading-none">Biomedia SI</div>
              <div className="text-red-700 dark:text-[#8B0000]/80 text-[9px] uppercase font-black tracking-[0.2em] mt-1">Intelligence</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-red-500 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-8 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 group
                ${isActive
                  ? "bg-[#8B0000]/10 text-white dark:text-white"
                  : "text-slate-500 dark:text-[#4B535D] hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#8B0000] rounded-r-full shadow-[0_0_10px_rgba(139,0,0,0.5)]" />
                  )}
                  <Icon size={18} className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#8B0000]' : 'opacity-60 group-hover:opacity-100'}`} />
                  <span className={isActive ? "font-black" : ""}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer with Theme Toggle and Logout */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-surface-950/40 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 min-w-0">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-black/5 dark:border-white/10 flex items-center justify-center text-[10px] font-black text-red-600 dark:text-red-500">AD</div>
               <div className="flex-1 min-w-0">
                 <div className="text-[11px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-wide truncate">Admin User</div>
                 <div className="text-[9px] font-bold text-slate-500 uppercase">Administrator</div>
               </div>
            </div>
            
            <button 
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-black/5 dark:border-white/10 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
              title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
