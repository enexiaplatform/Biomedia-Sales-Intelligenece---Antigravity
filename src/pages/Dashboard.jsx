import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { DollarSign, TrendingUp, Users, Target, Plus, AlertCircle, ChevronRight, Inbox, ChevronDown, RefreshCw } from "lucide-react";
import { format, isThisMonth, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ScoreBadge from "../components/ScoreBadge";
import { chatWithCoach } from "../lib/ai";
import {
  getAccountStats,
  getTopAccountsByScore,
  getDealsByStage,
  fetchRecentInteractions,
  fetchDeals
} from "../lib/supabase";

const STAGE_LABELS = {
  prospect:    "Tiềm năng",
  qualified:   "Đã xác nhận",
  proposal:    "Báo giá",
  negotiation: "Đàm phán",
  closed_won:  "Thắng",
  closed_lost: "Thua"
};

const STAGE_COLORS = {
  prospect:    "#4B5563",
  qualified:   "#3B82F6",
  proposal:    "#F59E0B",
  negotiation: "#8B5CF6",
  closed_won:  "#22C55E",
  closed_lost: "#EF4444"
};

const INTERACTION_TYPE_LABELS = {
  call:     "Gọi điện",
  meeting:  "Họp",
  email:    "Email",
  demo:     "Demo",
  proposal: "Báo giá",
  other:    "Khác"
};

// ── Custom Tooltip for chart ───────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-[12px]"
      style={{
        background:  'var(--bg-elevated)',
        border:      '1px solid var(--border)',
        color:       'var(--text-1)',
        boxShadow:   'var(--shadow-md)',
      }}
    >
      <div className="font-semibold mb-0.5">{STAGE_LABELS[label] || label}</div>
      <div style={{ color: 'var(--text-2)' }}>{payload[0]?.value} deals</div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, accent }) {
  return (
    <div
      className="card p-5 group cursor-default transition-all duration-200"
      style={{ '--hover-border': 'var(--brand-border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-border)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--brand-bg)' }}
        >
          <Icon size={17} style={{ color: 'var(--brand)' }} />
        </div>
      </div>
      <p className="kpi-label mb-2">{title}</p>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-0.5 h-4 rounded-full" style={{ background: 'var(--brand)' }} />
      <h3 className="section-title">{title}</h3>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-44 gap-2">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <Inbox size={18} style={{ color: 'var(--text-3)' }} />
      </div>
      <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>{message}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function Dashboard({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading]               = useState(true);
  const [stats, setStats]                   = useState(null);
  const [topAccounts, setTopAccounts]       = useState([]);
  const [stageData, setStageData]           = useState([]);
  const [recentInteractions, setRecentInteractions] = useState([]);
  const [closingDeals, setClosingDeals]     = useState([]);
  const [error, setError]                   = useState("");

  const [allDeals, setAllDeals]             = useState([]);
  const [quota, setQuota]                   = useState(400000000);
  const [briefing, setBriefing]             = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError]   = useState("");
  const [showBriefing, setShowBriefing]     = useState(false);

  useEffect(() => { loadAll(); }, []);

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
      setAllDeals(dealsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBriefing() {
    setBriefingLoading(true);
    setBriefingError("");
    try {
      const activeDeals = allDeals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
      const activeValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const coverage = quota > 0 ? (activeValue / quota).toFixed(1) : 0;
      
      const now = new Date();
      const next7Days = activeDeals.filter(d => {
        if (!d.expected_close) return false;
        const diff = differenceInDays(parseISO(d.expected_close), now);
        return diff >= 0 && diff <= 7;
      }).map(d => `- ${d.name || 'Không tên'}: ${(d.value/1000000).toFixed(0)}tr`);

      const overdueDealsCount = activeDeals.filter(d => {
        if (!d.expected_close) return false;
        return differenceInDays(now, parseISO(d.expected_close)) > 0;
      }).length;

      const top5Deals = [...activeDeals]
        .sort((a,b) => (b.value || 0) - (a.value || 0))
        .slice(0, 5)
        .map(d => {
          const daysLast = d.updated_at ? differenceInDays(now, parseISO(d.updated_at)) : 0;
          return `- ${d.name || 'Không tên'} (${STAGE_LABELS[d.stage] || d.stage}), Last activity: ${daysLast} ngày`;
        });

      const prompt = `Bạn là AI Sales Coach cho Henry tại Biomedia Group Vietnam (bán thiết bị QC/vi sinh cho nhà máy dược và F&B).

Dữ liệu pipeline hôm nay:
- Tổng deals đang mở: ${activeDeals.length}
- Pipeline coverage: ${coverage}×
- Deals sắp đóng trong 7 ngày:
${next7Days.length > 0 ? next7Days.join('\n') : "Không có"}
- Deals quá hạn: ${overdueDealsCount}
- Top 5 deals theo giá trị:
${top5Deals.length > 0 ? top5Deals.join('\n') : "Không có"}

Viết morning briefing ngắn gọn (150-200 từ) bằng tiếng Việt gồm:
1. Tình trạng pipeline (1-2 câu)
2. Top 3 việc cần làm hôm nay (cụ thể, actionable)
3. 1 cảnh báo rủi ro nếu có

Giọng văn: chuyên nghiệp, trực tiếp, như một sales manager giàu kinh nghiệm.`;

      const aiReply = await chatWithCoach(prompt, {});
      const timeStr = format(new Date(), "HH:mm");
      setBriefing({ text: aiReply, time: timeStr });
      if (!showBriefing) setShowBriefing(true);
    } catch (err) {
      setBriefingError(err.message || "Failed to fetch AI briefing.");
    } finally {
      setBriefingLoading(false);
    }
  }

  useEffect(() => {
    if (allDeals.length > 0 && !briefing && !briefingLoading && !briefingError) {
      fetchBriefing();
    }
  }, [allDeals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 animate-fade-in">
        <div className="spinner" />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
          Đang khởi tạo dashboard...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 max-w-md mx-auto text-center">
        <AlertCircle size={28} style={{ color: 'var(--brand)' }} className="mx-auto mb-3" />
        <p className="text-[13px] mb-5" style={{ color: 'var(--text-2)' }}>{error}</p>
        <button onClick={loadAll} className="btn-secondary w-full">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── SECTION A: Pipeline Coverage KPI Bar ── */}
      {(() => {
        const activeDealsForCoverage = allDeals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
        const activeValue = activeDealsForCoverage.reduce((sum, d) => sum + (d.value || 0), 0);
        const coverageRatio = quota > 0 ? (activeValue / quota) : 0;
        
        let coverageStatus = "Nguy hiểm";
        let coverageBadgeColor = "bg-red-100 text-red-700 border border-red-200";
        if (coverageRatio >= 4) {
          coverageStatus = "Tốt";
          coverageBadgeColor = "bg-green-100 text-green-700 border border-green-200";
        } else if (coverageRatio >= 2) {
          coverageStatus = "Cần chú ý";
          coverageBadgeColor = "bg-amber-100 text-amber-700 border border-amber-200";
        }

        const wonThisMonthValue = allDeals.filter(d => {
          if (d.stage !== 'closed_won' || !d.expected_close) return false;
          return isThisMonth(parseISO(d.expected_close));
        }).reduce((sum, d) => sum + (d.value || 0), 0);
        
        const monthProgress = quota > 0 ? Math.min(100, (wonThisMonthValue / quota) * 100) : 0;
        let progressColor = "bg-red-500";
        if (monthProgress >= 80) progressColor = "bg-green-500";
        else if (monthProgress >= 40) progressColor = "bg-amber-500";

        return (
          <div className="card p-6 flex flex-col lg:flex-row gap-8 lg:items-center">
            {/* Coverage Ratio */}
            <div className="flex-1 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 pb-5 lg:pb-0 lg:pr-8">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>Pipeline Coverage</div>
                  <div className="flex items-end gap-3 mt-1 flex-wrap">
                    <div className="text-4xl font-black tracking-tighter leading-none" style={{ color: 'var(--text-1)' }}>
                      {coverageRatio.toFixed(1)}×
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${coverageBadgeColor}`}>
                      {coverageStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
                Cần ít nhất 3× để đạt quota an toàn
              </div>
            </div>

            {/* Progress */}
            <div className="flex-1">
              <div className="flex justify-between items-end mb-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>Tiến độ tháng này</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>
                  <span>Đã đóng:</span> 
                  <CurrencyDisplay value={wonThisMonthValue} className="font-bold" style={{ color: 'var(--text-1)' }} />
                  <span className="mx-1">/</span>
                  <span>Quota:</span>
                  <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-transparent hover:border-brand-border transition-all group">
                    <CurrencyDisplay value={quota} className="font-bold text-[11px]" />
                    <input 
                      type="number" 
                      value={quota} 
                      onChange={e => setQuota(parseInt(e.target.value) || 0)} 
                      className="w-16 bg-transparent text-[11px] font-bold outline-none border-none p-0 focus:w-28 transition-all" 
                      style={{ color: 'var(--text-1)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${monthProgress}%` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SECTION B: AI Morning Briefing ── */}
      <div className="card p-0 overflow-hidden">
        <div 
          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => setShowBriefing(!showBriefing)}
        >
          <div className="flex items-center gap-3">
            <div className="text-xl">🤖</div>
            <h3 className="font-bold uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-1)' }}>
              AI Briefing hôm nay
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {briefing?.time && (
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
                Cập nhật lúc {briefing.time}
              </span>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); fetchBriefing(); }}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              disabled={briefingLoading}
              style={{ color: 'var(--text-2)' }}
            >
              <RefreshCw size={14} className={briefingLoading ? "animate-spin" : ""} />
            </button>
            <ChevronDown size={16} style={{ color: 'var(--text-3)', transform: showBriefing ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </div>
        
        {showBriefing && (
          <div className="px-6 pb-6 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {briefingLoading && !briefing ? (
              <div className="animate-pulse space-y-3">
                <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-elevated)' }}></div>
                <div className="h-3 rounded w-full" style={{ background: 'var(--bg-elevated)' }}></div>
                <div className="h-3 rounded w-5/6" style={{ background: 'var(--bg-elevated)' }}></div>
              </div>
            ) : briefingError ? (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl">
                {briefingError}
              </div>
            ) : briefing ? (
              <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
                {briefing.text}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng pipeline"    value={<CurrencyDisplay value={stats?.totalPipelineValue} />} icon={DollarSign} />
        <StatCard title="Deal đang mở"     value={stats?.activeDeals ?? 0}   icon={TrendingUp} />
        <StatCard title="Tỷ lệ thắng"      value={`${stats?.winRate ?? 0}%`} icon={Target} />
        <StatCard title="Tổng tài khoản"   value={stats?.totalAccounts ?? 0} icon={Users} />
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/accounts")} className="btn-primary">
            <Plus size={15} /> Thêm tài khoản
          </button>
          <button onClick={() => navigate("/pipeline")} className="btn-secondary">
            <Plus size={15} /> Thêm deal
          </button>
        </div>
        <Link
          to="/pipeline"
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          Xem toàn bộ pipeline <ChevronRight size={13} />
        </Link>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pipeline by Stage */}
        <div className="card p-6">
          <SectionHeader title="Pipeline theo giai đoạn" />
          {stageData.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu pipeline" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} layout="vertical" margin={{ left: -12, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickFormatter={(v) => STAGE_LABELS[v] || v}
                  tick={{ fontSize: 11, fill: 'var(--text-3)', fontWeight: 500 }}
                  width={88}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-overlay)' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                  {stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deals Closing This Month */}
        <div className="card p-6">
          <SectionHeader title={`Deal đóng tháng này (${closingDeals.length})`} />
          {closingDeals.length === 0 ? (
            <EmptyState message="Không có deal sắp đóng tháng này" />
          ) : (
            <div className="space-y-2">
              {closingDeals.slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors duration-150"
                  style={{ border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                      {deal.name}
                    </div>
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                      {deal.accounts?.name}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <CurrencyDisplay value={deal.value} className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }} />
                    <div
                      className="text-[11px] mt-0.5 font-medium"
                      style={{ color: deal.probability >= 60 ? '#22C55E' : '#F59E0B' }}
                    >
                      {deal.probability}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tables Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Accounts */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <SectionHeader title="Top 5 tài khoản tiềm năng" />
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Loại</th>
                  <th>Điểm</th>
                  <th>Gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {topAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <Link
                        to={`/accounts/${acc.id}`}
                        className="font-semibold transition-colors duration-150"
                        style={{ color: 'var(--text-1)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-1)'}
                      >
                        {acc.name}
                      </Link>
                      {acc.region && (
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {acc.region}
                        </div>
                      )}
                    </td>
                    <td className="text-[12px]">{acc.type || '—'}</td>
                    <td><ScoreBadge score={acc.score} /></td>
                    <td className="text-[12px]">
                      {acc.interactions?.[0]?.date
                        ? format(parseISO(acc.interactions[0].date), "dd/MM/yy")
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <SectionHeader title="Tương tác gần nhất" />
          </div>
          <div>
            {recentInteractions.slice(0, 6).map((interaction, i) => (
              <div
                key={interaction.id}
                className="px-6 py-4 transition-colors duration-150"
                style={{
                  borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/accounts/${interaction.account_id}`}
                        className="text-[12px] font-semibold transition-colors duration-150 truncate"
                        style={{ color: 'var(--text-1)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-1)'}
                      >
                        {interaction.accounts?.name}
                      </Link>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-3)' }}
                      >
                        {INTERACTION_TYPE_LABELS[interaction.type] || interaction.type}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>
                      {interaction.summary}
                    </p>
                    {interaction.buying_signal && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Target size={10} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--brand)' }}>
                          {interaction.buying_signal}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    {interaction.date ? format(parseISO(interaction.date), "dd/MM") : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
