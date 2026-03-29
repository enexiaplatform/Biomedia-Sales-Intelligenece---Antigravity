import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { DollarSign, TrendingUp, Users, Target, Plus, AlertCircle } from "lucide-react";
import { format, isThisMonth, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import CurrencyDisplay from "../components/CurrencyDisplay";
import ScoreBadge from "../components/ScoreBadge";
import { PageLoader } from "../components/LoadingSpinner";
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
  prospect: "#6b7280",
  qualified: "#3b82f6",
  proposal: "#f59e0b",
  negotiation: "#8b5cf6",
  closed_won: "#10b981",
  closed_lost: "#ef4444"
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

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadAll} className="btn-secondary">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng pipeline"
          value={<CurrencyDisplay value={stats?.totalPipelineValue} className="text-2xl font-bold text-gray-900" />}
          icon={<DollarSign size={20} className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          title="Deal đang mở"
          value={<span className="text-2xl font-bold text-gray-900">{stats?.activeDeals ?? 0}</span>}
          icon={<TrendingUp size={20} className="text-green-600" />}
          bg="bg-green-50"
        />
        <StatCard
          title="Tỷ lệ thắng"
          value={<span className="text-2xl font-bold text-gray-900">{stats?.winRate ?? 0}%</span>}
          icon={<Target size={20} className="text-purple-600" />}
          bg="bg-purple-50"
        />
        <StatCard
          title="Tổng tài khoản"
          value={<span className="text-2xl font-bold text-gray-900">{stats?.totalAccounts ?? 0}</span>}
          icon={<Users size={20} className="text-orange-600" />}
          bg="bg-orange-50"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate("/accounts")} className="btn-primary">
          <Plus size={14} /> Thêm tài khoản
        </button>
        <button onClick={() => navigate("/pipeline")} className="btn-secondary">
          <Plus size={14} /> Thêm deal
        </button>
        <Link to="/pipeline" className="btn-secondary">
          Xem pipeline
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline theo giai đoạn</h3>
          {stageData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có deal nào</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickFormatter={(v) => STAGE_LABELS[v] || v}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  formatter={(val, name) =>
                    name === "count" ? [`${val} deal`, "Số deal"] : [val, "Giá trị"]
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deals Closing This Month */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            Deal đóng trong tháng này ({closingDeals.length})
          </h3>
          {closingDeals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Không có deal nào đóng tháng này</p>
          ) : (
            <div className="space-y-3">
              {closingDeals.slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  className={`flex items-center justify-between p-3 rounded-lg border
                    ${deal.probability >= 60 ? "border-green-200 bg-green-50" : deal.probability >= 30 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                    <div className="text-xs text-gray-500">{deal.accounts?.name}</div>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay value={deal.value} className="text-sm font-semibold text-gray-900" />
                    <div className="text-xs text-gray-500">{deal.probability}% · {deal.expected_close}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Accounts */}
      <div className="card">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Top 5 tài khoản theo điểm</h3>
        </div>
        {topAccounts.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có tài khoản nào</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên tài khoản</th>
                  <th>Khu vực</th>
                  <th>Loại</th>
                  <th>Điểm</th>
                  <th>Hoạt động gần đây</th>
                </tr>
              </thead>
              <tbody>
                {topAccounts.map((acc) => {
                  const lastDate = acc.interactions?.[0]?.date;
                  return (
                    <tr key={acc.id}>
                      <td>
                        <Link to={`/accounts/${acc.id}`} className="font-medium text-blue-600 hover:underline">
                          {acc.name}
                        </Link>
                      </td>
                      <td>{acc.region || "—"}</td>
                      <td>
                        <span className="badge bg-gray-100 text-gray-700">{acc.type}</span>
                      </td>
                      <td><ScoreBadge score={acc.score} /></td>
                      <td className="text-gray-500">
                        {lastDate ? format(parseISO(lastDate), "dd/MM/yyyy", { locale: vi }) : "Chưa có"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Interactions */}
      <div className="card">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">10 tương tác gần đây</h3>
        </div>
        {recentInteractions.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Chưa có tương tác nào</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentInteractions.map((interaction) => (
              <div key={interaction.id} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/accounts/${interaction.account_id}`}
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        {interaction.accounts?.name}
                      </Link>
                      <span className="badge bg-gray-100 text-gray-600 text-xs">
                        {INTERACTION_TYPE_LABELS[interaction.type] || interaction.type}
                      </span>
                      {interaction.contacts?.name && (
                        <span className="text-xs text-gray-500">· {interaction.contacts.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{interaction.summary}</p>
                    {interaction.buying_signal && (
                      <p className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                        🎯 {interaction.buying_signal}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {interaction.date
                      ? format(parseISO(interaction.date), "dd/MM/yy HH:mm")
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
        <span className="text-sm text-gray-500 font-medium">{title}</span>
      </div>
      {value}
    </div>
  );
}
