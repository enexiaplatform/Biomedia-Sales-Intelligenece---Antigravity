import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchMarketSegments, createMarketSegment, updateMarketSegment, deleteMarketSegment,
  getMarketMatrixData
} from "../lib/supabase";

const MATRIX_SEGMENTS = ["Pharma QC", "Lab Chemicals", "F&B Testing", "Pharma Manufacturing"];
const MATRIX_REGIONS = ["Hà Nội", "TP.HCM", "Miền Trung"];

const PENETRATION_CONFIG = {
  none: { label: "Chưa có", color: "bg-gray-100 text-gray-500" },
  low: { label: "Thấp", color: "bg-yellow-100 text-yellow-700" },
  medium: { label: "Trung bình", color: "bg-blue-100 text-blue-700" },
  high: { label: "Cao", color: "bg-green-100 text-green-700" }
};

const OPPORTUNITY_SIZES = ["Nhỏ", "Trung bình", "Lớn", "Rất lớn"];

export default function MarketMap({ showToast }) {
  const [segments, setSegments] = useState([]);
  const [matrixData, setMatrixData] = useState({ accounts: [], deals: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("matrix");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [segsRes, matrixRes] = await Promise.all([
      fetchMarketSegments(),
      getMarketMatrixData()
    ]);
    setSegments(segsRes.data || []);
    setMatrixData({
      accounts: matrixRes.accounts || [],
      deals: matrixRes.deals || [],
      segments: matrixRes.segments || []
    });
    setLoading(false);
  }

  function getMatrixCell(segment, region) {
    const accs = matrixData.accounts.filter(
      (a) => a.segment?.toLowerCase().includes(segment.toLowerCase()) && a.region === region
    );
    const dealValue = matrixData.deals
      .filter((d) => accs.some((a) => a.id === d.account_id))
      .reduce((sum, d) => sum + (d.value || 0), 0);

    const dbSegment = matrixData.segments.find(
      (s) => s.name?.toLowerCase().includes(segment.toLowerCase()) && s.region === region
    );

    return { count: accs.length, dealValue, penetration: dbSegment?.penetration || "none", isWhitespace: accs.length === 0 };
  }

  async function handleDelete(id) {
    const { error } = await deleteMarketSegment(id);
    if (error) showToast(error.message, "error");
    else {
      setSegments((prev) => prev.filter((s) => s.id !== id));
      showToast("Đã xóa phân khúc");
    }
    setDeleteTarget(null);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "matrix" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}
        >
          Ma trận thị trường
        </button>
        <button
          onClick={() => setActiveTab("trends")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === "trends" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700"}`}
        >
          Xu hướng thị trường
        </button>
      </div>

      {activeTab === "matrix" && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Ma trận phân khúc × khu vực</h3>
            <div className="flex items-center gap-3 text-xs">
              {Object.entries(PENETRATION_CONFIG).map(([k, v]) => (
                <span key={k} className={`badge ${v.color}`}>{v.label}</span>
              ))}
            </div>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-40">Phân khúc</th>
                {MATRIX_REGIONS.map((r) => (
                  <th key={r} className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MATRIX_SEGMENTS.map((seg) => (
                <tr key={seg}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{seg}</td>
                  {MATRIX_REGIONS.map((region) => {
                    const cell = getMatrixCell(seg, region);
                    const config = PENETRATION_CONFIG[cell.penetration];
                    return (
                      <td key={region} className={`px-4 py-3 text-center ${cell.isWhitespace ? "bg-orange-50" : ""}`}>
                        <div className={`inline-block px-2 py-1 rounded-lg text-xs ${cell.isWhitespace ? "border-2 border-dashed border-orange-300" : ""}`}>
                          {cell.isWhitespace ? (
                            <div className="text-orange-500 font-medium">💡 Cơ hội</div>
                          ) : (
                            <>
                              <div className="font-semibold text-gray-900">{cell.count} TK</div>
                              {cell.dealValue > 0 && (
                                <CurrencyDisplay value={cell.dealValue} className="text-xs text-gray-500" />
                              )}
                            </>
                          )}
                          <span className={`badge mt-1 ${config.color}`}>{config.label}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-orange-50 border-t text-xs text-orange-700 flex items-center gap-1">
            <AlertCircle size={13} /> Ô màu cam là vùng trắng — cơ hội chưa khai thác
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingSegment(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={14} /> Thêm phân khúc
            </button>
          </div>

          {segments.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              Chưa có phân khúc nào. Thêm phân khúc để theo dõi xu hướng.
            </div>
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên phân khúc</th>
                    <th>Khu vực</th>
                    <th>Quy mô cơ hội</th>
                    <th>Độ thâm nhập</th>
                    <th>Xu hướng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg) => (
                    <tr key={seg.id}>
                      <td className="font-medium">{seg.name}</td>
                      <td>{seg.region}</td>
                      <td>{seg.opportunity_size || "—"}</td>
                      <td>
                        <span className={`badge ${PENETRATION_CONFIG[seg.penetration]?.color || "bg-gray-100 text-gray-600"}`}>
                          {PENETRATION_CONFIG[seg.penetration]?.label || seg.penetration}
                        </span>
                      </td>
                      <td className="max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">{seg.trends || "—"}</p>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingSegment(seg); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(seg)} className="text-gray-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <SegmentModal
          segment={editingSegment}
          onClose={() => setModalOpen(false)}
          onSave={(saved) => {
            if (editingSegment) setSegments((p) => p.map((s) => (s.id === saved.id ? saved : s)));
            else setSegments((p) => [...p, saved]);
            setModalOpen(false);
            showToast(editingSegment ? "Đã cập nhật" : "Đã thêm phân khúc");
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Xóa phân khúc?</h3>
            <p className="text-sm text-gray-600 mb-5">Xóa "<strong>{deleteTarget.name}</strong>"?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Hủy</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger flex-1">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentModal({ segment, onClose, onSave }) {
  const [form, setForm] = useState({
    name: segment?.name || "",
    region: segment?.region || "",
    opportunity_size: segment?.opportunity_size || "",
    penetration: segment?.penetration || "none",
    trends: segment?.trends || "",
    notes: segment?.notes || ""
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fn = segment ? updateMarketSegment(segment.id, form) : createMarketSegment(form);
    const { data } = await fn;
    setSaving(false);
    if (data) onSave(data);
  }

  const REGIONS = ["Hà Nội", "TP.HCM", "Miền Trung", "Miền Nam", "Miền Bắc", "Toàn quốc"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{segment ? "Sửa phân khúc" : "Thêm phân khúc"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tên phân khúc *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Khu vực *</label>
              <select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="input" required>
                <option value="">--</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quy mô cơ hội</label>
              <select value={form.opportunity_size} onChange={(e) => setForm((f) => ({ ...f, opportunity_size: e.target.value }))} className="input">
                <option value="">--</option>
                {OPPORTUNITY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Độ thâm nhập</label>
            <select value={form.penetration} onChange={(e) => setForm((f) => ({ ...f, penetration: e.target.value }))} className="input">
              {Object.entries(PENETRATION_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Xu hướng thị trường</label>
            <textarea value={form.trends} onChange={(e) => setForm((f) => ({ ...f, trends: e.target.value }))} rows={3} className="input" placeholder="Mô tả xu hướng..." />
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
