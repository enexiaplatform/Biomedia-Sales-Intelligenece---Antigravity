import { useState, useEffect, useRef } from "react";
import { X, Search, Users, TrendingUp, Target, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../lib/supabase";

export default function GlobalSearchModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ accounts: [], contacts: [], deals: [], competitors: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults({ accounts: [], contacts: [], deals: [], competitors: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ accounts: [], contacts: [], deals: [], competitors: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await globalSearch(query);
      setResults(data || { accounts: [], contacts: [], deals: [], competitors: [] });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(path) {
    navigate(path);
    onClose();
  }

  const hasResults =
    results.accounts.length +
      results.contacts.length +
      results.deals.length +
      results.competitors.length >
    0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-surface-950/60 backdrop-blur-sm">
      <div className="bg-surface-900/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-lg border border-white/5 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5 bg-white/5">
          <Search size={18} className="text-primary drop-shadow-glow" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tài khoản, liên hệ, deal, đối thủ..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-100 placeholder:text-slate-500 font-medium"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
          )}
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {!query.trim() && (
            <div className="text-center py-8 text-sm text-gray-400">
              Nhập từ khóa để tìm kiếm...
            </div>
          )}

          {query.trim() && !loading && !hasResults && (
            <div className="text-center py-8 text-sm text-gray-400">
              Không tìm thấy kết quả cho "{query}"
            </div>
          )}

          {results.accounts.length > 0 && (
            <ResultSection title="Tài khoản" icon={<Building2 size={14} />}>
              {results.accounts.map((a) => (
                <ResultItem
                  key={a.id}
                  primary={a.name}
                  secondary={`${a.region || ""} · ${a.type || ""}`}
                  onClick={() => handleSelect(`/accounts/${a.id}`)}
                />
              ))}
            </ResultSection>
          )}

          {results.contacts.length > 0 && (
            <ResultSection title="Liên hệ" icon={<Users size={14} />}>
              {results.contacts.map((c) => (
                <ResultItem
                  key={c.id}
                  primary={c.name}
                  secondary={`${c.title || ""} · ${c.accounts?.name || ""}`}
                  onClick={() => handleSelect(`/accounts/${c.account_id}`)}
                />
              ))}
            </ResultSection>
          )}

          {results.deals.length > 0 && (
            <ResultSection title="Deals" icon={<TrendingUp size={14} />}>
              {results.deals.map((d) => (
                <ResultItem
                  key={d.id}
                  primary={d.name}
                  secondary={`${d.accounts?.name || ""} · ${d.stage}`}
                  onClick={() => handleSelect(`/pipeline`)}
                />
              ))}
            </ResultSection>
          )}

          {results.competitors.length > 0 && (
            <ResultSection title="Đối thủ" icon={<Target size={14} />}>
              {results.competitors.map((c) => (
                <ResultItem
                  key={c.id}
                  primary={c.name}
                  secondary={c.market_share || ""}
                  onClick={() => handleSelect(`/competitors`)}
                />
              ))}
            </ResultSection>
          )}
        </div>

        <div className="px-6 py-3 border-t border-white/5 bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex gap-6">
          <span className="flex items-center gap-1.5"><span className="text-slate-300">↵</span> Mở</span>
          <span className="flex items-center gap-1.5"><span className="text-slate-300">Esc</span> Đóng</span>
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, icon, children }) {
  return (
    <div className="px-2">
      <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-primary/60 uppercase tracking-widest border-b border-white/5 mb-1">
        {icon}
        {title}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ResultItem({ primary, secondary, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-all group border border-transparent hover:border-white/5"
    >
      <div className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">{primary}</div>
      {secondary && <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">{secondary}</div>}
    </button>
  );
}
