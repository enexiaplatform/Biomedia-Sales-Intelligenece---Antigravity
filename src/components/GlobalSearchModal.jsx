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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tài khoản, liên hệ, deal, đối thủ..."
            className="flex-1 text-sm outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full spinner" />
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400 flex gap-4">
          <span>↵ Mở</span>
          <span>Esc Đóng</span>
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ primary, secondary, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
    >
      <div className="text-sm font-medium text-gray-900">{primary}</div>
      {secondary && <div className="text-xs text-gray-500 mt-0.5">{secondary}</div>}
    </button>
  );
}
