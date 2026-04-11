import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, AlertCircle, Zap, Search, Filter,
  ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, DollarSign, Target, BarChart2, Trash2,
  ChevronRight, Save, Clock, Briefcase, FileText,
  List, AlignJustify, ChevronLeft, Edit2
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
import { VND_TO_SGD_RATE } from '../lib/constants';

// --- Constants ---
const STAGE_LABEL = {
  Prospect: 'Tiềm năng',
  Qualified: 'Đã xác nhận',
  Proposal: 'Báo giá',
  Negotiation: 'Đàm phán',
  'Closed Won': 'Thắng',
  'Closed Lost': 'Thua',
};

// Convert UI -> DB
const stageToDb = {
  'Prospect': 'prospect',
  'Qualified': 'qualified', 
  'Proposal': 'proposal',
  'Negotiation': 'negotiation',
  'Closed Won': 'closed_won',
  'Closed Lost': 'closed_lost',
};

// Convert DB -> UI
const stageFromDb = {
  'prospect': 'Prospect',
  'qualified': 'Qualified',
  'proposal': 'Proposal',
  'negotiation': 'Negotiation',
  'closed_won': 'Closed Won',
  'closed_lost': 'Closed Lost',
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

const fmtSGD = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency', currency: 'SGD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
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
  const [savingDeal, setSavingDeal] = useState(false);
  const [selectedDeal, setSelected] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [coachLoading, setCoachL] = useState(false);
  const [coachResult, setCoachR] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageF] = useState('All');
  const [accountFilter, setAccountF] = useState('All');
  const [probMin, setProbMin] = useState('');
  const [probMax, setProbMax] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const csvInputRef = useRef(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, accountsRes] = await Promise.all([
        getDeals(),
        getAccounts()
      ]);
      if (!dealsRes.error) {
        const mapped = (dealsRes.data || []).map(d => ({
          ...d,
          stage: stageFromDb[d.stage] || d.stage
        }));
        setDeals(mapped);
      }
      setAccounts(accountsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

    // Tab Filter
    if (activeTab === 'prospect') {
      result = result.filter(d => d.stage === 'Prospect');
    } else if (activeTab === 'lead') {
      result = result.filter(d => d.stage === 'Qualified');
    } else if (activeTab === 'opportunity') {
      const oppStages = ['Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
      result = result.filter(d => oppStages.includes(d.stage));
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

      if (sortField === 'value' || sortField === 'weighted') {
        // Simple numeric comparison for these
        return sortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
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
  }, [deals, search, stageFilter, accountFilter, probMin, probMax, sortField, sortDir, activeTab]);

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    
    const vndDeals = activeDeals.filter(d => (d.currency || 'VND') === 'VND');
    const sgdDeals = activeDeals.filter(d => d.currency === 'SGD');

    const totalPipelineVND = vndDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalPipelineSGD = sgdDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const weightedForecastVND = vndDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
    const weightedForecastSGD = sgdDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
    
    const wonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = deals.filter(d => d.stage === 'Closed Lost').length;
    const winRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    return { 
      activeDealsCount: activeDeals.length, 
      totalPipelineVND, 
      totalPipelineSGD,
      weightedForecastVND, 
      weightedForecastSGD,
      winRate, wonCount, lostCount 
    };
  }, [deals]);

  const tableTotals = useMemo(() => {
    const vnd = filteredDeals.filter(d => (d.currency || 'VND') === 'VND');
    const sgd = filteredDeals.filter(d => d.currency === 'SGD');

    return {
      vndRaw: vnd.reduce((sum, d) => sum + (d.value || 0), 0),
      vndWeighted: vnd.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0),
      sgdRaw: sgd.reduce((sum, d) => sum + (d.value || 0), 0),
      sgdWeighted: sgd.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0),
    };
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

  const handleUpdateDeal = async (dealId, updates) => {
    setSavingDeal(true);
    try {
      const dbUpdates = { ...updates };
      if (dbUpdates.stage) dbUpdates.stage = stageToDb[dbUpdates.stage] || dbUpdates.stage;

      const { error } = await updateDeal(dealId, dbUpdates);
      if (!error) {
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
        setSelected(prev => ({ ...prev, ...updates }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } finally {
      setSavingDeal(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Deal Name','Account','Product','Stage','Value','Currency','Probability (%)','Weighted','Expected Close','Notes','Created At'];
    const rows = filteredDeals.map(d => [
      d.name, 
      d.accounts?.name || '', 
      d.product || '',
      STAGE_LABEL[d.stage] || d.stage,
      d.value || 0, 
      d.currency || 'VND',
      d.probability || 0,
      ((d.value||0)*(d.probability||0)/100).toFixed(0),
      d.expected_close || '',
      (d.notes || '').replace(/\n/g,' '),
      d.created_at || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setShowImport(true);
  };

  const [csvFile, setCsvFile] = useState(null);

  const executeImport = async (data) => {
    setImporting(true);
    setImportProgress({ current: 0, total: data.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const account = accounts.find(a => a.name.toLowerCase() === row.accountName?.toLowerCase());
      
      if (!account) {
        failCount++;
        setImportProgress(prev => ({ ...prev, current: i + 1 }));
        continue;
      }

      const newDeal = {
        name: row.name,
        account_id: account.id,
        product: row.product || '',
        value: parseInt(row.value) || 0,
        currency: row.currency || 'VND',
        stage: stageToDb[row.stage] || row.stage, // Map here
        probability: parseInt(row.probability) || 10,
        expected_close: row.expectedClose || null,
        notes: row.notes || ''
      };

      const res = await createDeal(newDeal);
      if (!res.error) {
        successCount++;
      } else {
        failCount++;
      }
      setImportProgress(prev => ({ ...prev, current: i + 1 }));
    }
    fetchData();
    setImporting(false);
    setShowImport(false);
    setCsvFile(null);
    if (csvInputRef.current) csvInputRef.current.value = '';
    alert(`Đã import ${successCount} deals thành công, ${failCount} rows bị bỏ qua hoặc lỗi.`);
  };

  const handleDeleteDeal = async () => {
    if (!selectedDeal) return;
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
      <Header 
        onAdd={() => setShowAdd(true)} 
        onExport={exportCSV}
        onImportClick={handleImportClick}
        onImport={handleFileChange}
        csvInputRef={csvInputRef}
      />

      <div className="w-full px-6 space-y-6">
        {/* 2. KPI Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Deals đang mở" value={kpis.activeDealsCount} sub="Cơ hội tiềm năng" icon={<BarChart2 className="text-blue-500" />} />
          <KPICard 
            title="Tổng pipeline" 
            value={
              <div className="flex flex-col">
                <span className="text-2xl">{fmt(kpis.totalPipelineVND)}</span>
                {kpis.totalPipelineSGD > 0 && <span className="text-xl text-blue-600">{fmtSGD(kpis.totalPipelineSGD)}</span>}
              </div>
            }
            sub={kpis.totalPipelineSGD > 0 ? "VND + SGD Combined" : "Cơ hội (VND)"} 
            icon={<DollarSign className="text-emerald-500" />} 
          />
          <KPICard 
            title="Dự báo weighted" 
            value={
              <div className="flex flex-col">
                <span className="text-2xl">{fmt(kpis.weightedForecastVND)}</span>
                {kpis.weightedForecastSGD > 0 && <span className="text-xl text-blue-600">{fmtSGD(kpis.weightedForecastSGD)}</span>}
              </div>
            }
            sub="Tính theo xác suất" 
            icon={<TrendingUp className="text-purple-500" />} 
          />
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

        {/* 3b. Tab Bar */}
        <div className="flex items-center gap-8 border-b border-gray-200 px-2 mt-4">
          <TabItem label="Tất cả" count={deals.length} active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
          <TabItem 
            label="Prospect" 
            count={deals.filter(d => d.stage === 'Prospect').length} 
            active={activeTab === 'prospect'} 
            onClick={() => setActiveTab('prospect')} 
          />
          <TabItem 
            label="Lead" 
            count={deals.filter(d => d.stage === 'Qualified').length} 
            active={activeTab === 'lead'} 
            onClick={() => setActiveTab('lead')} 
          />
          <TabItem 
            label="Opportunity" 
            count={deals.filter(d => ['Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].includes(d.stage)).length} 
            active={activeTab === 'opportunity'} 
            onClick={() => setActiveTab('opportunity')} 
          />
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
                  <Th label="Giá trị (VND)" field="value" current={sortField} dir={sortDir} onSort={toggleSort} align="right" density={density} />
                  <Th label="Giá trị (SGD)" field="value" current={sortField} dir={sortDir} onSort={toggleSort} align="right" density={density} />
                  <Th label="Xác suất" field="probability" current={sortField} dir={sortDir} onSort={toggleSort} align="center" density={density} />
                  <Th label="Weighted" field="weighted" current={sortField} dir={sortDir} onSort={toggleSort} align="right" density={density} />
                  <Th label="Đóng" field="expected_close" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <Th label="Tuổi" field="created_at" current={sortField} dir={sortDir} onSort={toggleSort} density={density} />
                  <th className="px-3 py-2"></th>
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
                    <td className={`${tdClass} text-right font-bold text-gray-900`}>
                      {(deal.currency || 'VND') === 'VND' ? fmt(deal.value) : '—'}
                    </td>
                    <td className={`${tdClass} text-right font-bold text-blue-600`}>
                      {deal.currency === 'SGD' ? fmtSGD(deal.value) : '—'}
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <ProbBadge prob={deal.probability} />
                    </td>
                    <td className={`${tdClass} text-right font-bold text-emerald-600`}>
                      <div>{deal.currency === 'SGD' ? fmtSGD((deal.value || 0) * (deal.probability || 0) / 100) : fmt((deal.value || 0) * (deal.probability || 0) / 100)}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{deal.currency || 'VND'}</div>
                    </td>
                    <td className={`${tdClass}`}>
                      <DateCell date={deal.expected_close} stage={deal.stage} />
                    </td>
                    <td className={`${tdClass} text-gray-400`}>
                      {differenceInDays(new Date(), safeDate(deal.created_at) || new Date())}d
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelected(deal); setEditingDeal(deal); }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                        title="Chỉnh sửa nhanh"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
              <tfoot className="bg-gray-50/50 font-bold border-t border-gray-100">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-gray-500 uppercase tracking-wider text-[11px]">Tổng Pipeline:</td>
                  <td className="px-4 py-2 text-right text-gray-900 text-xs">
                    {tableTotals.vndRaw > 0 ? fmt(tableTotals.vndRaw) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-blue-700 text-xs">
                    {tableTotals.sgdRaw > 0 ? fmtSGD(tableTotals.sgdRaw) : '—'}
                  </td>
                  <td></td>
                  <td className="px-4 py-2 text-right text-emerald-700 text-xs text-nowrap">
                    <div className="flex flex-col items-end">
                      {tableTotals.vndWeighted > 0 && <span>{fmt(tableTotals.vndWeighted)}</span>}
                      {tableTotals.sgdWeighted > 0 && <span className="text-blue-600 font-normal">{fmtSGD(tableTotals.sgdWeighted)}</span>}
                    </div>
                  </td>
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
        {deals.length > 0 && activeTab === 'all' && (
          <div className="pt-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <BarChart2 size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 italic uppercase tracking-tighter">Phân tích Pipeline</h3>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartCard title="Giá trị theo giai đoạn">
                <ValueByStageChart deals={deals} colName="value" />
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

        {deals.length > 0 && activeTab === 'prospect' && (
          <div className="pt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniKPI title="Tổng Prospects" value={filteredDeals.length} icon={<List size={14}/>}/>
              <MiniKPI 
                title="Giá trị tiềm năng" 
                value={
                  <div className="flex flex-col">
                    <span>{fmt(tableTotals.vndRaw)}</span>
                    {tableTotals.sgdRaw > 0 && <span className="text-sm font-normal text-gray-400">{fmtSGD(tableTotals.sgdRaw)}</span>}
                  </div>
                } 
                icon={<DollarSign size={14}/>}
              />
              <MiniKPI 
                title="Xác suất TB" 
                value={`${(filteredDeals.reduce((sum, d) => sum + (d.probability || 0), 0) / (filteredDeals.length || 1)).toFixed(0)}%`} 
                icon={<Target size={14}/>}
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartCard title="Top Accounts by Prospect Count">
                <TopAccountsCountChart deals={filteredDeals} />
              </ChartCard>
              <ChartCard title="Prospects by Product">
                <ProductDistributionChart deals={filteredDeals} />
              </ChartCard>
            </div>
          </div>
        )}

        {deals.length > 0 && activeTab === 'lead' && (
          <div className="pt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniKPI title="Tổng Leads" value={filteredDeals.length} icon={<List size={14}/>}/>
              <MiniKPI 
                title="Tổng Giá trị" 
                value={
                  <div className="flex flex-col">
                    <span>{fmt(tableTotals.vndRaw)}</span>
                    {tableTotals.sgdRaw > 0 && <span className="text-sm font-normal text-gray-400">{fmtSGD(tableTotals.sgdRaw)}</span>}
                  </div>
                } 
                icon={<DollarSign size={14}/>}
              />
              <MiniKPI 
                title="Xác suất TB" 
                value={`${(filteredDeals.reduce((sum, d) => sum + (d.probability || 0), 0) / (filteredDeals.length || 1)).toFixed(0)}%`} 
                icon={<Target size={14}/>}
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartCard title="Giá trị theo Account (Top 8)">
                <ValueByAccountChart deals={filteredDeals} />
              </ChartCard>
              <ChartCard title="Phân bố xác suất Lead">
                <ProbDistributionChart deals={filteredDeals} />
              </ChartCard>
            </div>
          </div>
        )}

        {deals.length > 0 && activeTab === 'opportunity' && (
          <div className="pt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniKPI title="Active Opportunities" value={filteredDeals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length} icon={<Briefcase size={14}/>}/>
              <MiniKPI 
                title="Weighted Forecast" 
                value={
                  <div className="flex flex-col">
                    <span>{fmt(tableTotals.vndWeighted)}</span>
                    {tableTotals.sgdWeighted > 0 && <span className="text-sm font-normal text-gray-400">{fmtSGD(tableTotals.sgdWeighted)}</span>}
                  </div>
                } 
                icon={<TrendingUp size={14}/>}
              />
              <MiniKPI 
                title="Win Rate %" 
                value={`${kpis.winRate.toFixed(1)}%`} 
                icon={<Target size={14}/>}
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ChartCard title="Opportunity Funnel (Count & Value)">
                  <OppFunnelChart deals={filteredDeals} />
                </ChartCard>
              </div>
              <ChartCard title="Win vs Lost Ratio">
                <WinLostDonutChart deals={filteredDeals} />
              </ChartCard>
              <div className="xl:col-span-3">
                <ChartCard title="6-Month Opportunity Forecast">
                  <ForecastByMonthChart deals={filteredDeals} />
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
          onAICoach={handleAICoach}
          coachLoading={coachLoading}
          coachResult={coachResult}
          onDelete={() => setShowDeleteConfirm(true)}
          accounts={accounts}
          onUpdateDeal={handleUpdateDeal}
          saveSuccess={saveSuccess}
        />
      )}

      {/* 7. Add Deal Modal */}
      {showAdd && (
        <AddDealModal 
          accounts={accounts} 
          onClose={() => setShowAdd(false)} 
          onSave={async (formData) => {
            const { data: resData, error } = await createDeal({
              ...formData,
              stage: stageToDb[formData.stage] || formData.stage
            });
            if (!error) {
              const mapped = {
                ...resData,
                stage: stageFromDb[resData.stage] || resData.stage
              };
              setDeals(prev => [...prev, mapped]);
              setShowAdd(false);
            }
          }}
          saving={savingDeal}
        />
      )}

      {/* 8. Edit Deal Modal */}
      {editingDeal && (
        <EditDealModal 
          deal={editingDeal}
          accounts={accounts} 
          onClose={() => setEditingDeal(null)} 
          onSave={handleUpdateDeal}
          saving={savingDeal}
          onDelete={() => setShowDeleteConfirm(true)}
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

      {/* 9. Import Modal */}
      {showImport && (
        <ImportModal 
          accounts={accounts}
          file={csvFile}
          onClose={() => { setShowImport(false); setCsvFile(null); }}
          onExecute={executeImport}
          importing={importing}
          progress={importProgress}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function Header({ onAdd, onExport, onImportClick, onImport, csvInputRef }) {
  return (
    <div className="w-full h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Pipeline</h1>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Quản lý toàn bộ cơ hội bán hàng</p>
      </div>
      <div className="flex items-center gap-3">
        <input 
          type="file" 
          ref={csvInputRef} 
          className="hidden" 
          accept=".csv" 
          onChange={onImport} 
        />
        <button 
          onClick={onExport}
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <ArrowDown className="text-gray-400" size={18} /> Export CSV
        </button>
        <button 
          onClick={onImportClick}
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <ArrowUp className="text-gray-400" size={18} /> Import CSV
        </button>
        <button 
          onClick={onAdd}
          className="btn-primary bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200"
        >
          <Plus size={18} /> Tạo Deal Mới
        </button>
      </div>
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

function ValueByStageChart({ deals, colName = 'value' }) {
  const data = useMemo(() => {
    return Object.keys(STAGE_LABEL).map(stage => {
      const val = deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d[colName] || 0), 0);
      return { name: STAGE_LABEL[stage], raw: stage, value: val };
    });
  }, [deals, colName]);

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

function SideDrawer({ deal, onClose, saving, onAICoach, coachLoading, coachResult, onDelete, accounts, onUpdateDeal, saveSuccess }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: deal.name || '',
    account_id: deal.account_id || '',
    product: deal.product || '',
    value: deal.value || 0,
    currency: deal.currency || 'VND',
    stage: deal.stage || 'Prospect',
    probability: deal.probability || 0,
    expected_close: deal.expected_close || '',
    notes: deal.notes || ''
  });

  useEffect(() => {
    setForm({
      name: deal.name || '',
      account_id: deal.account_id || '',
      product: deal.product || '',
      value: deal.value || 0,
      currency: deal.currency || 'VND',
      stage: deal.stage || 'Prospect',
      probability: deal.probability || 0,
      expected_close: deal.expected_close || '',
      notes: deal.notes || ''
    });
    setIsEditing(false);
  }, [deal]);

  const handleSave = async () => {
    await onUpdateDeal(deal.id, form);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            {saveSuccess && <span className="text-emerald-500 font-bold text-xs animate-pulse">Đã lưu ✓</span>}
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-gray-50 text-blue-600 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <Edit2 size={12} /> Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-gray-400 text-[11px] font-black uppercase hover:underline">Hủy</button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 mb-1">
          <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded">Strategic Deal</div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {deal.id.slice(0, 8)}</span>
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-8">
            <input 
              type="text" 
              className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic w-full border-b border-gray-200 py-1 outline-none focus:border-blue-500"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              value={form.account_id}
              onChange={e => setForm({...form, account_id: e.target.value})}
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">{deal.name}</h2>
            <div className="flex items-center gap-2 mb-8">
              <Briefcase size={14} className="text-red-500" />
              <span className="text-sm font-bold text-gray-700">{deal.accounts?.name || 'Chưa gán tài khoản'}</span>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><DollarSign size={14} />Giá trị</div>
            {isEditing ? (
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold"
                  value={form.value} 
                  onChange={e => setForm({...form, value: parseInt(e.target.value) || 0})} 
                />
                <select 
                  className="bg-white border border-gray-200 rounded-lg px-1 py-1 text-[10px] font-bold"
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                >
                  <option value="VND">VND</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
            ) : (
              <div className="text-sm text-gray-900 font-black tracking-tight">
                {deal.currency === 'SGD' ? fmtSGD(deal.value) : fmt(deal.value)}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><Target size={14} />Giai đoạn / Xác suất</div>
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <select 
                  className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                  value={form.stage}
                  onChange={e => setForm({...form, stage: e.target.value})}
                >
                  {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" min="0" max="100" step="5"
                    className="flex-1 accent-blue-600"
                    value={form.probability}
                    onChange={e => setForm({...form, probability: parseInt(e.target.value)})}
                  />
                  <span className="text-xs font-bold w-8">{form.probability}%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CompactStageBadge stage={deal.stage} />
                <ProbBadge prob={deal.probability} />
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><FileText size={14} />Sản phẩm</div>
            {isEditing ? (
              <input 
                type="text" 
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm"
                value={form.product}
                onChange={e => setForm({...form, product: e.target.value})}
              />
            ) : (
              <div className="text-sm text-gray-900 font-bold">{deal.product || '—'}</div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><Clock size={14} />Ngày dự kiến</div>
            {isEditing ? (
              <input 
                type="date" 
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm"
                value={form.expected_close || ''} 
                onChange={e => setForm({...form, expected_close: e.target.value})} 
              />
            ) : (
              <div className="text-sm text-gray-900 font-bold">
                {deal.expected_close ? format(parseISO(deal.expected_close), 'dd/MM/yyyy') : '—'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <span className="w-1 h-3 bg-gray-300 rounded-full" /> Ghi chú chiến thuật
            </h3>
          </div>
          <textarea 
            className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm italic focus:outline-none focus:ring-1 focus:ring-blue-200"
            placeholder="Nhập thông tin tình báo, chiến lược..."
            value={form.notes}
            onChange={e => setForm({...form, notes: e.target.value})}
          />
        </div>

        <div className="space-y-4">
          <button 
            onClick={onAICoach}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
            disabled={coachLoading || isEditing}
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
    currency: 'VND',
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

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Giá trị *</label>
                <input 
                  type="number" 
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  value={form.value}
                  onChange={e => setForm({...form, value: e.target.value})}
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Đơn vị</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                >
                  <option value="VND">VND</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
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

function EditDealModal({ deal, accounts, onClose, onSave, saving, onDelete }) {
  const [form, setForm] = useState({
    name: deal.name || '',
    account_id: deal.account_id || '',
    product: deal.product || '',
    value: deal.value || '',
    currency: deal.currency || 'VND',
    stage: deal.stage || 'Prospect',
    probability: deal.probability || 10,
    expected_close: deal.expected_close || '',
    notes: deal.notes || ''
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
        <div className="flex justify-between items-start mb-1 mt-0">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1 mt-0">Chỉnh sửa Deal</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Cập nhật thông tin cơ hội bán hàng</p>
          </div>
          <button 
            type="button" 
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Xóa deal"
          >
            <Trash2 size={20} />
          </button>
        </div>

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
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />} Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function TabItem({ label, count, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`relative py-4 px-1 flex items-center gap-2 transition-all duration-300 ${active ? 'text-red-700' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <span className={`text-sm font-black uppercase tracking-widest italic`}>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
        {count}
      </span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-700 rounded-t-full shadow-[0_-2px_8px_rgba(185,28,28,0.4)]" />}
    </button>
  );
}

function MiniKPI({ title, value, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-400">{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</span>
      </div>
      <div className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">{value}</div>
    </div>
  );
}

function TopAccountsCountChart({ deals }) {
  const data = useMemo(() => {
    const counts = {};
    deals.forEach(d => {
      const name = d.accounts?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 60, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProductDistributionChart({ deals }) {
  const data = useMemo(() => {
    const counts = {};
    deals.forEach(d => {
      const p = d.product || 'Chưa phân loại';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ValueByAccountChart({ deals }) {
  const data = useMemo(() => {
    const vals = {};
    deals.forEach(d => {
      const name = d.accounts?.name || 'Unknown';
      vals[name] = (vals[name] || 0) + (d.value || 0);
    });
    return Object.entries(vals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmtShort(v)} />
        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={v => fmt(v)} />
        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function OppFunnelChart({ deals }) {
  const stages = ['Proposal', 'Negotiation', 'Closed Won'];
  const data = useMemo(() => {
    return stages.map(s => ({
      name: STAGE_LABEL[s],
      count: deals.filter(d => d.stage === s).length,
      value: deals.filter(d => d.stage === s).reduce((sum, d) => sum + (d.value || 0), 0)
    }));
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v, n) => [n === 'value' ? fmt(v) : v, n === 'value' ? 'Giá trị' : 'Số lượng']} />
        <Bar dataKey="count" fill="#bfdbfe" radius={[0, 4, 4, 0]} barSize={20} />
        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WinLostDonutChart({ deals }) {
  const data = useMemo(() => {
    const wonCount = deals.filter(d => d.stage === 'Closed Won').length;
    const lostCount = deals.filter(d => d.stage === 'Closed Lost').length;
    return [
      { name: 'Thắng', value: wonCount, color: '#22c55e' },
      { name: 'Thua', value: lostCount, color: '#ef4444' }
    ];
  }, [deals]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="name" hide />
        <YAxis hide />
        <Tooltip />
        <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ImportModal({ accounts, onClose, onExecute, importing, progress, file }) {
  const [preview, setPreview] = useState([]);
  const [parsedData, setParsedData] = useState([]);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(l => l.split(',').map(v => v.replace(/^"|"$/g, '').trim()));
      const data = lines.slice(1).filter(l => l.length > 1).map(l => ({
        name: l[0],
        accountName: l[1],
        product: l[2],
        stage: l[3],
        value: l[4],
        currency: l[5],
        probability: l[6],
        expectedClose: l[8],
        notes: l[9]
      }));
      setParsedData(data);
      setPreview(data.slice(0, 5));
    };
    reader.readAsText(file);
  }, [file]);

  const STAGE_REV = {
    'Tiềm năng': 'Prospect',
    'Đã xác nhận': 'Qualified',
    'Báo giá': 'Proposal',
    'Đàm phán': 'Negotiation',
    'Thắng': 'Closed Won',
    'Thua': 'Closed Lost',
  };

  const processImport = () => {
    const processed = parsedData.map(d => ({
      ...d,
      stage: STAGE_REV[d.stage] || d.stage
    }));
    onExecute(processed);
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-8">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1 mt-0">Import Pipeline CSV</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Review data before importing</p>
        
        {importing ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm font-bold text-gray-600">Đang xử lý: {progress.current} / {progress.total}</p>
          </div>
        ) : (
          <>
            <div className="mb-6 overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 font-bold">
                  <tr>
                    <th className="px-3 py-2">Deal Name</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const accFound = accounts.find(a => a.name.toLowerCase() === row.accountName?.toLowerCase());
                    return (
                      <tr key={i} className={`border-t border-gray-50 ${!accFound ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 flex items-center gap-1 font-bold">
                          {row.accountName}
                          {!accFound && <AlertCircle size={12} className="text-amber-500" title="Account not found"/>}
                        </td>
                        <td className="px-3 py-2">{row.value} {row.currency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mb-6 italic">Hiển thị 5 dòng đầu tiên. Nhấn "Xác nhận" để import toàn bộ {parsedData.length} dòng.</p>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Hủy
              </button>
              <button 
                onClick={processImport}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                Xác nhận Import
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
