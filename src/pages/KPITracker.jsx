import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart2, Edit3, Target, TrendingUp, DollarSign, PenTool,
  Save, X, Calendar as CalendarIcon, Phone, MapPin, Presentation
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { PageLoader } from "../components/LoadingSpinner";
import {
  fetchKPITarget, upsertKPITarget,
  fetchKPIActuals, upsertKPIActual,
  fetchKPIActualsByPeriods, fetchKPITargetsByPeriods,
  fetchDeals
} from "../lib/supabase";

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const TABS = [
  { id: "overview", label: "Tổng quan", icon: Target },
  { id: "log", label: "Ghi nhận", icon: PenTool },
  { id: "trend", label: "Xu hướng", icon: TrendingUp },
  { id: "forecast", label: "Dự báo (Forecast)", icon: BarChart2 }
];

export default function KPITracker({ showToast }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        {activeTab === "overview" && <KPIOverview showToast={showToast} />}
        {activeTab === "log" && <KPILogForm showToast={showToast} />}
        {activeTab === "trend" && <KPITrends showToast={showToast} />}
        {activeTab === "forecast" && <KPIForecast showToast={showToast} />}
      </div>
    </div>
  );
}

// ── 1. KPI OVERVIEW ────────────────────────────────────────────────────────
function KPIOverview({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [actuals, setActuals] = useState([]);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const currentPeriod = format(new Date(), "yyyy-MM");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [tRes, aRes] = await Promise.all([
      fetchKPITarget(currentPeriod),
      fetchKPIActuals(currentPeriod)
    ]);
    setTarget(tRes.data || { 
      period: currentPeriod, revenue_target: 0, deals_target: 0, 
      calls_target: 0, visits_target: 0, demos_target: 0 
    });
    setActuals(aRes.data || []);
    setLoading(false);
  }

  const totals = actuals.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.revenue_closed || 0),
    deals: acc.deals + (curr.deals_closed || 0),
    calls: acc.calls + (curr.calls_count || 0),
    visits: acc.visits + (curr.visits_count || 0),
    demos: acc.demos + (curr.demos_count || 0),
  }), { revenue: 0, deals: 0, calls: 0, visits: 0, demos: 0 });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tháng {format(new Date(), "MM/yyyy")}</h2>
          <p className="text-sm text-gray-500">Tình hình hoàn thành mục tiêu KPI hiện tại</p>
        </div>
        <button onClick={() => setTargetModalOpen(true)} className="btn-secondary">
          <Edit3 size={15} /> Thiết lập mục tiêu
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-8">
          <ProgressRow 
            label="Doanh thu" 
            actual={totals.revenue} 
            target={target?.revenue_target || 0} 
            formatter={formatVND} 
            icon={<DollarSign size={16} className="text-emerald-600"/>} 
          />
          <ProgressRow 
            label="Số deal đóng" 
            actual={totals.deals} 
            target={target?.deals_target || 0} 
            icon={<Target size={16} className="text-blue-600"/>} 
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProgressRow label="Cuộc gọi" actual={totals.calls} target={target?.calls_target} icon={<Phone size={16}/>} isSmall />
            <ProgressRow label="Thăm khách" actual={totals.visits} target={target?.visits_target} icon={<MapPin size={16}/>} isSmall />
            <ProgressRow label="Demo SP" actual={totals.demos} target={target?.demos_target} icon={<Presentation size={16}/>} isSmall />
          </div>
        </div>
      )}

      {targetModalOpen && (
        <TargetModal 
          initialData={target} 
          onClose={() => setTargetModalOpen(false)} 
          onSave={() => { setTargetModalOpen(false); showToast("Lưu mục tiêu thành công!"); loadData(); }} 
        />
      )}
    </div>
  );
}

function ProgressRow({ label, actual, target, formatter = (v) => v, icon, isSmall = false }) {
  const tgt = target || 1; // prevent div by zero visually
  const pct = Math.min((actual / tgt) * 100, 100);
  const realPct = target === 0 ? 0 : (actual / target) * 100;
  
  let colorClass = "bg-red-500";
  if (pct >= 50 && pct < 80) colorClass = "bg-yellow-500";
  else if (pct >= 80) colorClass = "bg-green-500";

  return (
    <div className={`space-y-2 ${isSmall ? '' : 'bg-gray-50 p-4 rounded-xl border border-gray-100'}`}>
      <div className="flex justify-between items-end mb-1">
        <div className="flex items-center gap-2">
          {icon && <span className="p-1.5 bg-white rounded shadow-sm">{icon}</span>}
          <span className="font-medium text-gray-800">{label}</span>
        </div>
        <div className="text-right">
          <span className={`font-bold ${isSmall ? 'text-lg' : 'text-xl'} text-gray-900`}>{formatter(actual)}</span>
          <span className="text-gray-500 text-sm"> / {formatter(target || 0)}</span>
        </div>
      </div>
      <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
          style={{ width: `${target === 0 ? 0 : pct}%` }} 
        />
      </div>
      <div className="text-right text-xs font-semibold text-gray-500">
        Hoàn thành {realPct.toFixed(1)}%
      </div>
    </div>
  );
}

function TargetModal({ initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await upsertKPITarget(form);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Mục Tiêu Tháng {format(new Date(), "MM/yyyy")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Doanh thu mục tiêu (VNĐ)</label>
            <input type="number" className="input text-blue-600 font-bold" value={form.revenue_target} onChange={e => setForm({...form, revenue_target: Number(e.target.value)})} />
          </div>
          <div>
            <label className="label">Mục tiêu số deal chốt</label>
            <input type="number" className="input" value={form.deals_target} onChange={e => setForm({...form, deals_target: Number(e.target.value)})} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Cuộc gọi</label>
              <input type="number" className="input" value={form.calls_target} onChange={e => setForm({...form, calls_target: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs">Thăm gặp</label>
              <input type="number" className="input" value={form.visits_target} onChange={e => setForm({...form, visits_target: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs">Phát Demo</label>
              <input type="number" className="input" value={form.demos_target} onChange={e => setForm({...form, demos_target: Number(e.target.value)})} />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1"><Save size={15}/> Lưu Target</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 2. KPI ACTIVITY LOG ───────────────────────────────────────────────────────
function KPILogForm({ showToast }) {
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentPeriod = format(new Date(), "yyyy-MM");
  
  const [form, setForm] = useState({ 
    period: currentPeriod, week: 1, calls_count: 0, visits_count: 0, 
    demos_count: 0, revenue_closed: 0, deals_closed: 0 
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await fetchKPIActuals(currentPeriod);
    setActuals(data || []);
    setLoading(false);
  }

  const handleWeekChange = (w) => {
    const existing = actuals.find(a => a.week === w);
    if(existing) setForm({ ...existing });
    else setForm({ period: currentPeriod, week: w, calls_count: 0, visits_count: 0, demos_count: 0, revenue_closed: 0, deals_closed: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await upsertKPIActual(form);
    if (error) showToast(error.message, "error");
    else {
      showToast(`Đã lưu dữ liệu Tuần ${form.week}`);
      loadData();
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Ghi nhận nhanh (Tháng {format(new Date(), "MM/yyyy")})</h2>
        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50/50 p-5 rounded-lg border border-gray-100">
          <div>
            <label className="label">Ghi nhận cho Tuần</label>
            <select className="input font-medium" value={form.week} onChange={e => handleWeekChange(Number(e.target.value))}>
              {[1,2,3,4,5].map(w => <option key={w} value={w}>Tuần thứ {w}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs text-gray-500">Cuộc gọi</label>
              <input type="number" className="input text-center" value={form.calls_count} onChange={e => setForm({...form, calls_count: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs text-gray-500">Gặp mặt</label>
              <input type="number" className="input text-center" value={form.visits_count} onChange={e => setForm({...form, visits_count: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label text-xs text-gray-500">Phát Demo</label>
              <input type="number" className="input text-center" value={form.demos_count} onChange={e => setForm({...form, demos_count: Number(e.target.value)})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="label">Doanh thu chốt (VNĐ)</label>
              <input type="number" className="input text-green-600 font-bold" value={form.revenue_closed} onChange={e => setForm({...form, revenue_closed: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">Số Deal chốt</label>
              <input type="number" className="input" value={form.deals_closed} onChange={e => setForm({...form, deals_closed: Number(e.target.value)})} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-4"><Save size={15}/> Cập nhật số liệu Tuần {form.week}</button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Lịch sử theo Tuần</h2>
        {loading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th>Tuần</th>
                  <th>Hoạt động</th>
                  <th>Doanh thu</th>
                  <th>Deals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actuals.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium text-blue-700">Tuần {a.week}</td>
                    <td className="text-gray-500">
                      {a.calls_count} gọi, {a.visits_count} gặp, {a.demos_count} demo
                    </td>
                    <td className="font-medium text-green-600">{formatVND(a.revenue_closed)}</td>
                    <td>{a.deals_closed}</td>
                  </tr>
                ))}
                {actuals.length === 0 && <tr><td colSpan="4" className="text-center py-5 text-gray-500">Chưa có dữ liệu nào trong tháng này.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3. KPI TRENDS ─────────────────────────────────────────────────────────────
function KPITrends() {
  const [data, setData] = useState([]);
  const [winRate, setWinRate] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTrends(); }, []);

  async function loadTrends() {
    setLoading(true);
    // Gen last 6 months periods
    const periods = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      periods.push(format(subMonths(date, i), "yyyy-MM"));
    }

    const [aRes, tRes, dRes] = await Promise.all([
      fetchKPIActualsByPeriods(periods),
      fetchKPITargetsByPeriods(periods),
      fetchDeals()
    ]);

    const actuals = aRes.data || [];
    const targets = tRes.data || [];
    const deals = dRes.data || [];

    // Deal stats
    const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    
    if (closedDeals.length > 0) setWinRate((wonDeals.length / closedDeals.length) * 100);
    if (wonDeals.length > 0) {
      const totalVal = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      setAvgDealSize(totalVal / wonDeals.length);
    }

    // Chart data mapping
    const chartData = periods.map(p => {
      const monthLabel = p.split("-")[1]; // gets MM
      const monthTarget = targets.find(t => t.period === p);
      const monthActuals = actuals.filter(a => a.period === p);
      
      const revenue_actual = monthActuals.reduce((sum, x) => sum + (x.revenue_closed||0), 0);
      const activity_calls = monthActuals.reduce((sum, x) => sum + (x.calls_count||0), 0);
      const activity_visits = monthActuals.reduce((sum, x) => sum + (x.visits_count||0), 0);

      return {
        name: `T${monthLabel}`,
        Target: monthTarget?.revenue_target || 0,
        "Hiện thực (Actual)": revenue_actual,
        "Lượt tương tác": activity_calls + activity_visits
      };
    });

    setData(chartData);
    setLoading(false);
  }

  return (
    <div className="p-6">
      {loading ? <PageLoader/> : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
              <div className="text-blue-100 text-sm font-medium mb-1">Tỉ lệ chốt Deal (Win Rate)</div>
              <div className="text-3xl font-bold">{winRate.toFixed(1)}%</div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
              <div className="text-emerald-100 text-sm font-medium mb-1">Giá trị Deal TB (Avg Deal Size)</div>
              <div className="text-3xl font-bold">{formatVND(avgDealSize)}</div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">So sánh Doanh thu 6 tháng qua (Target vs Actual)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false}
                    tickFormatter={(val) => `${val / 1000000}M`}
                  />
                  <RechartsTooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Target" stroke="#D1D5DB" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Hiện thực (Actual)" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Mức độ tương tác 6 tháng qua (Calls + Visits)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="Lượt tương tác" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. FORECAST ───────────────────────────────────────────────────────────────
function KPIForecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadForecast(); }, []);

  async function loadForecast() {
    setLoading(true);
    const currentPeriod = format(new Date(), "yyyy-MM");
    
    // Fetch target & deals
    const [tRes, dRes] = await Promise.all([
      fetchKPITarget(currentPeriod),
      fetchDeals()
    ]);

    const target = tRes.data?.revenue_target || 0;
    const activeDeals = (dRes.data || []).filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');

    let weighted = 0;
    let bestCase = 0;
    let committed = 0;

    activeDeals.forEach(d => {
      const val = d.value || 0;
      weighted += val * ((d.probability || 0)/100);
      if(d.stage === 'negotiation' || d.stage === 'proposal') bestCase += val;
      if((d.probability || 0) >= 70) committed += val;
    });

    const gap = target - weighted;

    setData({ target, weighted, bestCase, committed, gap });
    setLoading(false);
  }

  return (
    <div className="p-6">
      {loading || !data ? <PageLoader/> : (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dự Báo Doanh Thu (Sales Forecast)</h2>
            <p className="text-gray-500 mt-2">Tính toán dự báo kết thúc tháng {format(new Date(), "MM/yyyy")} dựa trên Pipeline hiện tại.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 border-l-4 border-l-blue-500 relative overflow-hidden">
              <div className="text-sm font-medium text-gray-500 mb-1">Weighted Forecast</div>
              <div className="text-2xl font-bold text-gray-900">{formatVND(data.weighted)}</div>
              <p className="text-xs text-gray-400 mt-2">∑ (Deal Value × Probability %)</p>
            </div>

            <div className="card p-6 border-l-4 border-l-purple-500 relative overflow-hidden">
              <div className="text-sm font-medium text-gray-500 mb-1">Best Case</div>
              <div className="text-2xl font-bold text-gray-900">{formatVND(data.bestCase)}</div>
              <p className="text-xs text-gray-400 mt-2">Deals ở vòng Proposal & Negotiation</p>
            </div>

            <div className="card p-6 border-l-4 border-l-green-500 relative overflow-hidden bg-green-50/10">
              <div className="text-sm font-medium text-gray-500 mb-1">Committed (>70% Win)</div>
              <div className="text-2xl font-bold text-green-700">{formatVND(data.committed)}</div>
              <p className="text-xs text-gray-400 mt-2">Tỉ lệ tự tin chốt siêu cao</p>
            </div>
          </div>

          <div className="mt-8 bg-gray-900 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="text-gray-400 font-medium mb-1">Target Mục Tiêu Tháng Này</div>
                <div className="text-4xl font-bold">{formatVND(data.target)}</div>
              </div>
              
              <div className="h-16 w-px bg-gray-700 hidden md:block" />

              <div className="text-right">
                <div className="text-gray-400 font-medium mb-1">Gap To Quota (Khoảng cách)</div>
                <div className={`text-4xl font-bold ${data.gap > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {data.gap > 0 ? formatVND(data.gap) : "Đạt Target 🎉"}
                </div>
                {data.gap > 0 && <p className="text-sm text-red-300 mt-1">Cần kiếm thêm {formatVND(data.gap)} vào Pipeline</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
