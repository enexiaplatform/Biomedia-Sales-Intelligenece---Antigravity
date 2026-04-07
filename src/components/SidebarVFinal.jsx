import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
  Moon,
  ChevronDown
} from "lucide-react";

// Step 1: Modify Navigation Data Structure
const navigationGroups = [
  {
    id: 'CRM_CORE',
    label: 'CRM CORE',
    items: [
      { label: 'Dashboard', to: '/', icon: BarChart3 },
      { label: 'Tài khoản', to: '/accounts', icon: Users },
      { label: 'Pipeline', to: '/pipeline', icon: TrendingUp },
      { label: 'BD Tool', to: '/bd-tool', icon: Network },
    ],
  },
  {
    id: 'MARKET_INTEL',
    label: 'MARKET INTEL',
    items: [
      { label: 'Bản đồ thị trường', to: '/market-map', icon: Map },
      { label: 'Đối thủ', to: '/competitors', icon: Target },
      { label: 'Market Scan', to: '/market-scan', icon: Radar },
    ],
  },
  {
    id: 'PRODUCT_PRICING',
    label: 'PRODUCT & PRICING',
    items: [
      { label: 'Quy trình', to: '/workflows', icon: GitBranch },
      { label: 'Sản Phẩm', to: '/products', icon: Package },
      { label: 'Báo giá & Giá', to: '/pricing', icon: Tag },
    ],
  },
  {
    id: 'PERFORMANCE',
    label: 'PERFORMANCE',
    items: [
      { label: 'KPI & Hiệu suất', to: '/kpi', icon: BarChart2 },
      { label: 'GM Simulator', to: '/gm-hub', icon: Briefcase },
    ],
  },
  {
    id: 'AI_HUB',
    label: 'AI HUB',
    items: [
      { label: 'AI Coach', to: '/ai-coach', icon: Brain },
      { label: 'Công cụ Lab', to: '/lab-tools', icon: Flask },
    ],
  },
];

export default function Sidebar({ open, onClose, onLogout, theme, onToggleTheme }) {
  const { user, signOut } = useAuth();
  
  // Step 2: Add Collapsed State
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarGroups_collapsed');
      return stored ? JSON.parse(stored) : {}; // Default all expanded
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => {
      const updated = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('sidebarGroups_collapsed', JSON.stringify(updated));
      return updated;
    });
  };

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
              <div className="font-bold text-[#F0F0F0] text-sm tracking-tight uppercase leading-none">Biomedia SI</div>
              <div className="text-[#8B0000] text-[9px] uppercase font-bold tracking-[0.2em] mt-1">Intelligence</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-red-500 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 3: Replace Navigation Rendering */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          {navigationGroups.map((group) => (
            <div key={group.id} className="mb-4">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#161B22] transition-colors text-left group-btn"
              >
                <span className="text-[9px] font-bold text-[#404040] uppercase tracking-[0.2em]">
                  {group.label}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 dark:text-[#8B949E] transition-transform duration-300 ${
                    collapsedGroups[group.id] ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </button>

              {/* Group Items (Collapsible) */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  collapsedGroups[group.id] ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                }`}
              >
                <div className="space-y-1 mt-1">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 group
                        ${isActive
                          ? "bg-[#8B0000]/15 text-[#F0F0F0]"
                          : "text-[#B0B0B0] hover:text-[#F0F0F0] hover:bg-[#1E1E1E]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#8B0000] rounded-r-full shadow-[0_0_10px_rgba(139,0,0,0.5)]" />
                          )}
                          <Icon size={16} className={`transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#8B0000]' : 'opacity-60 group-hover:opacity-100'}`} />
                          <span className={isActive ? "font-black" : ""}>{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with Theme Toggle and Logout */}
        <div className="p-4 border-t border-black/5 dark:border-[#30363D] bg-slate-50/50 dark:bg-surface-950/40 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 min-w-0">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#161B22] border border-black/5 dark:border-[#30363D] flex items-center justify-center text-[10px] font-black text-red-600 dark:text-[#8B0000]">AD</div>
               <div className="flex-1 min-w-0">
                 <div className="text-[11px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-wide truncate">Admin User</div>
                 <div className="text-[9px] font-bold text-slate-500 dark:text-[#8B949E] uppercase truncate">{user?.email || 'Administrator'}</div>
               </div>
            </div>
            
            <button 
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-black/5 dark:border-[#30363D] text-slate-500 dark:text-[#8B949E] hover:text-[#8B0000] dark:hover:text-[#8B0000] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
              title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#8B949E] hover:bg-[#8B0000]/10 hover:text-[#8B0000] dark:hover:text-[#8B0000] transition-all border border-transparent dark:hover:border-[#8B0000]/20 hover:shadow-[0_0_15px_rgba(139,0,0,0.2)]"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
