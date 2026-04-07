import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart3, Users, TrendingUp, Map, Target, GitBranch, Brain,
  X, Activity, Tag, BarChart2, Radar, Package, Network,
  Activity as Flask, Briefcase, LogOut, Sun, Moon, ChevronRight
} from "lucide-react";

const navigationGroups = [
  {
    id: 'CRM_CORE',
    label: 'CRM',
    items: [
      { label: 'Dashboard',  to: '/',         icon: BarChart3 },
      { label: 'Tài khoản', to: '/accounts',  icon: Users },
      { label: 'Pipeline',  to: '/pipeline',  icon: TrendingUp },
      { label: 'BD Tool',   to: '/bd-tool',   icon: Network },
    ],
  },
  {
    id: 'MARKET_INTEL',
    label: 'Market Intel',
    items: [
      { label: 'Bản đồ thị trường', to: '/market-map',  icon: Map },
      { label: 'Đối thủ',           to: '/competitors', icon: Target },
      { label: 'Market Scan',        to: '/market-scan', icon: Radar },
    ],
  },
  {
    id: 'PRODUCT_PRICING',
    label: 'Sản phẩm & Giá',
    items: [
      { label: 'Quy trình', to: '/workflows', icon: GitBranch },
      { label: 'Sản phẩm', to: '/products',  icon: Package },
      { label: 'Báo giá',  to: '/pricing',   icon: Tag },
    ],
  },
  {
    id: 'PERFORMANCE',
    label: 'Hiệu suất',
    items: [
      { label: 'KPI',          to: '/kpi',    icon: BarChart2 },
      { label: 'GM Simulator', to: '/gm-hub', icon: Briefcase },
    ],
  },
  {
    id: 'AI_HUB',
    label: 'AI',
    items: [
      { label: 'AI Coach',    to: '/ai-coach',   icon: Brain },
      { label: 'Công cụ Lab', to: '/lab-tools',  icon: Flask },
    ],
  },
];

export default function Sidebar({ open, onClose, onLogout, theme, onToggleTheme }) {
  const { user, signOut } = useAuth();

  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarGroups_collapsed');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar shell */}
      <aside
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
        className={`fixed top-0 left-0 h-full z-50 w-60 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center justify-between px-5 py-[18px]"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}
            >
              <Activity size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>
                Biomedia SI
              </div>
              <div
                className="text-[10px] font-medium mt-0.5 uppercase tracking-[0.12em]"
                style={{ color: 'var(--brand)' }}
              >
                Intelligence
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2.5 py-4 overflow-y-auto scrollbar-hide space-y-4">
          {navigationGroups.map((group) => (
            <div key={group.id}>
              {/* Group label */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2 py-1 mb-1 rounded-lg transition-colors duration-150"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  {group.label}
                </span>
                <ChevronRight
                  size={11}
                  className="transition-transform duration-200"
                  style={{
                    color: 'var(--text-3)',
                    transform: collapsedGroups[group.id] ? 'rotate(0deg)' : 'rotate(90deg)',
                  }}
                />
              </button>

              {/* Group items */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out space-y-px"
                style={{
                  maxHeight: collapsedGroups[group.id] ? '0' : '600px',
                  opacity:   collapsedGroups[group.id] ? 0 : 1,
                }}
              >
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                  >
                    {({ isActive }) => (
                      <div
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer"
                        style={{
                          fontWeight:  isActive ? 600 : 500,
                          color:       isActive ? 'var(--text-1)' : 'var(--text-2)',
                          background:  isActive ? 'var(--bg-elevated)' : 'transparent',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.color = 'var(--text-1)';
                            e.currentTarget.style.background = 'var(--bg-overlay)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.color = 'var(--text-2)';
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <Icon
                          size={15}
                          style={{
                            color:      isActive ? 'var(--brand)' : 'var(--text-3)',
                            flexShrink: 0,
                          }}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--brand)' }}
                          />
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* User row */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
              style={{
                background: 'var(--brand-bg)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand)',
              }}
            >
              {user?.email?.[0]?.toUpperCase() || 'H'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                {user?.email?.split('@')[0] || 'Henry'}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                Sales Manager
              </div>
            </div>
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150"
              style={{
                color:      'var(--text-3)',
                background: 'var(--bg-elevated)',
                border:     '1px solid var(--border)',
              }}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-150"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
