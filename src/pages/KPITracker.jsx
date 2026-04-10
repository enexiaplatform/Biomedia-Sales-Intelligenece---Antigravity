import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import {
  BarChart2, Edit3, Target, TrendingUp, DollarSign, PenTool,
  Save, X, Calendar as CalendarIcon, Phone, MapPin, Presentation, AlertCircle
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
    <div className="flex flex-col h-full bg-surface-950 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full -z-10" />
      
      {/* Navigation Header */}
      <div className="px-8 py-6 border-b border-white/5 bg-surface-900/40 backdrop-blur-2xl flex justify-between items-center shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="font-black text-slate-100 uppercase tracking-tighter text-xl">KPI Performance Tracker</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Strategic Objective Monitoring</p>
          </div>
          <div className="h-8 w-px bg-white/5 mx-2" />
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                    ${isActive ? "bg-primary text-slate-900 shadow-glow shadow-primary/40" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"}`}
                >
                  <Icon size={14} className={isActive ? "text-slate-900" : "text-slate-600"} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="w-full px-6">
          {activeTab === "overview" && <KPIOverview showToast={showToast} />}
          {activeTab === "log" && <KPILogForm showToast={showToast} />}
          {activeTab === "trend" && <KPITrends showToast={showToast} />}
          {activeTab === "forecast" && <KPIForecast showToast={showToast} />}
        </div>
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
    <div className="p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-glow-sm inline-block mb-3">Active Period</div>
          <h2 className="text-4xl font-black text-slate-100 tracking-tighter uppercase leading-none">Tháng {format(new Date(), "MM/yyyy")}</h2>
        </div>
        <button onClick={() => setTargetModalOpen(true)} className="btn-secondary h-11 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-3">
          <Edit3 size={16} className="text-primary"/> Thiết lập mục tiêu chiến lược
        </button>
      </div>

      {loading ? <div className="py-20"><PageLoader /></div> : (
        <div className="space-y-12">
          {/* Main Targets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <ProgressRow 
              label="Kế hoạch doanh thu" 
              actual={totals.revenue} 
              target={target?.revenue_target || 0} 
              formatter={formatVND} 
              icon={<DollarSign size={20}/>} 
              color="primary"
            />
            <ProgressRow 
              label="Hạch toán Deal chốt" 
              actual={totals.deals} 
              target={target?.deals_target || 0} 
              icon={<Target size={20}/>} 
              color="blue"
            />
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProgressRow label="Chiến dịch cuộc gọi" actual={totals.calls} target={target?.calls_target} icon={<Phone size={16}/>} isSmall color="slate" />
            <ProgressRow label="Thăm gặp khách hàng" actual={totals.visits} target={target?.visits_target} icon={<MapPin size={16}/>} isSmall color="slate" />
            <ProgressRow label="Demo & Giải pháp" actual={totals.demos} target={target?.demos_target} icon={<Presentation size={16}/>} isSmall color="slate" />
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

function ProgressRow({ label, actual, target, formatter = (v) => v, icon, isSmall = false, color = "primary" }) {
  const tgt = target || 1;
  const realPct = target === 0 ? 0 : (actual / target) * 100;
  const displayPct = Math.min(realPct, 100);
  
  const colors = {
    primary: "bg-primary shadow-glow-sm shadow-primary/40",
    blue: "bg-blue-500 shadow-glow-sm shadow-blue-500/40",
    slate: "bg-slate-400 opacity-60"
  };

  return (
    <div className={`space-y-5 ${isSmall ? '' : 'bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group'}`}>
      {!isSmall && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -z-10 group-hover:bg-primary/5 transition-all duration-700" />}
      
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border border-white/5 bg-surface-950/50 text-slate-400 group-hover:text-primary transition-colors`}>
            {icon}
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`font-black tracking-tighter text-slate-100 ${isSmall ? 'text-xl' : 'text-3xl'}`}>{formatter(actual)}</span>
              <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">/ {formatter(target || 0)}</span>
            </div>
          </div>
        </div>
        <div className={`text-sm font-black italic drop-shadow-glow-sm ${realPct >= 100 ? 'text-emerald-400' : 'text-slate-500'}`}>
          {realPct.toFixed(1)}%
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full bg-surface-950/50 rounded-full overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${colors[color] || colors.primary}`} 
            style={{ width: `${displayPct}%` }} 
          />
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/95 backdrop-blur-md p-4">
      <div className="bg-surface-900 border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700" />
        
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="font-black text-slate-100 uppercase tracking-tighter text-xl">Thiết lập mục tiêu chiến lược</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Chu kỳ: {format(new Date(), "MM/yyyy")}</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="label">Doanh thu mục tiêu (VNĐ)</label>
              <input type="number" className="input !bg-surface-950/50 !text-primary !font-black" value={form.revenue_target} onChange={e => setForm({...form, revenue_target: Number(e.target.value)})} />
            </div>
            <div className="space-y-3">
              <label className="label">Mục tiêu số deal chốt</label>
              <input type="number" className="input !bg-surface-950/50" value={form.deals_target} onChange={e => setForm({...form, deals_target: Number(e.target.value)})} />
            </div>
          </div>

          <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={14} className="text-primary"/>
              Chỉ số hoạt động (Tần suất)
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="label !text-[10px]">Calls</label>
                <input type="number" className="input !bg-surface-950/50 !py-2 text-center" value={form.calls_target} onChange={e => setForm({...form, calls_target: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label !text-[10px]">Visits</label>
                <input type="number" className="input !bg-surface-950/50 !py-2 text-center" value={form.visits_target} onChange={e => setForm({...form, visits_target: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label !text-[10px]">Demos</label>
                <input type="number" className="input !bg-surface-950/50 !py-2 text-center" value={form.demos_target} onChange={e => setForm({...form, demos_target: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 h-12 uppercase tracking-widest text-[10px] font-black">Hủy bỏ</button>
            <button type="submit" className="btn-primary flex-1 h-12 shadow-glow-sm shadow-primary/20 uppercase tracking-widest text-[10px] font-black flex items-center justify-center gap-2">
              <Save size={16}/> Cập nhật Target
            </button>
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
  
  const currentWeekOfMonth = Math.ceil(new Date().getDate() / 7);
  
  const [form, setForm] = useState({ 
    period: currentPeriod, week: currentWeekOfMonth, calls_count: 0, visits_count: 0, 
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
    <div className="p-12 grid grid-cols-1 lg:grid-cols-5 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter mb-8 flex items-center gap-3">
            <PenTool size={20} className="text-primary drop-shadow-glow"/>
            Ghi nhận kết quả
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="label">Tuần ghi nhận</label>
              <select className="input !bg-surface-950/50 cursor-pointer font-black" value={form.week} onChange={e => handleWeekChange(Number(e.target.value))}>
                {[1,2,3,4,5].map(w => <option key={w} value={w} className="bg-surface-900">Tuần thứ {w}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="label !text-[10px]">Calls</label>
                <input type="number" className="input !bg-surface-950/50 text-center font-bold" value={form.calls_count} onChange={e => setForm({...form, calls_count: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label !text-[10px]">Visits</label>
                <input type="number" className="input !bg-surface-950/50 text-center font-bold" value={form.visits_count} onChange={e => setForm({...form, visits_count: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label !text-[10px]">Demos</label>
                <input type="number" className="input !bg-surface-950/50 text-center font-bold" value={form.demos_count} onChange={e => setForm({...form, demos_count: Number(e.target.value)})} />
              </div>
            </div>

            <div className="h-px w-full bg-white/5 my-4" />

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="label">Doanh thu chốt (VNĐ)</label>
                <input type="number" className="input !bg-surface-950/50 !text-emerald-400 !font-black !text-xl" value={form.revenue_closed} onChange={e => setForm({...form, revenue_closed: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="label">Số Deal thắng</label>
                <input type="number" className="input !bg-surface-950/50 font-bold" value={form.deals_closed} onChange={e => setForm({...form, deals_closed: Number(e.target.value)})} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full h-14 mt-4 shadow-glow shadow-primary/20 uppercase tracking-[0.2em] text-[10px] font-black flex items-center justify-center gap-3">
              <Save size={18}/> Cập nhật số liệu tuần {form.week}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-8">
        <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter flex items-center gap-3">
          <CalendarIcon size={20} className="text-blue-500 drop-shadow-glow"/>
          Biên niên sử hoạt động
        </h2>
        
        {loading ? <div className="py-20"><PageLoader /></div> : (
          <div className="table-container rounded-[2.5rem] border border-white/5 bg-surface-950/30 overflow-hidden shadow-2xl">
            <table className="table">
              <thead>
                <tr>
                  <th>Giai đoạn</th>
                  <th>Hoạt động thực tế</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-center">Win</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-white/5">
                {actuals.map(a => (
                  <tr key={a.id} className="group hover:bg-white/5 transition-all">
                    <td className="font-black text-primary uppercase text-[10px] tracking-widest py-6">Tuần {a.week}</td>
                    <td>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" /><span className="text-slate-300 font-bold">{a.calls_count}</span></div>
                        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-500" /><span className="text-slate-300 font-bold">{a.visits_count}</span></div>
                        <div className="flex items-center gap-1.5"><Presentation size={12} className="text-slate-500" /><span className="text-slate-300 font-bold">{a.demos_count}</span></div>
                      </div>
                    </td>
                    <td className="text-right font-black text-emerald-400 drop-shadow-glow-sm">{formatVND(a.revenue_closed)}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-slate-100 font-black text-xs border border-white/10 group-hover:bg-primary group-hover:text-slate-900 transition-all duration-300">
                        {a.deals_closed}
                      </span>
                    </td>
                  </tr>
                ))}
                {actuals.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-24 text-center text-slate-600 uppercase font-black text-[10px] tracking-[0.3em] opacity-40 italic">Hệ thống đang chờ dữ liệu đầu tiên</td></tr>
                )}
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

    const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    
    if (closedDeals.length > 0) setWinRate((wonDeals.length / closedDeals.length) * 100);
    if (wonDeals.length > 0) {
      const totalVal = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      setAvgDealSize(totalVal / wonDeals.length);
    }

    const chartData = periods.map(p => {
      const monthLabel = p.split("-")[1];
      const monthTarget = targets.find(t => t.period === p);
      const monthActuals = actuals.filter(a => a.period === p);
      
      const revenue_actual = monthActuals.reduce((sum, x) => sum + (x.revenue_closed||0), 0);
      const activity_calls = monthActuals.reduce((sum, x) => sum + (x.calls_count||0), 0);
      const activity_visits = monthActuals.reduce((sum, x) => sum + (x.visits_count||0), 0);

      return {
        name: `M${monthLabel}`,
        Target: monthTarget?.revenue_target || 0,
        Actual: revenue_actual,
        Activity: activity_calls + activity_visits
      };
    });

    setData(chartData);
    setLoading(false);
  }

  return (
    <div className="p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {loading ? <div className="py-20"><PageLoader/></div> : (
        <div className="space-y-12">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700" />
              <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm" />
                Performance Ratio
              </div>
              <div className="text-4xl font-black text-slate-100 tracking-tighter mb-2">{winRate.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tỉ lệ chiến thắng (Avg Win Rate)</div>
            </div>
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -z-10 group-hover:bg-blue-500/10 transition-all duration-700" />
              <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-glow-sm" />
                Economic Value
              </div>
              <div className="text-4xl font-black text-slate-100 tracking-tighter mb-2">{formatVND(avgDealSize)}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Giá trị Deal trung bình</div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter mb-10 border-l-4 border-primary pl-6">Xu hướng doanh thu</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={data}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} fontStyle="italic" fontWeight="bold" />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#f1f5f9' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => formatVND(value)}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Line type="monotone" dataKey="Target" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Actual" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 4, fill: '#f1f5f9' }} shadow="0 0 20px rgba(16, 185, 129, 0.5)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter mb-10 border-l-4 border-blue-500 pl-6">Tương tác kênh bán hàng</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} fontStyle="italic" fontWeight="bold" />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                  />
                  <Line type="stepAfter" dataKey="Activity" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
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
      bestCase += val; // Best case = total value of all active pipeline deals
      if((d.probability || 0) >= 70) committed += val;
    });

    const gap = target - weighted;

    setData({ target, weighted, bestCase, committed, gap });
    setLoading(false);
  }

  return (
    <div className="p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {loading || !data ? <div className="py-20"><PageLoader/></div> : (
        <div className="space-y-12 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full font-black uppercase tracking-[0.3em] shadow-glow-sm inline-block mb-6">Pipeline Analysis Engine</span>
            <h2 className="text-5xl font-black text-slate-100 tracking-tighter uppercase leading-none italic">Dự Báo Doanh Thu Chiến Lược</h2>
            <p className="text-slate-500 mt-4 font-bold uppercase text-[10px] tracking-widest">Tính toán khả năng hoàn thành mục tiêu tháng {format(new Date(), "MM/yyyy")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 opacity-40" />
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Weighted Forecast</div>
              <div className="text-3xl font-black text-slate-100 tracking-tighter mb-4">{formatVND(data.weighted)}</div>
              <div className="text-[10px] text-slate-600 italic font-medium leading-relaxed">Dựa trên giá trị Deal và xác suất thành công từ Pipeline hiện tại.</div>
            </div>

            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-purple-500 opacity-40" />
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Best Case Scenario</div>
              <div className="text-3xl font-black text-slate-100 tracking-tighter mb-4">{formatVND(data.bestCase)}</div>
              <div className="text-[10px] text-slate-600 italic font-medium leading-relaxed">Giả định chốt thành công tất cả Deals đang ở vòng thương lượng.</div>
            </div>

            <div className="bg-emerald-500/5 p-10 rounded-[3rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-60 shadow-glow shadow-emerald-500" />
              <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target size={12}/>
                Committed Revenue
              </div>
              <div className="text-3xl font-black text-emerald-400 tracking-tighter mb-4 drop-shadow-glow-sm">{formatVND(data.committed)}</div>
              <div className="text-[10px] text-emerald-900/60 font-bold uppercase italic leading-relaxed">Deals có xác suất thắng &gt; 70%.</div>
            </div>
          </div>

          {/* Result Terminal */}
          <div className="mt-16 bg-surface-950 rounded-[3.5rem] p-16 border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="text-center lg:text-left">
                <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-4">Target Mục Tiêu Kế Hoạch</div>
                <div className="text-6xl font-black text-slate-100 tracking-[calc(-0.05em)] shadow-glow-sm drop-shadow-2xl">{formatVND(data.target)}</div>
              </div>
              
              <div className="hidden lg:block h-24 w-px bg-white/5" />

              <div className="text-center lg:text-right">
                <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] mb-4">Khoảng Cách Khoản Trống (GAP)</div>
                <div className={`text-6xl font-black tracking-tighter ${data.gap > 0 ? "text-red-500 drop-shadow-glow-red" : "text-primary drop-shadow-glow"}`}>
                  {data.gap > 0 ? `-${formatVND(data.gap)}` : "TARGET ACHIEVED"}
                </div>
                {data.gap > 0 && (
                  <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-widest">
                    <AlertCircle size={14}/>
                    Cần bổ sung Pipeline ngay lập tức
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
