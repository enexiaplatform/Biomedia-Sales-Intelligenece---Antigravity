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
  Briefcase
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

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 w-64 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.5)]
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ backgroundColor: '#020617' }} /* surface-950 hex */
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-white/5 bg-surface-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-primary/20">
              <Activity className="text-primary drop-shadow-glow" size={20} />
            </div>
            <div>
              <div className="font-black text-slate-100 text-sm tracking-tighter uppercase leading-none">Biomedia SI</div>
              <div className="text-primary/60 text-[9px] uppercase font-black tracking-[0.2em] mt-1">Intelligence</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 group
                ${isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] border border-primary/20 shadow-glow-sm"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`transition-all duration-500 ${isActive ? "drop-shadow-glow scale-110" : "group-hover:scale-110 group-hover:text-slate-300"}`} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-6 border-t border-surface-700/50 bg-surface-950/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[10px] font-black text-primary">HB</div>
            <div>
              <div className="text-[11px] font-black text-slate-300 uppercase tracking-wide">Henry @ Biomedia</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Sales Manager</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
