import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Download, Printer, ArrowLeft, Share2 } from "lucide-react";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchWorkflows, fetchAccounts, createWorkflow, updateWorkflow, deleteWorkflow
} from "../lib/supabase";

const WORKFLOW_TYPES = [
  "Sterility Testing",
  "Endotoxin Testing",
  "Environmental Monitoring",
  "Microbial Identification",
  "Custom"
];

const TEMPLATES = {
  "Sterility Testing": [
    { title: "Growth Promotion Test", description: "Kiểm tra tăng trưởng vi sinh để xác nhận chất lượng môi trường", products: [] },
    { title: "Sterility Test Media Preparation", description: "Chuẩn bị môi trường kiểm tra vô khuẩn", products: [] },
    { title: "Incubation & Observation", description: "Ủ mẫu và quan sát trong 14 ngày", products: [] },
    { title: "Result Documentation", description: "Ghi lại kết quả theo SOP", products: [] },
    { title: "Report Generation", description: "Lập báo cáo kết quả kiểm tra vô khuẩn", products: [] }
  ],
  "Endotoxin Testing": [
    { title: "Sample Preparation", description: "Chuẩn bị mẫu và pha loãng theo yêu cầu", products: [] },
    { title: "LAL Test Setup", description: "Thiết lập phản ứng LAL (Limulus Amebocyte Lysate)", products: [] },
    { title: "Reaction Monitoring", description: "Theo dõi phản ứng và đo kết quả", products: [] },
    { title: "Threshold Documentation", description: "So sánh kết quả với ngưỡng cho phép", products: [] },
    { title: "Result Compilation", description: "Tổng hợp và đánh giá kết quả nội độc tố", products: [] }
  ],
  "Environmental Monitoring": [
    { title: "Sampling Location Setup", description: "Xác định và chuẩn bị điểm lấy mẫu môi trường", products: [] },
    { title: "Culture Media Placement", description: "Đặt đĩa môi trường tại các vị trí theo kế hoạch", products: [] },
    { title: "Incubation Period", description: "Ủ đĩa trong 48-72 giờ theo nhiệt độ quy định", products: [] },
    { title: "Colony Counting", description: "Đếm khuẩn lạc và ghi nhận kết quả", products: [] },
    { title: "Analysis & Trending", description: "Phân tích xu hướng và so sánh với giới hạn hành động", products: [] }
  ],
  "Microbial Identification": [
    { title: "Colony Morphology Assessment", description: "Đánh giá hình thái khuẩn lạc", products: [] },
    { title: "Biochemical Testing", description: "Thực hiện kiểm tra hóa sinh để định danh", products: [] },
    { title: "MALDI-TOF (if available)", description: "Định danh bằng phổ khối nếu có thiết bị", products: [] },
    { title: "Identification Confirmation", description: "Xác nhận kết quả định danh vi sinh vật", products: [] },
    { title: "Result Reporting", description: "Lập báo cáo kết quả định danh", products: [] }
  ],
  "Custom": []
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function Workflows({ showToast }) {
  const [workflows, setWorkflows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [filterAccountId, setFilterAccountId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [wfRes, accRes] = await Promise.all([fetchWorkflows(), fetchAccounts()]);
    setWorkflows(wfRes.data || []);
    setAccounts(accRes.data || []);
    setLoading(false);
  }

  async function handleDelete(id) {
    const { error } = await deleteWorkflow(id);
    if (error) showToast(error.message, "error");
    else {
      setWorkflows((p) => p.filter((w) => w.id !== id));
      showToast("Đã xóa quy trình");
    }
  }

  function handleExport(wf) {
    const json = JSON.stringify(wf, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wf.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = filterAccountId
    ? workflows.filter((w) => w.account_id === filterAccountId)
    : workflows;

  if (loading) return <PageLoader />;

  if (editingWorkflow !== null) {
    return (
      <WorkflowEditor
        workflow={editingWorkflow.id ? editingWorkflow : null}
        accounts={accounts}
        onBack={() => setEditingWorkflow(null)}
        onSave={async (form) => {
          if (editingWorkflow.id) {
            const { data } = await updateWorkflow(editingWorkflow.id, form);
            if (data) {
              setWorkflows((p) => p.map((w) => (w.id === data.id ? { ...w, ...data } : w)));
              showToast("Đã cập nhật quy trình");
            }
          } else {
            const { data } = await createWorkflow(form);
            if (data) {
              setWorkflows((p) => [data, ...p]);
              showToast("Đã tạo quy trình");
            }
          }
          setEditingWorkflow(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-glow-sm">
            <Share2 className="text-blue-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">QUY TRÌNH</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Sales Process Management</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
          className="input w-auto"
        >
          <option value="">Tất cả tài khoản</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <div className="flex-1" />

        <button onClick={() => setEditingWorkflow({})} className="btn-primary">
          <Plus size={14} /> Tạo quy trình
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--text-2)' }}>
          Chưa có quy trình nào.
          <button onClick={() => setEditingWorkflow({})} className="block mx-auto mt-3 btn-primary text-sm">
            Tạo quy trình đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wf) => (
            <div key={wf.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{wf.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{wf.type}</div>
                  {wf.accounts?.name && (
                    <div className="text-xs text-blue-600 mt-0.5">{wf.accounts.name}</div>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs" style={{ color: 'var(--text-2)' }}>
                {(wf.steps || []).length} bước
              </div>

              <div className="flex gap-1 mt-3 flex-wrap">
                <button onClick={() => setEditingWorkflow(wf)} className="btn-secondary text-xs">
                  <Edit2 size={11} /> Sửa
                </button>
                <button onClick={() => handleExport(wf)} className="btn-secondary text-xs">
                  <Download size={11} /> JSON
                </button>
                <button
                  onClick={() => handleDelete(wf.id)}
                  className="p-1.5 hover:text-red-600"
                  style={{ color: 'var(--text-2)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowEditor({ workflow, accounts, onBack, onSave }) {
  const [form, setForm] = useState({
    name: workflow?.name || "",
    type: workflow?.type || "Custom",
    account_id: workflow?.account_id || "",
    steps: workflow?.steps ? (Array.isArray(workflow.steps) ? workflow.steps : []) : [],
    notes: workflow?.notes || ""
  });
  const [saving, setSaving] = useState(false);

  function handleTypeChange(type) {
    const template = TEMPLATES[type] || [];
    setForm((f) => ({
      ...f,
      type,
      steps: template.length > 0
        ? template.map((step) => ({ ...step, id: generateId() }))
        : f.steps
    }));
  }

  function addStep() {
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { id: generateId(), title: "", description: "", products: [] }]
    }));
  }

  function updateStep(id, field, value) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    }));
  }

  function removeStep(id) {
    setForm((f) => ({ ...f, steps: f.steps.filter((s) => s.id !== id) }));
  }

  function moveStep(id, dir) {
    setForm((f) => {
      const steps = [...f.steps];
      const idx = steps.findIndex((s) => s.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= steps.length) return f;
      [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
      return { ...f, steps };
    });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      account_id: form.account_id || null,
      steps: form.steps
    });
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>
          {workflow ? "Sửa quy trình" : "Tạo quy trình mới"}
        </h2>
      </div>

      <div className="card p-5 space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tên quy trình *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="VD: Quy trình kiểm tra vô khuẩn - Pharma ABC"
            />
          </div>
          <div>
            <label className="label">Loại quy trình</label>
            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="input"
            >
              {WORKFLOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tài khoản liên kết</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
              className="input"
            >
              <option value="">-- Không có --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="input"
            />
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Các bước ({form.steps.length})</h3>
            <button onClick={addStep} className="btn-secondary text-sm">
              <Plus size={13} /> Thêm bước
            </button>
          </div>

          {form.steps.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-xl text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
              Chưa có bước nào. Chọn loại quy trình để tải template hoặc thêm thủ công.
            </div>
          ) : (
            <div className="space-y-3">
              {form.steps.map((step, idx) => (
                <div key={step.id} className="rounded-lg p-4" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <button
                        onClick={() => moveStep(step.id, -1)}
                        disabled={idx === 0}
                        className="hover:text-red-500 disabled:opacity-30 transition-colors"
                        style={{ color: 'var(--text-2)' }}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveStep(step.id, 1)}
                        disabled={idx === form.steps.length - 1}
                        className="hover:text-red-500 disabled:opacity-30 transition-colors"
                        style={{ color: 'var(--text-2)' }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        value={step.title}
                        onChange={(e) => updateStep(step.id, "title", e.target.value)}
                        className="input text-sm font-medium"
                        placeholder="Tên bước..."
                      />
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(step.id, "description", e.target.value)}
                        rows={2}
                        className="input text-sm"
                        placeholder="Mô tả chi tiết bước này..."
                      />
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-2)' }}>Sản phẩm liên kết</label>
                        <input
                          value={(step.products || []).join(", ")}
                          onChange={(e) =>
                            updateStep(step.id, "products", e.target.value.split(",").map((p) => p.trim()).filter(Boolean))
                          }
                          className="input text-sm"
                          placeholder="Tên sản phẩm, cách nhau bởi dấu phẩy..."
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(step.products || []).map((p, i) => (
                            <span key={i} className="badge bg-blue-50 text-blue-700 text-xs">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(step.id)}
                      className="hover:text-red-500 mt-1 transition-colors"
                      style={{ color: 'var(--text-2)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onBack} className="btn-secondary flex-1">Hủy</button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving || !form.name.trim()}>
            {saving ? <LoadingSpinner size="sm" /> : null}
            {workflow ? "Cập nhật" : "Tạo quy trình"}
          </button>
        </div>
      </div>
    </div>
  );
}
