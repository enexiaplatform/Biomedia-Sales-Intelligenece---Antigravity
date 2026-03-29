import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchCompetitors, createCompetitor, updateCompetitor, deleteCompetitor,
  fetchBattlecards, createBattlecard, updateBattlecard, deleteBattlecard,
  fetchWinLoss, createWinLoss, deleteWinLoss,
  fetchDeals
} from "../lib/supabase";
import { callAISalesCoach } from "../lib/ai";

const ADVANTAGE_CONFIG = {
  biomedia: { label: "Biomedia", color: "bg-green-100 text-green-700" },
  neutral: { label: "Ngang nhau", color: "bg-gray-100 text-gray-600" },
  competitor: { label: "Đối thủ", color: "bg-red-100 text-red-700" }
};

export default function Competitors({ showToast }) {
  const [competitors, setCompetitors] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [battlecards, setBattlecards] = useState({});
  const [winLoss, setWinLoss] = useState([]);
  const [competitorModal, setCompetitorModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [battlecardModal, setBattlecardModal] = useState(null);
  const [winLossModal, setWinLossModal] = useState(false);
  const [aiInsight, setAiInsight] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [activeTab, setActiveTab] = useState("competitors");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [compRes, dealsRes, wlRes] = await Promise.all([
      fetchCompetitors(),
      fetchDeals(),
      fetchWinLoss()
    ]);
    setCompetitors(compRes.data || []);
    setDeals(dealsRes.data || []);
    setWinLoss(wlRes.data || []);
    setLoading(false);
  }

  async function toggleExpand(competitor) {
    if (expandedId === competitor.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(competitor.id);
    if (!battlecards[competitor.id]) {
      const { data } = await fetchBattlecards(competitor.id);
      setBattlecards((prev) => ({ ...prev, [competitor.id]: data || [] }));
    }
  }

  async function handleGenerateAI(competitor) {
    setAiLoading((prev) => ({ ...prev, [competitor.id]: true }));
    try {
      const bcs = battlecards[competitor.id] || [];
      const message = `Phân tích đối thủ ${competitor.name}: điểm mạnh, yếu, thị phần và cách định vị Biomedia chống lại họ. Đề xuất cách xử lý khi khách hàng so sánh với ${competitor.name}.`;
      const reply = await callAISalesCoach(message, { competitor });
      setAiInsight((prev) => ({ ...prev, [competitor.id]: reply }));
    } catch (err) {
      setAiInsight((prev) => ({ ...prev, [competitor.id]: "Lỗi: " + err.message }));
    }
    setAiLoading((prev) => ({ ...prev, [competitor.id]: false }));
  }

  async function handleDeleteCompetitor(id) {
    const { error } = await deleteCompetitor(id);
    if (error) showToast(error.message, "error");
    else {
      setCompetitors((p) => p.filter((c) => c.id !== id));
      showToast("Đã xóa đối thủ");
    }
    setDeleteTarget(null);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("competitors")} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "competitors" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          Đối thủ & Battlecard
        </button>
        <button onClick={() => setActiveTab("winloss")} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "winloss" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          Thắng/Thua
        </button>
      </div>

      {activeTab === "competitors" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setCompetitorModal({})} className="btn-primary">
              <Plus size={14} /> Thêm đối thủ
            </button>
          </div>

          {competitors.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">Chưa có đối thủ nào được theo dõi</div>
          ) : (
            <div className="space-y-3">
              {competitors.map((comp) => (
                <div key={comp.id} className="card overflow-hidden">
                  {/* Card Header */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                      {comp.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{comp.name}</div>
                      <div className="text-xs text-gray-500">
                        {comp.market_share && `Thị phần: ${comp.market_share} · `}
                        {comp.battlecards?.[0]?.count ?? 0} battlecard · {comp.win_loss?.[0]?.count ?? 0} W/L records
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleGenerateAI(comp)} disabled={aiLoading[comp.id]} className="btn-secondary text-xs">
                        {aiLoading[comp.id] ? <LoadingSpinner size="sm" /> : <Brain size={12} />}
                        AI Intel
                      </button>
                      <button onClick={() => setCompetitorModal(comp)} className="text-gray-400 hover:text-blue-600">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(comp)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => toggleExpand(comp)} className="text-gray-400 hover:text-gray-600">
                        {expandedId === comp.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* AI Insight */}
                  {aiInsight[comp.id] && (
                    <div className="mx-4 mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {aiInsight[comp.id]}
                    </div>
                  )}

                  {/* Battlecard Table */}
                  {expandedId === comp.id && (
                    <div className="border-t">
                      <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                        <span className="text-sm font-semibold text-gray-700">Battlecard</span>
                        <button
                          onClick={() => setBattlecardModal({ competitorId: comp.id, competitorName: comp.name })}
                          className="btn-secondary text-xs"
                        >
                          <Plus size={12} /> Thêm tiêu chí
                        </button>
                      </div>
                      {(battlecards[comp.id] || []).length === 0 ? (
                        <div className="text-center py-6 text-sm text-gray-400">Chưa có battlecard. Thêm tiêu chí để so sánh.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Tiêu chí</th>
                                <th>Biomedia</th>
                                <th>{comp.name}</th>
                                <th>Lợi thế</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(battlecards[comp.id] || []).map((bc) => (
                                <tr key={bc.id}>
                                  <td className="font-medium">{bc.criteria}</td>
                                  <td className="text-green-700">{bc.biomedia_value || "—"}</td>
                                  <td className="text-red-700">{bc.competitor_value || "—"}</td>
                                  <td>
                                    <span className={`badge ${ADVANTAGE_CONFIG[bc.advantage]?.color || "bg-gray-100 text-gray-600"}`}>
                                      {ADVANTAGE_CONFIG[bc.advantage]?.label || bc.advantage}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={async () => {
                                        await deleteBattlecard(bc.id);
                                        setBattlecards((prev) => ({
                                          ...prev,
                                          [comp.id]: prev[comp.id].filter((b) => b.id !== bc.id)
                                        }));
                                      }}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Strengths / Weaknesses */}
                      {(comp.strengths || comp.weaknesses) && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-t">
                          {comp.strengths && (
                            <div>
                              <div className="text-xs font-semibold text-green-700 mb-1">Điểm mạnh</div>
                              <p className="text-xs text-gray-700">{comp.strengths}</p>
                            </div>
                          )}
                          {comp.weaknesses && (
                            <div>
                              <div className="text-xs font-semibold text-red-700 mb-1">Điểm yếu</div>
                              <p className="text-xs text-gray-700">{comp.weaknesses}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "winloss" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setWinLossModal(true)} className="btn-primary">
              <Plus size={14} /> Thêm kết quả
            </button>
          </div>
          {winLoss.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">Chưa có kết quả W/L nào</div>
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Deal</th>
                    <th>Đối thủ</th>
                    <th>Kết quả</th>
                    <th>Lý do</th>
                    <th>Bài học</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {winLoss.map((wl) => (
                    <tr key={wl.id}>
                      <td className="whitespace-nowrap">{wl.date}</td>
                      <td>{wl.deals?.name || "—"}</td>
                      <td>{wl.competitors?.name || "—"}</td>
                      <td>
                        <span className={`badge ${wl.outcome === "won" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {wl.outcome === "won" ? "Thắng" : "Thua"}
                        </span>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">{wl.reason || "—"}</p>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-sm text-gray-600 line-clamp-2">{wl.lessons || "—"}</p>
                      </td>
                      <td>
                        <button
                          onClick={async () => {
                            await deleteWinLoss(wl.id);
                            setWinLoss((p) => p.filter((w) => w.id !== wl.id));
                            showToast("Đã xóa");
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Competitor Modal */}
      {competitorModal !== null && (
        <CompetitorModal
          competitor={competitorModal.id ? competitorModal : null}
          onClose={() => setCompetitorModal(null)}
          onSave={(saved) => {
            if (competitorModal.id) setCompetitors((p) => p.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)));
            else setCompetitors((p) => [...p, saved]);
            setCompetitorModal(null);
            showToast(competitorModal.id ? "Đã cập nhật" : "Đã thêm đối thủ");
          }}
        />
      )}

      {/* Battlecard Modal */}
      {battlecardModal && (
        <BattlecardModal
          competitorId={battlecardModal.competitorId}
          competitorName={battlecardModal.competitorName}
          onClose={() => setBattlecardModal(null)}
          onSave={(saved) => {
            setBattlecards((prev) => ({
              ...prev,
              [battlecardModal.competitorId]: [...(prev[battlecardModal.competitorId] || []), saved]
            }));
            setBattlecardModal(null);
            showToast("Đã thêm battlecard");
          }}
        />
      )}

      {/* Win/Loss Modal */}
      {winLossModal && (
        <WinLossModal
          competitors={competitors}
          deals={deals}
          onClose={() => setWinLossModal(false)}
          onSave={(saved) => {
            setWinLoss((p) => [saved, ...p]);
            setWinLossModal(false);
            showToast("Đã thêm kết quả");
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Xóa đối thủ?</h3>
            <p className="text-sm text-gray-600 mb-5">Xóa "<strong>{deleteTarget.name}</strong>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={() => handleDeleteCompetitor(deleteTarget.id)} className="btn-danger flex-1">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorModal({ competitor, onClose, onSave }) {
  const [form, setForm] = useState({
    name: competitor?.name || "",
    products: competitor?.products || "",
    strengths: competitor?.strengths || "",
    weaknesses: competitor?.weaknesses || "",
    market_share: competitor?.market_share || "",
    website: competitor?.website || "",
    notes: competitor?.notes || ""
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fn = competitor ? updateCompetitor(competitor.id, form) : createCompetitor(form);
    const { data } = await fn;
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{competitor ? "Sửa đối thủ" : "Thêm đối thủ"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tên đối thủ *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Thị phần</label>
              <input value={form.market_share} onChange={(e) => setForm((f) => ({ ...f, market_share: e.target.value }))} className="input" placeholder="VD: 15%" />
            </div>
            <div>
              <label className="label">Website</label>
              <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Sản phẩm cạnh tranh</label>
            <textarea value={form.products} onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Điểm mạnh</label>
            <textarea value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Điểm yếu</label>
            <textarea value={form.weaknesses} onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null} Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BattlecardModal({ competitorId, competitorName, onClose, onSave }) {
  const [form, setForm] = useState({
    competitor_id: competitorId,
    criteria: "",
    biomedia_value: "",
    competitor_value: "",
    advantage: "neutral"
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data } = await createBattlecard(form);
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Thêm tiêu chí vs {competitorName}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tiêu chí *</label>
            <input value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))} className="input" required placeholder="VD: Giá cả, Hỗ trợ kỹ thuật..." />
          </div>
          <div>
            <label className="label">Giá trị Biomedia</label>
            <input value={form.biomedia_value} onChange={(e) => setForm((f) => ({ ...f, biomedia_value: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Giá trị {competitorName}</label>
            <input value={form.competitor_value} onChange={(e) => setForm((f) => ({ ...f, competitor_value: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Lợi thế về phía</label>
            <select value={form.advantage} onChange={(e) => setForm((f) => ({ ...f, advantage: e.target.value }))} className="input">
              {Object.entries(ADVANTAGE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null} Thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WinLossModal({ competitors, deals, onClose, onSave }) {
  const [form, setForm] = useState({
    deal_id: "",
    competitor_id: "",
    outcome: "won",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    lessons: ""
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data } = await createWinLoss({
      ...form,
      deal_id: form.deal_id || null,
      competitor_id: form.competitor_id || null
    });
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Thêm kết quả Thắng/Thua</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kết quả</label>
              <select value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} className="input">
                <option value="won">Thắng</option>
                <option value="lost">Thua</option>
              </select>
            </div>
            <div>
              <label className="label">Ngày</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Deal liên quan</label>
            <select value={form.deal_id} onChange={(e) => setForm((f) => ({ ...f, deal_id: e.target.value }))} className="input">
              <option value="">-- Không có --</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Đối thủ</label>
            <select value={form.competitor_id} onChange={(e) => setForm((f) => ({ ...f, competitor_id: e.target.value }))} className="input">
              <option value="">-- Không có --</option>
              {competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Lý do</label>
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Bài học rút ra</label>
            <textarea value={form.lessons} onChange={(e) => setForm((f) => ({ ...f, lessons: e.target.value }))} rows={2} className="input" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null} Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
