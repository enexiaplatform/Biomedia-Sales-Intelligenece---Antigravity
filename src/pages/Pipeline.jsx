import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO, isPast, format } from "date-fns";
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
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Tổng deals" value={<span className="text-xl font-bold">{openDeals.length}</span>} />
        <SummaryCard label="Tổng pipeline" value={<CurrencyDisplay value={totalValue} className="text-xl font-bold" />} />
        <SummaryCard label="Dự báo trọng số" value={<CurrencyDisplay value={Math.round(weightedForecast)} className="text-xl font-bold" />} />
        <SummaryCard label="Tỷ lệ thắng" value={<span className="text-xl font-bold text-green-600">{winRate}%</span>} />
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button onClick={() => { setEditingDeal(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={14} /> Thêm deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
          const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-72 rounded-xl kanban-column
                ${dragOver === stage.key ? "ring-2 ring-blue-400 " + stage.color : stage.color}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="px-3 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800">{stage.label}</span>
                  <span className="badge bg-white text-gray-600 shadow-sm">{stageDeals.length}</span>
                </div>
                <CurrencyDisplay value={stageValue} className="text-xs text-gray-500 mt-0.5" />
              </div>

              <div className="p-2 space-y-2">
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
                  <div className="text-center py-6 text-xs text-gray-400">Kéo deal vào đây</div>
                )}
              </div>
            </div>
          );
        })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Xóa deal?</h3>
            <p className="text-sm text-gray-600 mb-5">Bạn có chắc muốn xóa "<strong>{deleteTarget.name}</strong>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1" disabled={deleting}>Hủy</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger flex-1" disabled={deleting}>
                {deleting ? <LoadingSpinner size="sm" /> : null} Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {value}
    </div>
  );
}

function DealCard({ deal, onDragStart, onDragEnd, isDragging, onEdit, onDelete }) {
  const isOverdue = deal.expected_close && isPast(parseISO(deal.expected_close)) &&
    deal.stage !== "closed_won" && deal.stage !== "closed_lost";

  const probColor = deal.probability >= 60 ? "text-green-600 bg-green-50" :
    deal.probability >= 20 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab group
        ${isDragging ? "opacity-40" : "hover:shadow-md"} transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 line-clamp-1">{deal.name}</div>
          <div className="text-xs text-blue-600 mt-0.5">{deal.accounts?.name || "—"}</div>
        </div>
        <div className="hidden group-hover:flex gap-1">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
        </div>
      </div>

      {deal.product && <div className="text-xs text-gray-500 mt-1.5">{deal.product}</div>}

      <div className="flex items-center justify-between mt-2">
        <CurrencyDisplay value={deal.value} className="text-sm font-bold text-gray-900" />
        <span className={`badge text-xs ${probColor}`}>{deal.probability}%</span>
      </div>

      {deal.expected_close && (
        <div className={`text-xs mt-1.5 ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
          {isOverdue ? "⚠️ " : ""}Đóng: {deal.expected_close}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{deal ? "Sửa deal" : "Thêm deal"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div>
            <label className="label">Tên deal *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">Tài khoản *</label>
            <select value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))} className="input">
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sản phẩm</label>
              <input value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Giá trị (VND)</label>
              <input type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: parseInt(e.target.value) || 0 }))} className="input" />
            </div>
            <div>
              <label className="label">Giai đoạn</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} className="input">
                {STAGES_OPT.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Xác suất ({form.probability}%)</label>
              <input type="range" min={0} max={100} value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: parseInt(e.target.value) }))} className="w-full mt-2" />
            </div>
          </div>
          <div>
            <label className="label">Ngày đóng dự kiến</label>
            <input type="date" value={form.expected_close} onChange={(e) => setForm((f) => ({ ...f, expected_close: e.target.value }))} className="input" />
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
