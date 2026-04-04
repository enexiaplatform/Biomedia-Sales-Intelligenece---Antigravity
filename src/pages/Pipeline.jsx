import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Target, DollarSign, TrendingUp, Award, X, Save, Calendar, FileText, AlertCircle } from "lucide-react";
import { parseISO, isPast, format } from "date-fns";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchDeals, fetchAccounts, createDeal, updateDeal, deleteDeal
} from "../lib/supabase";

const STAGES = [
  { key: "prospect", label: "Tiềm năng", color: "bg-gray-100" },
  { key: "qualified", label: "Đã xác nhận", color: "bg-blue-50" },
  { key: "proposal", label: "Báo giá", color: "bg-yellow-50" },
  { key: "negotiation", label: "Đàm phán", color: "bg-purple-50" },
  { key: "closed_won", label: "Thắng", color: "bg-green-50" },
  { key: "closed_lost", label: "Thua", color: "bg-red-50" }
];

export default function Pipeline({ showToast }) {
  const [deals, setDeals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [dealsRes, accountsRes] = await Promise.all([
      fetchDeals(),
      fetchAccounts()
    ]);
    setDeals(dealsRes.data || []);
    setAccounts(accountsRes.data || []);
    setLoading(false);
  }

  async function handleStageChange(dealId, newStage) {
    const { data } = await updateDeal(dealId, { stage: newStage });
    if (data) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));
    }
  }

  async function handleDelete(id) {
    setDeleting(true);
    const { error } = await deleteDeal(id);
    if (error) showToast(error.message, "error");
    else {
      setDeals((prev) => prev.filter((d) => d.id !== id));
      showToast("Đã xóa deal");
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  function handleDragStart(e, deal) {
    setDragging(deal);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, stageKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageKey);
  }

  function handleDrop(e, stageKey) {
    e.preventDefault();
    if (dragging && dragging.stage !== stageKey) {
      handleStageChange(dragging.id, stageKey);
    }
    setDragging(null);
    setDragOver(null);
  }

  const openDeals = deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const closedWon = deals.filter((d) => d.stage === "closed_won");
  const closedDeals = deals.filter((d) => d.stage === "closed_won" || d.stage === "closed_lost");
  const totalValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedForecast = openDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
  const winRate = closedDeals.length > 0 ? Math.round((closedWon.length / closedDeals.length) * 100) : 0;

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col h-full bg-surface-950 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full -z-10" />
      
      {/* Header & Summary Bar */}
      <div className="px-10 py-10 border-b border-white/5 bg-surface-900/40 backdrop-blur-3xl shrink-0 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-8 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter leading-none italic">Pipeline Strategic Board</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              Real-time Funnel Analytics Engine
            </p>
          </div>
          <button onClick={() => { setEditingDeal(null); setModalOpen(true); }} className="btn-primary h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-glow shadow-primary/20 flex items-center gap-3">
            <Plus size={18} /> Khởi tạo Deal mới
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard label="Tổng deals mở" value={openDeals.length} icon={<Target size={16}/>} />
          <SummaryCard label="Giá trị Pipeline" value={totalValue} formatter={v => <CurrencyDisplay value={v} />} icon={<DollarSign size={16}/>} />
          <SummaryCard label="Dự báo trọng số" value={Math.round(weightedForecast)} formatter={v => <CurrencyDisplay value={v} />} icon={<TrendingUp size={16}/>} color="primary" />
          <SummaryCard label="Tỷ lệ thắng (Lũy kế)" value={winRate} formatter={v => `${v}%`} icon={<Award size={16}/>} color="emerald" />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-10 scrollbar-hide">
        <div className="flex gap-8 h-full min-w-max pb-4">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            const isTarget = dragOver === stage.key;

            return (
              <div
                key={stage.key}
                className={`flex flex-col w-80 rounded-[2.5rem] transition-all duration-500 border backdrop-blur-sm
                  ${isTarget ? "bg-white/10 border-primary shadow-glow shadow-primary/20 scale-[1.02]" : "bg-white/5 border-white/5"}`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
                onDragLeave={() => setDragOver(null)}
              >
                <div className="p-6 border-b border-white/5 bg-white/5 rounded-t-[2.5rem]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-100 italic flex items-center gap-2">
                      <div className="w-1.5 h-3 bg-primary/40 rounded-full" />
                      {stage.label}
                    </span>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-surface-950/50 text-slate-400 text-[10px] font-black border border-white/5">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <CurrencyDisplay value={stageValue} className="text-xs font-bold text-slate-500 italic drop-shadow-glow-sm" />
                    <span className="text-[8px] text-slate-700 font-black uppercase">Capital Allocation</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={() => setDragging(null)}
                      isDragging={dragging?.id === deal.id}
                      onEdit={() => { setEditingDeal(deal); setModalOpen(true); }}
                      onDelete={() => setDeleteTarget(deal)}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-white/5 rounded-3xl m-2">
                      <Plus size={32} className="text-slate-500 mb-4" />
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Empty Stage</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Modal */}
      {modalOpen && (
        <DealModal
          deal={editingDeal}
          accounts={accounts}
          onClose={() => setModalOpen(false)}
          onSave={(saved) => {
            if (editingDeal) {
              setDeals((prev) => prev.map((d) => (d.id === saved.id ? { ...d, ...saved } : d)));
              showToast("Đã cập nhật deal");
            } else {
              setDeals((prev) => [saved, ...prev]);
              showToast("Đã thêm deal");
            }
            setModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/90 backdrop-blur-md p-4">
          <div className="bg-surface-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter mb-2">Hủy bỏ Deal?</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">Bạn có chắc chắn muốn xóa "<strong>{deleteTarget.name}</strong>"? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary h-12 flex-1 uppercase tracking-widest text-[10px] font-black" disabled={deleting}>Hủy</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger h-12 flex-1 uppercase tracking-widest text-[10px] font-black flex items-center justify-center gap-2" disabled={deleting}>
                {deleting ? <LoadingSpinner size="sm" /> : <Trash2 size={14}/>} Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, formatter = v => v, color = "default" }) {
  const colorClasses = {
    primary: "text-primary drop-shadow-glow",
    emerald: "text-emerald-400 drop-shadow-glow-sm",
    default: "text-slate-100"
  };

  return (
    <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -z-10 group-hover:bg-primary/5 transition-all duration-700" />
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-surface-950/50 border border-white/5 text-slate-500 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</div>
      </div>
      <div className={`text-2xl font-black italic tracking-tighter ${colorClasses[color]}`}>{formatter(value)}</div>
    </div>
  );
}

function DealCard({ deal, onDragStart, onDragEnd, isDragging, onEdit, onDelete }) {
  const isOverdue = deal.expected_close && isPast(parseISO(deal.expected_close)) &&
    deal.stage !== "closed_won" && deal.stage !== "closed_lost";

  const probColor = deal.probability >= 70 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    deal.probability >= 40 ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-slate-400 bg-white/5 border-white/10";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white/5 border border-white/10 rounded-[1.5rem] p-5 shadow-lg cursor-grab group transition-all duration-300
        ${isDragging ? "opacity-20 scale-95" : "hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-slate-100 uppercase tracking-tight italic line-clamp-1 group-hover:text-primary transition-colors">{deal.name}</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-blue-500 rounded-full" />
            {deal.accounts?.name || "Unassigned Account"}
          </div>
        </div>
        <div className="hidden group-hover:flex gap-2 shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
          <button onClick={onEdit} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all border border-white/5"><Edit2 size={12} /></button>
          <button onClick={onDelete} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-white/5"><Trash2 size={12} /></button>
        </div>
      </div>

      {deal.product && (
        <div className="flex items-center gap-2 mb-4">
          <FileText size={10} className="text-slate-600" />
          <div className="text-[10px] text-slate-400 font-medium italic">{deal.product}</div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <CurrencyDisplay value={deal.value} className="text-sm font-black text-slate-100 tracking-tighter" />
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${probColor}`}>
          {deal.probability}% Prob
        </span>
      </div>

      {deal.expected_close && (
        <div className={`flex items-center gap-2 text-[9px] mt-4 font-black uppercase tracking-widest ${isOverdue ? "text-red-400 animate-pulse" : "text-slate-600"}`}>
          <Calendar size={10} />
          {isOverdue ? "⚠️ QUÁ HẠN: " : "EXP: "} {deal.expected_close}
        </div>
      )}
    </div>
  );
}

function DealModal({ deal, accounts, onClose, onSave }) {
  const STAGES_OPT = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
  const STAGE_LABELS = { prospect: "Tiềm năng", qualified: "Đã xác nhận", proposal: "Báo giá", negotiation: "Đàm phán", closed_won: "Thắng", closed_lost: "Thua" };

  const [form, setForm] = useState({
    name: deal?.name || "",
    account_id: deal?.account_id || "",
    product: deal?.product || "",
    value: deal?.value || 0,
    stage: deal?.stage || "prospect",
    probability: deal?.probability ?? 50,
    expected_close: deal?.expected_close || "",
    notes: deal?.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Tên deal là bắt buộc");
    if (!form.account_id) return setError("Vui lòng chọn tài khoản");
    setSaving(true);
    const fn = deal ? updateDeal(deal.id, form) : createDeal(form);
    const { data, error: err } = await fn;
    setSaving(false);
    if (err) return setError(err.message);
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/95 backdrop-blur-md p-4">
      <div className="bg-surface-900 border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700" />
        
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="font-black text-slate-100 uppercase tracking-tighter text-xl">{deal ? "Modify Strategic Deal" : "New Market Opportunity"}</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Strategic Pipeline Update</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
          {error && <div className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-2xl flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}

          <div className="space-y-2">
            <label className="label">Tên cơ hội (Deal Name) *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input !bg-surface-950/50" required placeholder="Nhập tên cơ hội chiến lược..." />
          </div>

          <div className="space-y-2">
            <label className="label">Đối tác / Tài khoản *</label>
            <select value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))} className="input !bg-surface-950/50 cursor-pointer font-bold uppercase tracking-tight">
              <option value="" className="bg-surface-900 text-slate-600">-- Xác định đối tác chi tiết --</option>
              {accounts.map((a) => <option key={a.id} value={a.id} className="bg-surface-900">{a.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="label">Sản phẩm / Giải pháp</label>
              <input value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} className="input !bg-surface-950/50" placeholder="Product Line..." />
            </div>
            <div className="space-y-2">
              <label className="label">Giá trị Deal (VNĐ)</label>
              <input type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: parseInt(e.target.value) || 0 }))} className="input !bg-surface-950/50 !text-primary !font-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="label">Giai đoạn Pipeline</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} className="input !bg-surface-950/50 cursor-pointer font-bold">
                {STAGES_OPT.map((s) => <option key={s} value={s} className="bg-surface-900 uppercase">{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="label !mb-0">Xác suất (Win Probability)</label>
                <span className="text-[10px] font-black text-primary drop-shadow-glow-sm">{form.probability}%</span>
              </div>
              <input type="range" min={0} max={100} value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: parseInt(e.target.value) }))} className="w-full h-2 bg-surface-950/50 rounded-lg appearance-none cursor-pointer accent-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Ngày đóng dự kiến (ETD/ETC)</label>
            <input type="date" value={form.expected_close} onChange={(e) => setForm((f) => ({ ...f, expected_close: e.target.value }))} className="input !bg-surface-950/50 font-black cursor-pointer" />
          </div>

          <div className="space-y-2">
            <label className="label">Ghi chú chiến thuật (Strategic Notes)</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="input !bg-surface-950/50 resize-none italic text-slate-400" placeholder="Thông tinh tình báo, chiến lược đàm phán..." />
          </div>

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="btn-secondary h-14 flex-1 font-black uppercase tracking-widest text-[10px]">Hủy bỏ</button>
            <button type="submit" className="btn-primary h-14 flex-1 shadow-glow shadow-primary/20 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <Save size={18}/>} Lưu trữ Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
