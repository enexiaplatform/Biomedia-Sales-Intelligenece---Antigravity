import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { DollarSign, TrendingUp, Users, Target, Plus, AlertCircle, ChevronRight } from "lucide-react";
import { format, isThisMonth, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ScoreBadge from "../components/ScoreBadge";
import {
  getAccountStats,
  getTopAccountsByScore,
  getDealsByStage,
  fetchRecentInteractions,
  fetchDeals
} from "../lib/supabase";

const STAGE_LABELS = {
  prospect: "Tiềm năng",
  qualified: "Đã xác nhận",
  proposal: "Báo giá",
  negotiation: "Đàm phán",
  closed_won: "Thắng",
  closed_lost: "Thua"
};

const STAGE_COLORS = {
  prospect: "#475569",
  qualified: "#0EA5E9",
  proposal: "#F59E0B",
  negotiation: "#8B5CF6",
  closed_won: "#10B981",
  closed_lost: "#EF4444"
};

const INTERACTION_TYPE_LABELS = {
  call: "Gọi điện",
  meeting: "Họp",
  email: "Email",
  demo: "Demo",
  proposal: "Báo giá",
  other: "Khác"
};

export default function Dashboard({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topAccounts, setTopAccounts] = useState([]);
  const [stageData, setStageData] = useState([]);
  const [recentInteractions, setRecentInteractions] = useState([]);
  const [closingDeals, setClosingDeals] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, topRes, stageRes, interactionsRes, dealsRes] = await Promise.all([
        getAccountStats(),
        getTopAccountsByScore(5),
        getDealsByStage(),
        fetchRecentInteractions(10),
        fetchDeals()
      ]);
      
      if (statsRes.error) throw new Error(statsRes.error.message);
      setStats(statsRes.data);
      setTopAccounts(topRes.data || []);
      setStageData(stageRes.data || []);
      setRecentInteractions(interactionsRes.data || []);

      const thisMonthDeals = (dealsRes.data || []).filter((d) => {
        if (!d.expected_close) return false;
        if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
        return isThisMonth(parseISO(d.expected_close));
      });
      setClosingDeals(thisMonthDeals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="spinner mb-4" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Đang khởi tạo Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 card max-w-md mx-auto">
        <AlertCircle size={32} className="mx-auto text-red-500 mb-4" />
        <p className="text-red-400 font-bold mb-6">{error}</p>
        <button onClick={loadAll} className="btn-secondary w-full">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng pipeline"
          value={<CurrencyDisplay value={stats?.totalPipelineValue} className="text-2xl font-black text-white tracking-tight" />}
          icon={<DollarSign size={20} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Deal đang mở"
          value={<span className="text-2xl font-black text-white tracking-tight">{stats?.activeDeals ?? 0}</span>}
          icon={<TrendingUp size={20} className="text-red-500" />}
          color="red"
        />
        <StatCard
          title="Tỷ lệ thắng"
          value={<span className="text-2xl font-black text-white tracking-tight">{stats?.winRate ?? 0}%</span>}
          icon={<Target size={20} className="text-purple-400" />}
          color="purple"
        />
        <StatCard
          title="Tổng tài khoản"
          value={<span className="text-2xl font-black text-white tracking-tight">{stats?.totalAccounts ?? 0}</span>}
          icon={<Users size={20} className="text-orange-400" />}
          color="orange"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/accounts")} className="btn-primary">
            <Plus size={16} /> Thêm tài khoản
          </button>
          <button onClick={() => navigate("/pipeline")} className="btn-secondary">
            <Plus size={16} /> Thêm deal
          </button>
        </div>
        <Link to="/pipeline" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 flex items-center gap-2 transition-colors">
          Xem toàn bộ pipeline <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline by Stage */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-glow-red" />
              Pipeline theo giai đoạn
            </h3>
          </div>
          {stageData.length === 0 ? (
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-12">Chưa có deal nào</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} layout="vertical" margin={{ left: -10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickFormatter={(v) => STAGE_LABELS[v] || v}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  labelStyle={{ fontSize: '10px', color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deals Closing This Month */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-glow-red" />
              Deal đóng tháng này ({closingDeals.length})
            </h3>
          </div>
          {closingDeals.length === 0 ? (
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-12">Không có deal sắp đóng</div>
          ) : (
            <div className="space-y-3">
              {closingDeals.slice(0, 5).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                  <div>
                    <div className="text-sm font-bold text-slate-200 group-hover:text-red-500 transition-colors">{deal.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">{deal.accounts?.name}</div>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay value={deal.value} className="text-sm font-black text-white" />
                    <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${deal.probability >= 60 ? "text-emerald-500" : "text-amber-500"}`}>
                      {deal.probability}% Prob
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Accounts */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top 5 tài khoản tiềm năng</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Loại</th>
                  <th>Điểm</th>
                  <th>Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {topAccounts.map((acc) => (
                  <tr key={acc.id} className="group">
                    <td>
                      <Link to={`/accounts/${acc.id}`} className="font-bold text-slate-200 group-hover:text-red-500 transition-colors">
                        {acc.name}
                      </Link>
                      <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">{acc.region}</div>
                    </td>
                    <td><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{acc.type}</span></td>
                    <td><ScoreBadge score={acc.score} /></td>
                    <td className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                      {acc.interactions?.[0]?.date ? format(parseISO(acc.interactions[0].date), "dd/MM/yy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tương tác chiến lược</h3>
          </div>
          <div className="divide-y divide-white/5">
            {recentInteractions.slice(0, 6).map((interaction) => (
              <div key={interaction.id} className="px-6 py-4 hover:bg-white/[0.02] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Link to={`/accounts/${interaction.account_id}`} className="text-xs font-black text-slate-300 hover:text-red-500 transition-colors uppercase tracking-widest">
                        {interaction.accounts?.name}
                      </Link>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                        {INTERACTION_TYPE_LABELS[interaction.type] || interaction.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{interaction.summary}</p>
                    {interaction.buying_signal && (
                      <div className="mt-2 text-[9px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Target size={10} /> {interaction.buying_signal}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-700 font-black uppercase tracking-widest">
                    {interaction.date ? format(parseISO(interaction.date), "dd/MM") : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const getStyles = () => {
    switch(color) {
      case 'red': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'blue': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'purple': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'orange': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="card p-6 card-hover relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${getStyles().split(' ')[0].replace('text', 'bg')}`} />
      
      <div className="flex items-center gap-x-4 mb-4">
        <div className={`p-2.5 rounded-xl border transition-transform duration-500 group-hover:scale-110 ${getStyles()}`}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">
          {title}
        </span>
      </div>
      
      <div className="relative z-10 flex items-baseline gap-2">
        {value}
      </div>
    </div>
  );
}
