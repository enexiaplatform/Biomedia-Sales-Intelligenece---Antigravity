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
  Network
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
  { to: "/kpi", label: "KPI & Hiệu suất", icon: BarChart2 },
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
        className={`fixed top-0 left-0 h-full z-30 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-400" size={22} />
            <div>
              <div className="font-bold text-white text-sm leading-tight">Biomedia SI</div>
              <div className="text-gray-400 text-xs">Sales Intelligence</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            <div className="font-medium text-gray-400">Henry @ Biomedia Group</div>
            <div className="mt-0.5">Sales Manager</div>
          </div>
        </div>
      </aside>
    </>
  );
}
