import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, AlertCircle, Zap, Search, Filter,
  ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, DollarSign, Target, BarChart2, Trash2,
  ChevronRight, Save, Clock, Briefcase, FileText,
  List, AlignJustify, ChevronLeft
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import { format, differenceInDays, parseISO, isValid, isPast, addMonths, startOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getDeals, createDeal, updateDeal, deleteDeal, getAccounts } from '../lib/supabase';
import { getDealCoaching } from '../lib/ai';
import LoadingSpinner, { PageLoader } from '../components/LoadingSpinner';

// --- Constants ---
const STAGE_LABEL = {
  Prospect: 'Tiềm năng',
  Qualified: 'Đã xác nhận',
  Proposal: 'Báo giá',
  Negotiation: 'Đàm phán',
  'Closed Won': 'Thắng',
  'Closed Lost': 'Thua',
};

const STAGE_COLOR = {
  Prospect:      { bg: 'bg-slate-100',  text: 'text-slate-700',  hex: '#94a3b8' },
  Qualified:     { bg: 'bg-blue-100',   text: 'text-blue-700',   hex: '#3b82f6' },
  Proposal:      { bg: 'bg-amber-100',  text: 'text-amber-700',  hex: '#f59e0b' },
  Negotiation:   { bg: 'bg-purple-100', text: 'text-purple-700', hex: '#8b5cf6' },
  'Closed Won':  { bg: 'bg-green-100',  text: 'text-green-700',  hex: '#22c55e' },
  'Closed Lost': { bg: 'bg-red-100',    text: 'text-red-700',    hex: '#ef4444' },
};

// --- Helpers ---
const fmtShort = (v) => {
  if (!v && v !== 0) return '—';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  return `${(v / 1_000).toFixed(0)}K`;
};

const fmt = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(v);
};

const safeDate = (d) => {
  if (!d) return null;
  const p = typeof d === 'string' ? parseISO(d) : new Date(d);
  return isValid(p) ? p : null;
};

export default function Pipeline() {
  const [searchParams] = useSearchParams();
  const [deals, setDeals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingDeal, setSaving] = useState(false);
  const [selectedDeal, setSelected] = useState(null);
  const [coachLoading, setCoachL] = useState(false);
  const [coachResult, setCoachR] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageF] = useState('All');
  const [accountFilter, setAccountF] = useState('All');
  const [probMin, setProbMin] = useState('');
  const [probMax, setProbMax] = useState('');

  // Sort
  const [sortField, setSortField] = useState('value');
  const [sortDir, setSortDir] = useState('desc');

  // Density & Pagination
  const [density, setDensity] = useState(localStorage.getItem('pipeline_density') || 'compact');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, accountFilter, probMin, probMax]);

  const handleDensityChange = (newMode) => {
    setDensity(newMode);
    localStorage.setItem('pipeline_density', newMode);
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [dealsRes, accountsRes] = await Promise.all([
        getDeals(),
        getAccounts()
      ]);
      setDeals(dealsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Filter & Sort Logic ---
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => 
        d.name?.toLowerCase().includes(s) || 
        d.accounts?.name?.toLowerCase().includes(s) ||
        d.product?.toLowerCase().includes(s)
      );
    }

    // Stage
    if (stageFilter !== 'All') {
      result = result.filter(d => d.stage === stageFilter);
    }

    // Account
    if (accountFilter !== 'All') {
      result = result.filter(d => d.account_id === accountFilter);
    }

    // Probability
    if (probMin !== '') {
      result = result.filter(d => (d.probability || 0) >= parseInt(probMin));
    }
    if (probMax !== '') {
      result = result.filter(d => (d.probability || 0) <= parseInt(probMax));
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nested account name
      if (sortField === 'account_name') {
        valA = a.accounts?.name || '';
        valB = b.accounts?.name || '';
      }

      // Handle calculated weighted value
      if (sortField === 'weighted') {
        valA = (a.value || 0) * ((a.probability || 0) / 100);
        valB = (b.value || 0) * ((b.probability || 0) / 100);
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (sortField === 'expected_close' || sortField === 'created_at') {
        const dateA = safeDate(valA)?.getTime() || 0;
        const dateB = safeDate(valB)?.getTime() || 0;
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }

      return sortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });

    return result;
  }, [deals, search, stageFilter, accountFilter, probMin, probMax, sortField, sortDir]);

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedForecast = activeDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
    
    const wonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = deals.filter(d => d.stage === 'Closed Lost').length;
    const winRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    return { activeDeals: activeDeals.length, totalPipeline, weightedForecast, winRate, wonCount, lostCount };
  }, [deals]);

  const tableTotals = useMemo(() => {
    const totalRaw = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalWeighted = filteredDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
    return { totalRaw, totalWeighted };
  }, [filteredDeals]);

  const paginatedDeals = useMemo(() => {
    return filteredDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredDeals, page]);

  // --- Handlers ---
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleRowClick = (deal) => {
    setCoachR(null);
    setSelected(deal);
  };

  const handleAICoach = async () => {
    if (!selectedDeal) return;
    setCoachL(true);
    setCoachR(null);
    try {
      const result = await getDealCoaching(selectedDeal);
      setCoachR(result);
    } catch (err) {
      console.error(err);
      setCoachR("Không thể kết nối với AI Coach lúc này.");
    } finally {
      setCoachL(false);
    }
  };

  const handleUpdateNotes = async (notes) => {
    setSavingDeal(true);
    try {
      const { data, error } = await updateDeal(selectedDeal.id, { notes });
      if (!error) {
        setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, notes } : d));
        setSelected(prev => ({ ...prev, notes }));
      }
    } finally {
      setSavingDeal(false);
    }
  };

  const handleDeleteDeal = async () => {
    setSavingDeal(true);
    try {
      const { error } = await deleteDeal(selectedDeal.id);
      if (!error) {
        setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        setSelected(null);
        setShowDeleteConfirm(false);
      }
    } finally {
      setSavingDeal(false);
    }
  };

  if (loading && deals.length === 0) return <PageLoader />;

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      {/* 1. Header Bar */}
      <Header onAdd={() => setShowAdd(true)} />

      <div className="w-full px-6 space-y-6">
        {/* 2. KPI Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Deals đang mở" value={kpis.activeDeals} sub="Cơ hội tiềm năng" icon={<BarChart2 className="text-blue-500" />} />
          <KPICard title="Tổng pipeline" value={fmtShort(kpis.totalPipeline)} sub="Chưa tính trọng số" icon={<DollarSign className="text-emerald-500" />} />
          <KPICard title="Dự báo weighted" value={fmtShort(kpis.weightedForecast)} sub="Tính theo xác suất" icon={<TrendingUp className="text-purple-500" />} />
          <KPICard title="Tỷ lệ thắng" value={`${kpis.winRate.toFixed(1)}%`} sub={`${kpis.wonCount} thắng / ${kpis.lostCount} thua`} icon={<Target className="text-red-500" />} />
        </div>

        {/* 3. Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm tên deal, tài khoản, sản phẩm..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
            value={stageFilter}
            onChange={e => setStageF(e.target.value)}
          >
            <option value="All">Tất cả giai đoạn</option>
            {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select 
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none max-w-[200px]"
            value={accountFilter}
            onChange={e => setAccountF(e.target.value)}
          >
            <option value="All">Tất cả tài khoản</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="Min %" 
              className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
              value={probMin}
              onChange={e => setProbMin(e.target.value)}
            />
            <span className="text-gray-400">—</span>
            <input 
              type="number" 
              placeholder="Max %" 
              className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
              value={probMax}
              onChange={e => setProbMax(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">
              {filteredDeals.length} deals
            </span>
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button 
                onClick={() => handleDensityChange('comfortable')}
                className={`p-1.5 rounded-md transition-colors ${density === 'comfortable' ? 'bg-white shadow-sm border border-gray-200/50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Rộng rãi"
              >
                <AlignJustify size={14} />
              </button>
              <button 
                onClick={() => handleDensityChange('compact')}
                className={`p-1.5 rounded-md transition-colors ${density === 'compact' ? 'bg-white shadow-sm border border-gray-200/50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Thu gọn"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Sortable Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <Th label="Tên Deal" field="name" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Tài khoản" field="account_name" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Sản phẩm" field="product" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Giai đoạn" field="stage" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Giá trị" field="value" current={sortField} dir={sortDir} onSort={toggleSort} align="right" density={density} />
                  <Th label="Xác suất" field="probability" current={sortField} dir={sortDir} onSort={toggleSort} align="center" density={density} />
                  <Th label="Weighted" field="weighted" current={sortField} dir={sortDir} onSort={toggleSort} align="right" density={density} />
                  <Th label="Đóng" field="expected_close" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Tuổi" field="created_at" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                </tr>
              </thead>
              <tbody className="">
                {paginatedDeals.map((deal, index) => {
                  const tdClass = density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-4 text-sm';
                  return (
                  <tr 
                    key={deal.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 cursor-pointer transition-colors border-b border-gray-100/80`}
                    onClick={() => handleRowClick(deal)}
                  >
                    <td className={`${tdClass} font-semibold text-gray-900`}>{deal.name}</td>
                    <td className={`${tdClass} text-gray-600`}>{deal.accounts?.name || '—'}</td>
                    <td className={`${tdClass} text-gray-400 italic`}>{deal.product || '—'}</td>
                    <td className={`${tdClass}`}>
                      <CompactStageBadge stage={deal.stage} />
                    </td>
                    <td className={`${tdClass} text-right font-bold text-gray-900`}>{fmt(deal.value)}</td>
                    <td className={`${tdClass} text-center`}>
                      <ProbBadge prob={deal.probability} />
                    </td>
                    <td className={`${tdClass} text-right font-bold text-emerald-600`}>
                      {fmt((deal.value || 0) * ((deal.probability || 0) / 100))}
                    </td>
                    <td className={`${tdClass}`}>
                      <DateCell date={deal.expected_close} stage={deal.stage} />
                    </td>
                    <td className={`${tdClass} text-gray-400`}>
                      {differenceInDays(new Date(), safeDate(deal.created_at) || new Date())}d
                    </td>
                  </tr>
                )})}
              </tbody>
              <tfoot className="bg-gray-50/50 font-bold border-t border-gray-100">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-gray-500 uppercase tracking-wider text-[11px]">Tổng Pipeline:</td>
                  <td className="px-4 py-2 text-right text-gray-900 text-xs">{fmt(tableTotals.totalRaw)}</td>
                  <td></td>
                  <td className="px-4 py-2 text-right text-emerald-700 text-xs">{fmt(tableTotals.totalWeighted)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
            Hiển thị {Math.min(paginatedDeals.length, PAGE_SIZE)} / {filteredDeals.length} deals
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <span className="text-xs font-medium text-gray-600 px-2 whitespace-nowrap">
              Trang {page} / {Math.ceil(filteredDeals.length / PAGE_SIZE) || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(Math.ceil(filteredDeals.length / PAGE_SIZE), p + 1))}
              disabled={page >= Math.ceil(filteredDeals.length / PAGE_SIZE)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Tiếp <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* 5. Analytics Section */}
        {deals.length > 0 && (
          <div className="pt-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <BarChart2 size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 italic uppercase tracking-tighter">Phân tích Pipeline</h3>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartCard title="Giá trị theo giai đoạn">
                <ValueByStageChart deals={deals} />
              </ChartCard>
              <ChartCard title="Dự báo theo tháng">
                <ForecastByMonthChart deals={deals} />
              </ChartCard>
              <ChartCard title="Số deal theo giai đoạn">
                <CountByStageChart deals={deals} />
              </ChartCard>
              <ChartCard title="Phân bố xác suất">
                <ProbDistributionChart deals={deals} />
              </ChartCard>
            </div>

            {/* Deal Aging Section */}
            <div className="pt-6 border-t border-gray-100 mt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <Clock size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 italic uppercase tracking-tighter flex items-center gap-2">
                  🕒 Analytic Deal Aging
                  <div className="group relative cursor-pointer text-gray-400 hover:text-purple-500">
                    <AlertCircle size={16} />
                    <div className="absolute left-1/2 -content-center bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none shadow-xl">
                      <strong>Biểu đồ góc phần tư:</strong><br/>
                      🔥 Đẩy mạnh: Gấp & Giá trị cao<br/>
                      ⚠️ Cần can thiệp: Lâu & Giá trị cao<br/>
                      🗑️ Xem xét loại bỏ: Lâu & Giá trị thấp<br/>
                      ✓ Bình thường: Mới & Giá trị thấp
                    </div>
                  </div>
                </h3>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard title="Độ trễ vs. Giá trị (Góc phần tư)">
                  <DealAgeScatterChart deals={deals} />
                </ChartCard>
                <ChartCard title="Mức độ trễ theo giai đoạn">
                  <DealAgeHeatmapChart deals={deals} />
                </ChartCard>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Side Drawer */}
      {selectedDeal && (
        <SideDrawer 
          deal={selectedDeal} 
          onClose={() => setSelected(null)} 
          onSaveNotes={handleUpdateNotes}
          saving={savingDeal}
          onAICoach={handleAICoach}
          coachLoading={coachLoading}
          coachResult={coachResult}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* 7. Add Deal Modal */}
      {showAdd && (
        <AddDealModal 
          accounts={accounts} 
          onClose={() => setShowAdd(false)} 
          onSave={async (data) => {
            setSaving(true);
            const res = await createDeal(data);
            if (!res.error) {
              await fetchData();
              setShowAdd(false);
            }
            setSaving(false);
          }}
          saving={savingDeal}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Xác nhận xóa Deal</h3>
            <p className="text-gray-500 mb-6">Bạn có chắc muốn xóa <b>{selectedDeal?.name}</b>? Thao tác này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 py-2 bg-gray-100 rounded-lg font-semibold"
              >
                Hủy
              </button>
              <button 
                onClick={handleDeleteDeal} 
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                disabled={savingDeal}
              >
                {savingDeal ? <LoadingSpinner size="sm" /> : <Trash2 size={16} />} Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Sub-Components ---

function Header({ onAdd }) {
  return (
    <div className="w-full h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Pipeline</h1>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Quản lý toàn bộ cơ hội bán hàng</p>
      </div>
      <button 
        onClick={onAdd}
        className="btn-primary bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200"
      >
        <Plus size={18} /> Tạo Deal Mới
      </button>
    </div>
  );
}

function KPICard({ title, value, sub, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black tracking-tighter text-gray-900 mb-1">{value}</div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{sub}</div>
    </div>
  );
}

function Th({ label, field, current, dir, onSort, align = 'left', density = 'compact' }) {
  const isActive = current === field;
  const thClass = density === 'compact' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-[11px]';
  return (
    <th 
      className={`${thClass} font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-red-500 transition-colors ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {isActive ? (
          dir === 'asc' ? <ArrowUp size={12} className="text-red-500" /> : <ArrowDown size={12} className="text-red-500" />
        ) : (
          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );
}

function CompactStageBadge({ stage }) {
  const meta = STAGE_COLOR[stage] || { hex: '#cbd5e1' };
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.hex }}></span>
      <span className="text-[10px] font-medium text-gray-700">{STAGE_LABEL[stage] || stage}</span>
    </div>
  );
}

function ProbBadge({ prob }) {
  const p = prob ?? 0;
  let color = 'text-gray-400 bg-gray-100';
  if (p >= 75) color = 'text-green-700 bg-green-100';
  else if (p >= 50) color = 'text-amber-700 bg-amber-100';
  else if (p >= 25) color = 'text-orange-700 bg-orange-100';
  else color = 'text-red-700 bg-red-100';

  return (
    <div className={`mx-auto w-10 px-1.5 py-0.5 rounded text-[10px] font-semibold text-center ${color}`}>
      {p}%
    </div>
  );
}

function DateCell({ date, stage }) {
  if (!date) return <span className="text-gray-300 italic">—</span>;
  const d = parseISO(date);
  const overdue = isPast(d) && stage !== 'Closed Won' && stage !== 'Closed Lost';
  
  return (
    <div className={`flex items-center gap-1 font-medium whitespace-nowrap ${overdue ? 'text-red-500' : 'text-gray-600'}`}>
      {format(d, 'dd/MM/yyyy')}
      {overdue && <AlertCircle size={14} className="animate-pulse" />}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 border-l-4 border-red-500 pl-3">{title}</h4>
      <div className="h-[300px]">
        {children}
      </div>
    </div>
  );
}

// --- Charts ---

function ValueByStageChart({ deals }) {
  const data = useMemo(() => {
    return Object.keys(STAGE_LABEL).map(stage => {
      const val = deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.value || 0), 0);
      return { name: STAGE_LABEL[stage], raw: stage, value: val };
    });
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 40, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
        />
        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => fmtShort(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STAGE_COLOR[entry.raw]?.hex || '#cbd5e1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ForecastByMonthChart({ deals }) {
  const data = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const mDate = startOfMonth(addMonths(now, i));
      const mStr = format(mDate, 'MM/yyyy');
      
      const mDeals = deals.filter(d => {
        const close = safeDate(d.expected_close);
        return close && format(startOfMonth(close), 'MM/yyyy') === mStr && d.stage !== 'Closed Lost';
      });

      const raw = mDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const weighted = mDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);

      months.push({ name: mStr, raw, weighted });
    }
    return months;
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmtShort(v)} />
        <Tooltip formatter={(v) => fmtShort(v)} />
        <Legend verticalAlign="top" height={36}/>
        <Bar dataKey="raw" name="Pipeline" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
        <Bar dataKey="weighted" name="Weighted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CountByStageChart({ deals }) {
  const data = useMemo(() => {
    return Object.keys(STAGE_LABEL).map(stage => ({
      name: STAGE_LABEL[stage],
      raw: stage,
      count: deals.filter(d => d.stage === stage).length
    }));
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STAGE_COLOR[entry.raw]?.hex || '#cbd5e1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProbDistributionChart({ deals }) {
  const data = useMemo(() => {
    const buckets = [
      { name: '0-25%', min: 0, max: 25, color: '#ef4444' },
      { name: '26-50%', min: 26, max: 50, color: '#f59e0b' },
      { name: '51-75%', min: 51, max: 75, color: '#3b82f6' },
      { name: '76-100%', min: 76, max: 100, color: '#22c55e' },
    ];
    return buckets.map(b => ({
      ...b,
      count: deals.filter(d => (d.probability || 0) >= b.min && (d.probability || 0) <= b.max).length
    }));
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DealAgeScatterChart({ deals }) {
  const data = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    return activeDeals.map(d => {
      const days = differenceInDays(new Date(), safeDate(d.updated_at) || safeDate(d.created_at) || new Date());
      return {
        id: d.id,
        name: d.name,
        account: d.accounts?.name || '—',
        stage: d.stage,
        value: d.value || 0,
        days: days,
        probability: d.probability || 0,
        expected_close: d.expected_close,
      };
    });
  }, [deals]);

  const { avgDays, avgValue } = useMemo(() => {
    if (data.length === 0) return { avgDays: 0, avgValue: 0 };
    const totalDays = data.reduce((sum, d) => sum + d.days, 0);
    const totalVal = data.reduce((sum, d) => sum + d.value, 0);
    return {
      avgDays: totalDays / data.length,
      avgValue: totalVal / data.length,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 text-sm">
          <div className="font-bold text-gray-900 mb-1">{d.name}</div>
          <div className="text-gray-500 mb-2">{d.account}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-400">Giai đoạn:</span>
            <span className="font-medium text-right">{STAGE_LABEL[d.stage] || d.stage}</span>
            <span className="text-gray-400">Giá trị:</span>
            <span className="font-medium text-right">{new Intl.NumberFormat('vi-VN').format(d.value)} đ</span>
            <span className="text-gray-400">Đã ở giai đoạn:</span>
            <span className="font-medium text-right">{d.days} ngày</span>
            <span className="text-gray-400">Xác suất:</span>
            <span className="font-medium text-right">{d.probability}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" dataKey="days" name="Ngày" unit="d" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'dataMax + 10']} />
        <YAxis type="number" dataKey="value" name="Giá trị" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmtShort(v)} />
        <ZAxis type="number" dataKey="probability" range={[30, 250]} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        
        {avgDays > 0 && avgValue > 0 && (
          <>
            <ReferenceLine x={avgDays} stroke="#cbd5e1" strokeDasharray="3 3" />
            <ReferenceLine y={avgValue} stroke="#cbd5e1" strokeDasharray="3 3" />
          </>
        )}
        
        {data.map((entry, index) => (
          <Scatter key={`scatter-${index}`} name={entry.name} data={[entry]} fill={STAGE_COLOR[entry.stage]?.hex || '#cbd5e1'} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function DealAgeHeatmapChart({ deals }) {
  const data = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    
    const stagesDict = {};
    Object.keys(STAGE_LABEL).filter(s => s !== 'Closed Won' && s !== 'Closed Lost').forEach(s => {
      stagesDict[s] = { name: STAGE_LABEL[s], raw: s, '0-14d': 0, '15-30d': 0, '31-60d': 0, '60d+': 0 };
    });

    activeDeals.forEach(d => {
      const days = differenceInDays(new Date(), safeDate(d.updated_at) || safeDate(d.created_at) || new Date());
      if (!stagesDict[d.stage]) return;

      if (days <= 14) stagesDict[d.stage]['0-14d']++;
      else if (days <= 30) stagesDict[d.stage]['15-30d']++;
      else if (days <= 60) stagesDict[d.stage]['31-60d']++;
      else stagesDict[d.stage]['60d+']++;
    });

    return Object.values(stagesDict);
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
        <Bar dataKey="0-14d" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
        <Bar dataKey="15-30d" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="31-60d" stackId="a" fill="#ea580c" radius={[0, 0, 0, 0]} />
        <Bar dataKey="60d+" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Modals & Drawer ---

function SideDrawer({ deal, onClose, onSaveNotes, saving, onAICoach, coachLoading, coachResult, onDelete }) {
  const [notes, setNotes] = useState(deal.notes || '');

  useEffect(() => {
    setNotes(deal.notes || '');
  }, [deal]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} />
        </button>

        <div className="mt-4 flex items-center gap-3 mb-1">
          <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded">Strategic Deal</div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {deal.id.slice(0, 8)}</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">{deal.name}</h2>
        <div className="flex items-center gap-2 mb-8">
          <Briefcase size={14} className="text-red-500" />
          <span className="text-sm font-bold text-gray-700">{deal.accounts?.name || 'Chưa gán tài khoản'}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8">
          <DetailItem label="Giá trị" value={fmt(deal.value)} icon={<DollarSign size={14} />} />
          <DetailItem label="Xác suất" value={<ProbBadge prob={deal.probability} />} icon={<Target size={14} />} />
          <DetailItem label="Sản phẩm" value={deal.product || '—'} icon={<FileText size={14} />} />
          <DetailItem label="Ngày dự kiến" value={deal.expected_close ? format(parseISO(deal.expected_close), 'dd/MM/yyyy') : '—'} icon={<Clock size={14} />} />
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <span className="w-1 h-3 bg-gray-300 rounded-full" /> Ghi chú chiến thuật
            </h3>
            <button 
              onClick={() => onSaveNotes(notes)}
              className="text-[10px] font-bold text-blue-600 uppercase hover:underline flex items-center gap-1"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : <><Save size={10} /> Lưu ghi chú</>}
            </button>
          </div>
          <textarea 
            className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm italic focus:outline-none focus:ring-1 focus:ring-blue-200"
            placeholder="Nhập thông tin tình báo, chiến lược..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <button 
            onClick={onAICoach}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
            disabled={coachLoading}
          >
            {coachLoading ? <LoadingSpinner size="sm" /> : <Zap size={18} />} AI Deal Coach Analysis
          </button>
          
          {coachResult && (
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-widest mb-3">
                <AlertCircle size={14} /> AI Recommendations
              </div>
              <div className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                {coachResult}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-10">
          <button 
            onClick={onDelete}
            className="w-full py-3 text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Xóa Cơ Hội Này
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
        {icon}{label}
      </div>
      <div className="text-sm text-gray-900 font-black tracking-tight">{value}</div>
    </div>
  );
}

function AddDealModal({ accounts, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    account_id: '',
    product: '',
    value: '',
    stage: 'Prospect',
    probability: 10,
    expected_close: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.account_id || !form.value) return;
    onSave({
      ...form,
      value: parseInt(form.value) || 0,
      probability: parseInt(form.probability) || 0
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-8">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1 mt-0">Tạo Deal Mới</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Thêm cơ hội bán hàng vào pipeline</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Tên Deal *</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Tài khoản *</label>
              <select 
                required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
                value={form.account_id}
                onChange={e => setForm({...form, account_id: e.target.value})}
              >
                <option value="">Chọn tài khoản...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Sản phẩm</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
                value={form.product}
                onChange={e => setForm({...form, product: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Giá trị (VND) *</label>
              <input 
                type="number" 
                required 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                value={form.value}
                onChange={e => setForm({...form, value: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Giai đoạn</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                value={form.stage}
                onChange={e => setForm({...form, stage: e.target.value})}
              >
                {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Xác suất (%)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                value={form.probability}
                onChange={e => setForm({...form, probability: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Ngày đóng dự kiến</label>
              <input 
                type="date" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                value={form.expected_close}
                onChange={e => setForm({...form, expected_close: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Ghi chú</label>
              <textarea 
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-2xl font-black uppercase tracking-widest text-xs">Hủy</button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : <Plus size={16} />} Tạo Deal
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}
