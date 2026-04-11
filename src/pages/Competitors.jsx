import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Brain, GitBranch, X, TrendingUp } from "lucide-react";
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
// Using Brain instead of Sparkles to prevent ReferenceError
  biomedia: { label: "Biomedia", color: "bg-primary/10 text-primary border-primary/20 shadow-sm", icon: Brain },
  neutral: { label: "Ngang nhau", color: "bg-gray-100 text-gray-500 border-gray-200", icon: GitBranch },
  competitor: { label: "Đối thủ", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: X }
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
      const message = `PHÂN TÍCH CHIẾN THUẬT: Đối thủ ${competitor.name}.
      Dựa trên thông tin: Điểm mạnh (${competitor.strengths}), Điểm yếu (${competitor.weaknesses}), Thị phần (${competitor.market_share}).
      Hãy cung cấp một bản kế hoạch tác chiến gồm 3 phần:
      1. DEFEND: Henry nên trả lời thế nào khi khách hàng khen điểm mạnh của họ?
      2. ATTACK: Henry nên đặt câu hỏi 'xoáy' nào vào điểm yếu của họ?
      3. KILL SWITCH: Một lập luận hoặc câu hỏi duy nhất có thể loại bỏ đối thủ này ngay lập tức.
      Phản hồi bằng tiếng Việt, ngắn gọn, tactical (như lính đặc nhiệm sales).`;

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
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8 border-b border-gray-200 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
            <TrendingUp className="text-red-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">ĐỐI THỦ CẠNH TRANH</h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Competitive Intelligence</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 p-1 rounded-2xl border border-gray-200 w-fit shadow-sm bg-white">
        <button
          onClick={() => setActiveTab("competitors")}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${activeTab === "competitors" ? "bg-primary text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          Battlecenter
        </button>
        <button
          onClick={() => setActiveTab("winloss")}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${activeTab === "winloss" ? "bg-primary text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          Phân Tích Thắng/Thua
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
            <div className="text-center py-16 text-sm text-gray-500">Chưa có đối thủ nào được theo dõi</div>
          ) : (
            <div className="space-y-3">
              {competitors.map((comp) => (
                <div key={comp.id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-sm relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 blur-xl opacity-50 pointer-events-none"></div>
                  {/* Card Header */}
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-red-500 font-black text-xl shadow-sm group-hover:border-red-500/50 transition-colors">
                      {comp.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black text-gray-900 uppercase tracking-tight">{comp.name}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                         {comp.market_share && (
                           <div className="text-[10px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-bold uppercase tracking-widest">
                             Share: {comp.market_share}
                           </div>
                         )}
                         <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                           {battlecards[comp.id]?.length || 0} TIÊU CHÍ • {comp.win_loss?.[0]?.count ?? 0} HỒ SƠ
                         </div>
                      </div>
                    </div>
                    <div className="flex gap-2 z-10">
                      <button
                        onClick={() => handleGenerateAI(comp)}
                        disabled={aiLoading[comp.id]}
                        className="h-10 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-sm"
                      >
                        {aiLoading[comp.id] ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <Brain size={14} />}
                        Tactical Intel
                      </button>
                      <button onClick={() => setCompetitorModal(comp)} className="p-2.5 text-gray-400 hover:text-primary transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(comp)} className="p-2.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => toggleExpand(comp)} className="p-2.5 text-gray-400 hover:text-gray-800 transition-colors">
                        {expandedId === comp.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* AI Insight */}
                  {aiInsight[comp.id] && (
                    <div className="mx-4 mb-4 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-sm text-gray-700 whitespace-pre-wrap relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 text-primary/30 group-hover:text-primary transition-colors">
                         <Brain size={24} className="animate-pulse" />
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                      {aiInsight[comp.id]}
                    </div>
                  )}

                  {/* Battlecard Table */}
                  {expandedId === comp.id && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm"></div>
                           Comparison Matrix
                        </span>
                        <button
                          onClick={() => setBattlecardModal({ competitorId: comp.id, competitorName: comp.name })}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Thêm tiêu chí
                        </button>
                      </div>
                      {(battlecards[comp.id] || []).length === 0 ? (
                        <div className="text-center py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Chưa có dữ liệu so sánh đặc thù</div>
                      ) : (
                        <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                                <th className="px-6 py-4">Tiêu chí tác chiến</th>
                                <th className="px-6 py-4">Biomedia Solution</th>
                                <th className="px-6 py-4">{comp.name} Alternative</th>
                                <th className="px-6 py-4">Ưu thế</th>
                                <th className="px-6 py-4"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(battlecards[comp.id] || []).map((bc) => {
                                const cfg = ADVANTAGE_CONFIG[bc.advantage];
                                const AdvIcon = cfg?.icon || GitBranch;
                                return (
                                  <tr key={bc.id} className="border-b border-gray-200 hover:bg-white transition-colors group/row">
                                    <td className="px-6 py-4 text-xs font-black text-gray-800 uppercase tracking-tight">{bc.criteria}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-primary">{bc.biomedia_value || "—"}</td>
                                    <td className="px-6 py-4 text-xs text-gray-600">{bc.competitor_value || "—"}</td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1.5 border w-fit ${cfg?.color}`}>
                                        <AdvIcon size={10} />
                                        {cfg?.label || bc.advantage}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 flex justify-end">
                                      <button
                                        onClick={async () => {
                                          await deleteBattlecard(bc.id);
                                          setBattlecards((prev) => ({
                                            ...prev,
                                            [comp.id]: prev[comp.id].filter((b) => b.id !== bc.id)
                                          }));
                                        }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Strengths / Weaknesses */}
                      {(comp.strengths || comp.weaknesses) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100/50 border-t border-gray-200">
                          {comp.strengths && (
                            <div className="p-6 bg-white group">
                              <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                 <div className="w-1 h-3 bg-primary rounded-full"></div>
                                 ĐIỂM MẠNH ĐÓI THỦ
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed font-medium">{comp.strengths}</p>
                            </div>
                          )}
                          {comp.weaknesses && (
                            <div className="p-6 bg-white border-l border-gray-200 group">
                              <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                 <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
                                 ĐIỂM YẾU HÀNH QUÂN
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed font-medium">{comp.weaknesses}</p>
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
            <button onClick={() => setWinLossModal(true)} className="btn-primary h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest">
              <Plus size={16} /> Thêm kết quả
            </button>
          </div>

          {/* Win/Loss Summary Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-white border border-gray-200 p-6 rounded-3xl relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tỉ lệ thắng (Win Rate)</div>
                <div className="text-3xl font-black text-primary tracking-tighter">
                   {winLoss.length > 0 ? (winLoss.filter(wl => wl.outcome === 'won').length / winLoss.length * 100).toFixed(0) : 0}%
                </div>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                   <div
                     className="h-full bg-primary shadow-sm transition-all duration-1000"
                     style={{ width: `${winLoss.length > 0 ? (winLoss.filter(wl => wl.outcome === 'won').length / winLoss.length * 100) : 0}%` }}
                   ></div>
                </div>
             </div>

             <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40"></div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Lý do thua phổ biến nhất</div>
                <div className="text-xl font-black text-gray-900 tracking-tight mt-1 line-clamp-1">
                   {winLoss.filter(wl => wl.outcome === 'lost').length > 0
                     ? "Giá cạnh tranh & Support"
                     : "—"}
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Dựa trên {winLoss.length} hồ sơ dự thầu</p>
             </div>

             <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gray-500/40"></div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Thắng nhiều nhất với</div>
                <div className="text-xl font-black text-gray-900 tracking-tight mt-1">
                   Microbiology Quality Control
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Ngành hàng chủ đạo</p>
             </div>
          </div>

          {winLoss.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">Chưa có kết quả W/L nào</div>
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
                        <span className={`badge ${wl.outcome === "won" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                          {wl.outcome === "won" ? "Thắng" : "Thua"}
                        </span>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-sm line-clamp-2 text-gray-700">{wl.reason || "—"}</p>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-sm line-clamp-2 text-gray-700">{wl.lessons || "—"}</p>
                      </td>
                      <td>
                        <button
                          onClick={async () => {
                            await deleteWinLoss(wl.id);
                            setWinLoss((p) => p.filter((w) => w.id !== wl.id));
                            showToast("Đã xóa");
                          }}
                          className="text-gray-400 hover:text-red-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="rounded-xl shadow-xl p-6 max-w-sm w-full bg-white border border-gray-200">
            <h3 className="font-semibold mb-2 text-gray-900">Xóa đối thủ?</h3>
            <p className="text-sm mb-5 text-gray-600">Xóa "<strong>{deleteTarget.name}</strong>"?</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md bg-white border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-900">{competitor ? "Sửa đối thủ" : "Thêm đối thủ"}</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 transition-colors">×</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md bg-white border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-900">Thêm tiêu chí vs {competitorName}</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 transition-colors">×</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md bg-white border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-900">Thêm kết quả Thắng/Thua</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 transition-colors">×</button>
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
