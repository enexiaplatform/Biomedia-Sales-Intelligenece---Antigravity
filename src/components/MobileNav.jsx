import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, HeartHandshake, BrainCircuit, Search } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { path: "/accounts", icon: Users, label: "Khách hàng" },
  { path: "/market-scan", icon: Search, label: "Thị trường" },
  { path: "/bd-tool", icon: HeartHandshake, label: "Chiến lược" },
  { path: "/ai-coach", icon: BrainCircuit, label: "AI Coach" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-950/40 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-[1000] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-500 ${isActive ? 'text-primary scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-500 ${isActive ? 'bg-primary/10 shadow-glow-sm' : ''}`}>
              <item.icon size={18} className={isActive ? 'drop-shadow-glow' : ''} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
