import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Trash2, AlertCircle, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid, ReferenceLine,
  PieChart, Pie, Legend
} from "recharts";
import { supabase, createAccount, updateAccount, deleteAccount } from "../lib/supabase";
import ScoreBadge from "../components/ScoreBadge";
import LoadingSpinner, { PageLoader } from "../components/LoadingSpinner";
import CurrencyDisplay from "../components/CurrencyDisplay";

const ACCOUNT_TYPES = ["pharma", "lab", "hospital", "f&b", "university", "other"];
const SIZES = ["small", "medium", "large", "enterprise"];
const TYPE_COLORS = {
  pharma: "#8B5CF6", // purple
  "f&b": "#F59E0B", // amber
  research: "#3B82F6", // blue
  government: "#10B981", // green
  industrial: "#6B7280", // gray
  service: "#14B8A6", // teal
  lab: "#3B82F6",
  hospital: "#10B981",
  university: "#3B82F6",
  other: "#6B7280"
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-xl shadow-xl">
        <p className="text-[#FFFFFF] font-bold text-sm mb-1">{payload[0].payload.name || label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-[12px] font-bold" style={{ color: entry.color || '#8B949E' }}>
            {entry.name}: {entry.name.includes("Pipeline") || entry.dataKey === "pipeline_value" ? `${(entry.value / 1000000).toLocaleString('vi-VN')} tr ₫` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Accounts({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  
  // Filters mapped strictly to the prompt
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedScoreRange, setSelectedScoreRange] = useState("");
  
  // Sorting: name_asc, name_desc, score_desc, score_asc, pipeline_desc, interaction_desc
  const [sortConfig, setSortConfig] = useState({ key: "interaction_desc" }); 

  // Modal & Selection state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [accountsRes, dealsRes, contactsRes, interactionsRes] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('deals').select('account_id, value, stage'),
      supabase.from('contacts').select('account_id'),
      supabase.from('interactions').select('account_id, date').order('date', { ascending: false })
    ]);

    if (accountsRes.error) {
      showToast(accountsRes.error.message, "error");
      setLoading(false);
      return;
    }

    const dealsData = dealsRes.data || [];
    const contactsData = contactsRes.data || [];
    const interactionsData = interactionsRes.data || [];

    const enriched = (accountsRes.data || []).map(acc => {
      const accDeals = dealsData.filter(d => d.account_id === acc.id && !['closed_won','closed_lost'].includes(d.stage));
      const accContacts = contactsData.filter(c => c.account_id === acc.id);
      const accInteractions = interactionsData.filter(i => i.account_id === acc.id);

      return {
        ...acc,
        pipeline_value: accDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        contacts_count: accContacts.length,
        last_interaction: accInteractions[0]?.date || null
      };
    });

    setAccounts(enriched);
    setLoading(false);
  }

  // Derived filter options
  const uniqueRegions = useMemo(() => Array.from(new Set(accounts.map(a => a.region).filter(Boolean))), [accounts]);
  const uniqueSegments = useMemo(() => Array.from(new Set(accounts.map(a => a.segment).filter(Boolean))), [accounts]);

  // Filtering & Sorting Logic
  const filteredAndSorted = useMemo(() => {
    let result = [...accounts];

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(a => a.name?.toLowerCase().includes(lowerSearch));
    }

    if (selectedType) result = result.filter(a => a.type === selectedType);
    if (selectedRegion) result = result.filter(a => a.region === selectedRegion);
    if (selectedSegment) result = result.filter(a => a.segment === selectedSegment);
    if (selectedSize) result = result.filter(a => a.size === selectedSize);
    if (selectedScoreRange) {
      result = result.filter(a => {
        if (selectedScoreRange === "low") return a.score >= 1 && a.score <= 3;
        if (selectedScoreRange === "mid") return a.score >= 4 && a.score <= 6;
        if (selectedScoreRange === "high") return a.score >= 7 && a.score <= 10;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortConfig.key) {
        case "name_asc": return a.name?.localeCompare(b.name);
        case "name_desc": return b.name?.localeCompare(a.name);
        case "score_desc": return (b.score || 0) - (a.score || 0);
        case "score_asc": return (a.score || 0) - (b.score || 0);
        case "pipeline_desc": return (b.pipeline_value || 0) - (a.pipeline_value || 0);
        case "pipeline_asc": return (a.pipeline_value || 0) - (b.pipeline_value || 0);
        case "interaction_desc":
          const dateA = a.last_interaction ? new Date(a.last_interaction).getTime() : 0;
          const dateB = b.last_interaction ? new Date(b.last_interaction).getTime() : 0;
          return dateB - dateA;
        case "interaction_asc":
          const dA = a.last_interaction ? new Date(a.last_interaction).getTime() : 0;
          const dB = b.last_interaction ? new Date(b.last_interaction).getTime() : 0;
          return dA - dB;
        default: return 0;
      }
    });

    return result;
  }, [accounts, search, selectedType, selectedRegion, selectedSegment, selectedSize, selectedScoreRange, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / rowsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSorted.slice(start, start + rowsPerPage);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    // Reset page to 1 when filters change
    setCurrentPage(1);
  }, [search, selectedType, selectedRegion, selectedSegment, selectedSize, selectedScoreRange, sortConfig]);

  const hasActiveFilters = search || selectedType || selectedRegion || selectedSegment || selectedSize || selectedScoreRange;
  const clearFilters = () => {
    setSearch(""); setSelectedType(""); setSelectedRegion(""); setSelectedSegment(""); setSelectedSize(""); setSelectedScoreRange("");
  };

  const handleSort = (field) => {
    let key;
    if (field === "name") key = sortConfig.key === "name_asc" ? "name_desc" : "name_asc";
    if (field === "score") key = sortConfig.key === "score_desc" ? "score_asc" : "score_desc";
    if (field === "pipeline") key = sortConfig.key === "pipeline_desc" ? "pipeline_asc" : "pipeline_desc";
    if (field === "interaction") key = sortConfig.key === "interaction_desc" ? "interaction_asc" : "interaction_desc";
    
    if(key) setSortConfig({ key });
  };

  const exportCSV = () => {
    const rows = filteredAndSorted.map(a => [
      `"${a.name || ''}"`, a.type || '', a.segment || '', a.region || '', a.size || '',
      a.score || 0, a.pipeline_value || 0, a.contacts_count || 0,
      a.last_interaction ? format(new Date(a.last_interaction), 'dd/MM/yyyy') : ''
    ]);
    const header = ['Tên','Loại','Phân khúc','Khu vực','Quy mô','Điểm','Pipeline (VND)','Liên hệ','Tương tác gần nhất'];
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Vietnamese
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'accounts.csv'; 
    a.click();
    URL.revokeObjectURL(url);
  };

  // Inline Cell Editing
  const handleCellSave = async (accountId, field, value) => {
    const { error } = await supabase
      .from('accounts')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', accountId);

    if (!error) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, [field]: value } : a));
      showToast('✓ Đã cập nhật');
    } else {
      showToast('✗ Lỗi cập nhật', 'error');
    }
    setEditingCell(null);
  };

  const handleRowClick = (e, id) => {
    if (e.target.closest('.editable-cell') || e.target.closest('button')) return;
    navigate(`/accounts/${id}`);
  };

  async function handleDelete(id) {
    setDeleting(true);
    const { error } = await deleteAccount(id);
    if (error) showToast(error.message, "error");
    else {
      showToast("✓ Đã xóa tài khoản");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  // Editable Cell Component
  const EditableCell = ({ account, field, type = "text", options = [] }) => {
    const isEditing = editingCell?.rowId === account.id && editingCell?.field === field;
    const [localValue, setLocalValue] = useState(account[field] || "");

    useEffect(() => { setLocalValue(account[field] || ""); }, [account, field]);

    if (!isEditing) {
      return (
        <div 
          className="editable-cell cursor-pointer hover:bg-white/5 border border-transparent hover:border-[#30363D] px-2 py-1 -ml-2 rounded transition-colors w-full h-full min-h-[24px] flex items-center"
          onClick={() => setEditingCell({ rowId: account.id, field })}
        >
          {field === 'type' ? (
             <span className="badge" style={{ backgroundColor: `${TYPE_COLORS[account.type?.toLowerCase()] || TYPE_COLORS.other}20`, color: TYPE_COLORS[account.type?.toLowerCase()] || TYPE_COLORS.other, borderColor: `${TYPE_COLORS[account.type?.toLowerCase()] || TYPE_COLORS.other}40` }}>
               {account[field] || "—"}
             </span>
          ) : field === 'score' ? (
            <ScoreBadge score={account.score} />
          ) : (
            <span className="truncate">{account[field] || "—"}</span>
          )}
        </div>
      );
    }

    const onSave = () => handleCellSave(account.id, field, localValue);
    
    if (type === "select") {
      return (
        <select 
          autoFocus
          className="editable-cell input py-1 px-2 h-auto text-sm w-full bg-[#1F242C] border-[#8B0000]/50"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') setEditingCell(null); }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    return (
      <input 
        autoFocus
        type={type}
        className="editable-cell input py-1 px-2 h-auto text-sm w-full bg-[#1F242C] border-[#8B0000]/50"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') setEditingCell(null); }}
        {...(type === "number" ? { min: 1, max: 10 } : {})}
      />
    );
  };


  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Section 1 - Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#8B0000]/10 rounded-xl border border-[#8B0000]/20">
            <Users className="text-[#8B0000]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Tài Khoản</h1>
            <p className="text-[12px] font-bold text-[#8B949E] uppercase tracking-widest">{filteredAndSorted.length} tài khoản</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="btn-secondary whitespace-nowrap">
            Xuất CSV
          </button>
          <button onClick={() => { setEditingAccount(null); setModalOpen(true); }} className="btn-primary whitespace-nowrap">
            <Plus size={16} /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Section 2 - Filter Bar (Sticky) */}
      <div className="sticky top-[73px] lg:top-0 z-20 bg-[#0D1117]/90 backdrop-blur-xl border border-[#30363D] rounded-2xl p-4 shadow-lg flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Tìm kiếm tên..."
            className="input pl-9 bg-[#161B22]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="input w-auto bg-[#161B22] min-w-[120px]">
           <option value="">Loại: Tất cả</option>
           {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="input w-auto bg-[#161B22] min-w-[130px]">
           <option value="">Khu vực: Tất cả</option>
           {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="input w-auto bg-[#161B22] min-w-[140px]">
           <option value="">Phân khúc: Tất cả</option>
           {uniqueSegments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="input w-auto bg-[#161B22] min-w-[130px]">
           <option value="">Quy mô: Tất cả</option>
           {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={selectedScoreRange} onChange={(e) => setSelectedScoreRange(e.target.value)} className="input w-auto bg-[#161B22] min-w-[120px]">
           <option value="">Điểm: Tất cả</option>
           <option value="low">1-3 (Thấp)</option>
           <option value="mid">4-6 (Trung)</option>
           <option value="high">7-10 (Cao)</option>
        </select>

        <select value={sortConfig.key} onChange={(e) => setSortConfig({ key: e.target.value })} className="input w-auto bg-[#161B22] min-w-[160px]">
           <option value="name_asc">Tên A-Z</option>
           <option value="name_desc">Tên Z-A</option>
           <option value="score_desc">Điểm cao nhất</option>
           <option value="score_asc">Điểm thấp nhất</option>
           <option value="pipeline_desc">Pipeline cao nhất</option>
           <option value="interaction_desc">Tương tác gần nhất</option>
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[12px] font-bold text-[#8B949E] hover:text-white px-2 py-2 uppercase tracking-widest transition-colors">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Section 3 - Table */}
      <div className="card overflow-x-auto min-h-[500px] flex flex-col">
        <table className="table table-zebra w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr>
              <th className="w-[220px] cursor-pointer hover:bg-white/5" onClick={() => handleSort("name")}>
                Tên tài khoản {sortConfig.key === "name_asc" ? "▲" : sortConfig.key === "name_desc" ? "▼" : ""}
              </th>
              <th className="w-[100px]">Loại</th>
              <th className="w-[140px]">Phân khúc</th>
              <th className="w-[120px]">Khu vực</th>
              <th className="w-[80px] cursor-pointer hover:bg-white/5" onClick={() => handleSort("score")}>
                Điểm {sortConfig.key === "score_asc" ? "▲" : sortConfig.key === "score_desc" ? "▼" : ""}
              </th>
              <th className="w-[140px] cursor-pointer hover:bg-white/5" onClick={() => handleSort("pipeline")}>
                Pipeline (VND) {sortConfig.key === "pipeline_asc" ? "▲" : sortConfig.key === "pipeline_desc" ? "▼" : ""}
              </th>
              <th className="w-[80px]">Liên hệ</th>
              <th className="w-[140px] cursor-pointer hover:bg-white/5" onClick={() => handleSort("interaction")}>
                Tương tác gần nhất {sortConfig.key === "interaction_asc" ? "▲" : sortConfig.key === "interaction_desc" ? "▼" : ""}
              </th>
              <th className="w-[80px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="flex-1">
            {loading ? (
              Array(5).fill().map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-[#30363D]">
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-3/4"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-16"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-24"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-20"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-10"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-24"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-8"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-20"></div></td>
                  <td className="p-4"><div className="h-4 bg-[#30363D] rounded w-8"></div></td>
                </tr>
              ))
            ) : currentData.length === 0 ? (
               <tr>
                 <td colSpan={9} className="text-center py-20">
                   <div className="text-[#8B949E] text-sm font-bold uppercase tracking-widest mb-3">Không tìm thấy tài khoản nào</div>
                   <button onClick={clearFilters} className="text-[#8B0000] hover:underline font-bold text-sm">Xóa bộ lọc</button>
                 </td>
               </tr>
            ) : (
              currentData.map(acc => {
                const daysInactive = acc.last_interaction ? differenceInDays(new Date(), new Date(acc.last_interaction)) : 999;
                return (
                  <tr key={acc.id} onClick={(e) => handleRowClick(e, acc.id)} className="cursor-pointer group">
                    <td className="font-bold text-white group-hover:text-[#8B0000] transition-colors relative">
                      <EditableCell account={acc} field="name" />
                    </td>
                    <td>
                      <EditableCell account={acc} field="type" type="select" options={ACCOUNT_TYPES} />
                    </td>
                    <td>
                       <EditableCell account={acc} field="segment" type="select" options={uniqueSegments.length > 0 ? uniqueSegments : ["Manufacturing", "Hospital", "Research Lab", "University", "Government", "F&B Factory", "Other"]} />
                    </td>
                    <td>
                       <EditableCell account={acc} field="region" type="select" options={uniqueRegions.length > 0 ? uniqueRegions : REGIONS_CONST} />
                    </td>
                    <td>
                       <EditableCell account={acc} field="score" type="number" />
                    </td>
                    <td className="font-bold">
                       {acc.pipeline_value > 0 ? <CurrencyDisplay value={acc.pipeline_value} /> : <span className="text-[#8B949E]">—</span>}
                    </td>
                    <td className="font-bold text-[#8B949E]">
                       {acc.contacts_count > 0 ? acc.contacts_count : "—"}
                    </td>
                    <td>
                       <span className={`font-bold ${daysInactive > 30 ? "text-red-500" : "text-[#8B949E]"}`}>
                         {acc.last_interaction ? format(new Date(acc.last_interaction), "dd/MM/yyyy") : "Chưa có"}
                       </span>
                    </td>
                    <td className="text-right flex items-center justify-end gap-2 pr-4 pt-4">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/accounts/${acc.id}`); }} className="text-[#8B949E] hover:text-white transition-colors" title="Xem chi tiết">
                        <Eye size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(acc); }} className="text-[#8B949E] hover:text-red-500 transition-colors" title="Xóa tài khoản">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Pagination Bar */}
        {!loading && filteredAndSorted.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#30363D] bg-[#161B22]/50 mt-auto">
            <span className="text-[12px] font-bold text-[#8B949E] uppercase tracking-widest">
              Hiển thị {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredAndSorted.length)} trong tổng số {filteredAndSorted.length} tài khoản
            </span>
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                 disabled={currentPage === 1}
                 className="p-1 px-3 text-sm font-bold text-white bg-[#30363D] rounded hover:bg-[#4B535D] disabled:opacity-50"
               >&lt;</button>
               <span className="text-sm font-bold text-white px-2">Trang {currentPage} / {totalPages}</span>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                 disabled={currentPage === totalPages}
                 className="p-1 px-3 text-sm font-bold text-white bg-[#30363D] rounded hover:bg-[#4B535D] disabled:opacity-50"
               >&gt;</button>
            </div>
          </div>
        )}
      </div>

      {/* Section 4 - Analytics Dashboard */}
      {!loading && accounts.length > 0 && (
        <AnalyticsDashboard accounts={accounts} />
      )}

      {/* Modals from Original Code preserved via requirements */}
      {modalOpen && (
        <AccountModal
          account={editingAccount}
          onClose={() => setModalOpen(false)}
          onSave={(saved) => {
            if (editingAccount) {
              setAccounts((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
              showToast("Đã cập nhật tài khoản");
            } else {
              setAccounts((prev) => [saved, ...prev]);
              showToast("Đã thêm tài khoản");
            }
            setModalOpen(false);
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-white mb-2 uppercase tracking-widest text-sm">Xác nhận xóa</h3>
            <p className="text-sm text-[#8B949E] mb-6 leading-relaxed">
              Bạn có chắc muốn xóa tài khoản <strong className="text-white">{deleteTarget.name}</strong>? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1" disabled={deleting}>
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger flex-1" disabled={deleting}>
                {deleting ? <LoadingSpinner size="sm" /> : null}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============== ANALYTICS DASHBOARD COMPONENTS ==============

function AnalyticsDashboard({ accounts }) {
  // Compute chart data
  const topPipeline = useMemo(() => {
    return [...accounts]
      .sort((a,b) => (b.pipeline_value || 0) - (a.pipeline_value || 0))
      .slice(0, 10)
      .map(a => ({
        name: a.name?.substring(0, 15) + (a.name?.length > 15 ? "..." : ""),
        pipeline_value: a.pipeline_value,
        type: a.type
      }));
  }, [accounts]);

  const scatterData = useMemo(() => {
    return accounts.filter(a => a.score != null).map(a => ({
      name: a.name,
      score: a.score || 0,
      pipeline: a.pipeline_value || 0,
      type: a.type
    }));
  }, [accounts]);
  
  const medianPipeline = useMemo(() => {
     const vals = scatterData.map(d => d.pipeline).sort((a,b) => a-b);
     return vals.length ? vals[Math.floor(vals.length / 2)] : 0;
  }, [scatterData]);

  const typeDistribution = useMemo(() => {
    const counts = {};
    accounts.forEach(a => { counts[a.type || 'other'] = (counts[a.type || 'other'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [accounts]);

  const regionDistribution = useMemo(() => {
    const counts = {};
    accounts.forEach(a => { const r = a.region || 'Khác'; counts[r] = (counts[r] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  }, [accounts]);

  const scoreDistribution = useMemo(() => {
    const buckets = { "Thấp (1-3)": 0, "Trung (4-6)": 0, "Cao (7-10)": 0 };
    accounts.forEach(a => {
      if (a.score <= 3) buckets["Thấp (1-3)"]++;
      else if (a.score <= 6) buckets["Trung (4-6)"]++;
      else buckets["Cao (7-10)"]++;
    });
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [accounts]);

  // Heatmap Data
  const uniqueSegs = Array.from(new Set(accounts.map(a => a.segment || 'Khác')));
  const uniqueRegs = Array.from(new Set(accounts.map(a => a.region || 'Khác')));

  const darkAccounts = accounts.filter(a => a.contacts_count === 0).sort((a,b) => (b.score||0) - (a.score||0));
  
  const inactiveAccounts = accounts.filter(a => {
    if (!a.last_interaction) return true;
    return differenceInDays(new Date(), new Date(a.last_interaction)) > 30;
  }).sort((a,b) => {
    const dA = a.last_interaction ? differenceInDays(new Date(), new Date(a.last_interaction)) : 999;
    const dB = b.last_interaction ? differenceInDays(new Date(), new Date(b.last_interaction)) : 999;
    return dB - dA;
  });

  return (
    <div className="mt-8 pt-8 border-t border-[#30363D]">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          📊 Phân Tích Danh Mục
        </h2>
        <p className="text-[12px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">Cập nhật mỗi lần tải trang</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Panel 1 */}
        <div className="card p-5">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-6">🏆 Top 10 theo Pipeline</h3>
           <ResponsiveContainer width="100%" height={250}>
             <BarChart data={topPipeline} margin={{ top: 20 }}>
               <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B949E', fontWeight: 700 }} tickMargin={10} axisLine={false} tickLine={false} />
               <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
               <Bar dataKey="pipeline_value" radius={[4, 4, 0, 0]}>
                 {topPipeline.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type?.toLowerCase()] || TYPE_COLORS.other} />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>

        {/* Panel 2 */}
        <div className="card p-5">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-6">📍 Điểm vs Pipeline</h3>
           <ResponsiveContainer width="100%" height={250}>
             <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
               <XAxis type="number" dataKey="score" name="Điểm" domain={[0, 10]} tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 700 }} />
               <YAxis type="number" dataKey="pipeline" name="Pipeline" tickFormatter={v => `${v/1000000}tr`} tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 700 }} />
               <ZAxis type="category" dataKey="name" name="Tên" />
               <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
               <Scatter data={scatterData} fill="#8884d8">
                 {scatterData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type?.toLowerCase()] || TYPE_COLORS.other} />
                 ))}
               </Scatter>
               <ReferenceLine x={6} stroke="#EF4444" strokeOpacity={0.5} label={{ position: 'top', value: 'Ngôi sao / Tiềm năng', fill: '#8B949E', fontSize: 10 }} />
             </ScatterChart>
           </ResponsiveContainer>
        </div>

        {/* Panel 3 */}
        <div className="card p-5 flex flex-col items-center">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-2 self-start w-full">🏷️ Phân bố theo Loại</h3>
           <div className="w-full flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                   {typeDistribution.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name?.toLowerCase()] || TYPE_COLORS.other} stroke="none" />
                   ))}
                 </Pie>
                 <Tooltip content={<CustomTooltip />} />
                 <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8B949E' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Panel 4 */}
        <div className="card p-5">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-6">📍 Phân bố theo Khu vực</h3>
           <ResponsiveContainer width="100%" height={250}>
             <BarChart data={regionDistribution} layout="vertical" margin={{ left: 30 }}>
               <XAxis type="number" hide />
               <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#8B949E', fontWeight: 700 }} axisLine={false} tickLine={false} />
               <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
               <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#8B0000" barSize={20} />
             </BarChart>
           </ResponsiveContainer>
        </div>

        {/* Panel 5 */}
        <div className="card p-5">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-6">📊 Phân bố Điểm</h3>
           <ResponsiveContainer width="100%" height={250}>
             <BarChart data={scoreDistribution}>
               <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B949E', fontWeight: 700 }} axisLine={false} tickLine={false} />
               <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
               <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60}>
                 {scoreDistribution.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index === 0 ? "#EF4444" : index === 1 ? "#F59E0B" : "#10B981"} />
                 ))}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>

        {/* Panel 6 - Heatmap */}
        <div className="card p-5 overflow-auto">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] mb-6">🗺️ Heatmap Phân khúc × Khu vực</h3>
           <div className="min-w-[500px]">
             <div className="flex border-b border-[#30363D]">
               <div className="w-32 p-2"></div>
               {uniqueRegs.map(r => (
                 <div key={r} className="flex-1 p-2 text-center text-[10px] font-bold text-[#8B949E] uppercase truncate" title={r}>{r}</div>
               ))}
             </div>
             {uniqueSegs.map(seg => (
               <div key={seg} className="flex border-b border-[#30363D]/50 hover:bg-white/[0.02]">
                 <div className="w-32 p-2 text-[10px] font-bold text-[#8B949E] uppercase truncate flex items-center border-r border-[#30363D]" title={seg}>{seg}</div>
                 {uniqueRegs.map(reg => {
                   const count = accounts.filter(a => (a.segment || 'Khác') === seg && (a.region || 'Khác') === reg).length;
                   let bg = "transparent";
                   if (count > 0) bg = "rgba(139, 0, 0, 0.2)";
                   if (count > 2) bg = "rgba(139, 0, 0, 0.5)";
                   if (count >= 5) bg = "rgba(139, 0, 0, 0.9)";
                   return (
                     <div key={reg} className="flex-1 p-2 flex items-center justify-center border-r border-[#30363D]/30" style={{ backgroundColor: bg }}>
                        <span className={`text-xs font-bold ${count > 0 ? "text-white" : "text-[#30363D]"}`}>
                          {count > 0 ? count : "—"}
                        </span>
                     </div>
                   );
                 })}
               </div>
             ))}
           </div>
        </div>

        {/* Panel 7 - Dark Accounts */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#30363D] bg-[#EF4444]/10">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-[#EF4444]">⚠️ Dark Accounts ({darkAccounts.length})</h3>
             <p className="text-xs text-[#8B949E] mt-1 font-bold">Chưa có liên hệ nào</p>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] p-0">
            {darkAccounts.length === 0 ? (
               <div className="flex items-center justify-center h-full text-sm font-bold text-[#2EA043] uppercase tracking-widest py-10">✅ Tất cả tài khoản đã có liên hệ</div>
            ) : (
              <table className="w-full text-left table-zebra text-sm border-collapse">
                <thead className="bg-[#1F242C] sticky top-0 border-b border-[#30363D]">
                   <tr>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Tên</th>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Khu vực</th>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Điểm</th>
                   </tr>
                </thead>
                <tbody>
                   {darkAccounts.map(a => (
                     <tr key={a.id} className="border-b border-[#30363D]/50 hover:bg-white/5 cursor-pointer">
                        <td className="p-3 text-white font-bold max-w-[150px] truncate"><Link to={`/accounts/${a.id}`}>{a.name}</Link></td>
                        <td className="p-3 text-[#8B949E] font-bold text-xs uppercase">{a.region || "—"}</td>
                        <td className="p-3"><ScoreBadge score={a.score} /></td>
                     </tr>
                   ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 8 - Inactive Accounts */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#30363D] bg-[#D29922]/10">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D29922]">🔇 Không hoạt động ({inactiveAccounts.length})</h3>
             <p className="text-xs text-[#8B949E] mt-1 font-bold">Im lặng {'>'} 30 ngày</p>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] p-0">
            {inactiveAccounts.length === 0 ? (
               <div className="flex items-center justify-center h-full text-sm font-bold text-[#2EA043] uppercase tracking-widest py-10">✅ Tất cả tài khoản đang hoạt động tốt</div>
            ) : (
              <table className="w-full text-left table-zebra text-sm border-collapse">
                <thead className="bg-[#1F242C] sticky top-0 border-b border-[#30363D]">
                   <tr>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Tên</th>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Tương tác cuối</th>
                     <th className="p-3 text-[10px] font-bold text-[#8B949E] uppercase tracking-widest text-right">Ngày im lặng</th>
                   </tr>
                </thead>
                <tbody>
                   {inactiveAccounts.map(a => {
                     const days = a.last_interaction ? differenceInDays(new Date(), new Date(a.last_interaction)) : 999;
                     return (
                       <tr key={a.id} className="border-b border-[#30363D]/50 hover:bg-white/5 cursor-pointer">
                          <td className="p-3 text-white font-bold max-w-[150px] truncate"><Link to={`/accounts/${a.id}`}>{a.name}</Link></td>
                          <td className="p-3 text-[#8B949E] font-bold text-xs uppercase">{a.last_interaction ? format(new Date(a.last_interaction), "dd/MM/yyyy") : "Chưa có"}</td>
                          <td className={`p-3 text-right font-bold ${days > 60 ? "text-[#EF4444]" : "text-[#D29922]"}`}>
                            {days === 999 ? "Chưa bao giờ" : `${days} ngày`}
                          </td>
                       </tr>
                     )
                   })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


// ============== ORIGINAL MODAL COMPONENT PRESERVED ==============
function AccountModal({ account, onClose, onSave }) {
  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "pharma",
    segment: account?.segment || "",
    region: account?.region || "",
    size: account?.size || "",
    website: account?.website || "",
    address: account?.address || "",
    score: account?.score ?? 5,
    score_reason: account?.score_reason || "",
    pain_points: account?.pain_points || "",
    budget_cycle: account?.budget_cycle || "",
    buying_process: account?.buying_process || "",
    current_needs: account?.current_needs || "",
    notes: account?.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "score" ? parseInt(value) : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Tên tài khoản là bắt buộc");
    setSaving(true);
    const fn = account ? updateAccount(account.id, form) : createAccount(form);
    const { data, error: err } = await fn;
    setSaving(false);
    if (err) return setError(err.message);
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#161B22] rounded-xl shadow-2xl w-full max-w-2xl my-4 border border-[#30363D]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D]">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {account ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50/10 px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Tên tài khoản *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Tên công ty..." />
            </div>
            <div>
              <label className="label">Loại</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select name="region" value={form.region} onChange={handleChange} className="input">
                <option value="">-- Chọn khu vực --</option>
                {/* Fallback to global if unique fails during modal render */}
                {["Hà Nội", "TP.HCM", "Miền Trung", "Miền Nam", "Miền Bắc"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phân khúc</label>
              <input name="segment" value={form.segment} onChange={handleChange} className="input" placeholder="VD: Pharma QC" />
            </div>
            <div>
              <label className="label">Quy mô</label>
              <select name="size" value={form.size} onChange={handleChange} className="input">
                <option value="">-- Chọn quy mô --</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Website</label>
              <input name="website" value={form.website} onChange={handleChange} className="input" placeholder="https://..." />
            </div>
            <div>
              <label className="label">Điểm ({form.score}/10)</label>
              <input type="range" min={0} max={10} name="score" value={form.score} onChange={handleChange} className="w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Địa chỉ</label>
              <input name="address" value={form.address} onChange={handleChange} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lý do điểm</label>
              <input name="score_reason" value={form.score_reason} onChange={handleChange} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Điểm đau</label>
              <textarea name="pain_points" value={form.pain_points} onChange={handleChange} rows={2} className="input" />
            </div>
            <div>
              <label className="label">Chu kỳ ngân sách</label>
              <input name="budget_cycle" value={form.budget_cycle} onChange={handleChange} className="input" placeholder="VD: Q1, Q3 hàng năm" />
            </div>
            <div>
              <label className="label">Quy trình mua hàng</label>
              <input name="buying_process" value={form.buying_process} onChange={handleChange} className="input" placeholder="VD: Đấu thầu công khai" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nhu cầu hiện tại</label>
              <textarea name="current_needs" value={form.current_needs} onChange={handleChange} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ghi chú</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="input" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {account ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
