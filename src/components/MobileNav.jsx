import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, HeartHandshake, BrainCircuit, ScanSearch } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { path: "/accounts", icon: Users, label: "Khách hàng" },
  { path: "/market-scan", icon: ScanSearch, label: "Thị trường" },
  { path: "/bd-tool", icon: HeartHandshake, label: "Chiến lược" },
  { path: "/ai-coach", icon: BrainCircuit, label: "AI Coach" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-900/80 backdrop-blur-lg border-t border-surface-700/50 flex items-center justify-around px-2 z-[1000] pb-safe">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-slate-500'}`}
          >
            <item.icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(105,246,184,0.5)]' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
