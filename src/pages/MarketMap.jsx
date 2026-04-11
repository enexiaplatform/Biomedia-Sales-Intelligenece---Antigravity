import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchMarketSegments, createMarketSegment, updateMarketSegment, deleteMarketSegment,
  getMarketMatrixData, fetchAccounts, fetchMarketIntel
} from "../lib/supabase";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import MapMarker from "../components/MapMarker";
import { getCoordsByRegion, addJitter } from "../utils/geo";
import "leaflet/dist/leaflet.css";

const MATRIX_SEGMENTS = ["Pharma", "Industrial", "Government/Nonprofit", "Hospital", "Food & Beverage"];
const MATRIX_REGIONS = ["Hà Nội", "TP.HCM", "Miền Trung"];

const PENETRATION_CONFIG = {
  none: { label: "Chưa có", color: "bg-gray-100 text-gray-500" },
  low: { label: "Thấp", color: "bg-yellow-100 text-yellow-700" },
  medium: { label: "Trung bình", color: "bg-blue-100 text-blue-700" },
  high: { label: "Cao", color: "bg-green-100 text-green-700" }
};

const OPPORTUNITY_SIZES = ["Nhỏ", "Trung bình", "Lớn", "Rất lớn"];

/**
 * Formats value as VND currency for matrix
 */
const formatVND = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function MarketMap({ showToast }) {
  const [segments, setSegments] = useState([]);
  const [matrixData, setMatrixData] = useState({ accounts: [], deals: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("matrix");
  
  // Map specific state
  const [mapAccounts, setMapAccounts] = useState([]);
  const [mapIntel, setMapIntel] = useState([]);
  const [mapFilter, setMapFilter] = useState("all"); // all, accounts, intel

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [segsRes, matrixRes, accountsRes, intelRes] = await Promise.all([
        fetchMarketSegments(),
        getMarketMatrixData(),
        fetchAccounts(),
        fetchMarketIntel()
      ]);
      setSegments(segsRes.data || []);
      setMatrixData({
        accounts: matrixRes.accounts || [],
        deals: matrixRes.deals || [],
        segments: matrixRes.segments || []
      });

      // Process Accounts for Map
      const enrichedAccounts = (accountsRes.data || []).map(acc => ({
        ...acc,
        position: addJitter(getCoordsByRegion(acc.region), 0.08)
      }));
      setMapAccounts(enrichedAccounts);

      // Process Market Intel (Leads) for Map
      const enrichedIntel = (intelRes.data || []).map(intel => ({
        ...intel,
        position: addJitter(getCoordsByRegion(intel.region), 0.12)
      }));
      setMapIntel(enrichedIntel);
    } catch (err) {
      console.error("Error loading market data:", err);
      showToast("Lỗi khi tải dữ liệu thị trường", "error");
    } finally {
      setLoading(false);
    }
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
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 blur-3xl rounded-full -z-10" />

      {/* Navigation Header */}
      <div className="px-10 py-8 border-b border-gray-200 bg-white/80 backdrop-blur-2xl flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Market Pulse Matrix</h2>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Strategic Coverage & Competitiveness</p>
          </div>
          <div className="h-10 w-px bg-gray-200 hidden md:block" />
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                ${activeTab === "matrix" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}
            >
              Ma trận thị trường
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                ${activeTab === "map" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}
            >
              Bản đồ nhiệt
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                ${activeTab === "trends" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}
            >
              Xu hướng thị trường
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 scrollbar-hide animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full px-6 space-y-12">
          {activeTab === "matrix" && (
            <div className="space-y-10">
              <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border border-gray-200 shadow-sm">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-sm" />
                    Phân tích mật độ bao phủ
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 ml-4">Account Density × Regional Distribution</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {Object.entries(PENETRATION_CONFIG).map(([k, v]) => (
                    <span key={k} className={`badge text-[9px] font-black uppercase tracking-widest py-1.5 px-4 shadow-sm ${v.color}`}>{v.label}</span>
                  ))}
                </div>
              </div>

              <div className="table-container rounded-[3.5rem] border border-gray-200 bg-white overflow-hidden shadow-sm">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-64">Phân khúc khách hàng</th>
                      {MATRIX_REGIONS.map((r) => (
                        <th key={r} className="text-center">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MATRIX_SEGMENTS.map((seg) => (
                      <tr key={seg} className="group hover:bg-gray-50 transition-all">
                        <td className="px-8 py-10 font-black text-gray-800 uppercase text-xs tracking-widest bg-gray-50/50 border-r border-gray-100">{seg}</td>
                        {MATRIX_REGIONS.map((region) => {
                          const cell = getMatrixCell(seg, region);
                          const config = PENETRATION_CONFIG[cell.penetration];
                          return (
                            <td key={region} className={`px-4 py-8 text-center transition-all ${cell.isWhitespace ? "relative overflow-hidden" : ""}`}>
                              {cell.isWhitespace && <div className="absolute inset-0 bg-orange-50 animate-pulse pointer-events-none" />}
                              
                              <div className={`p-5 rounded-3xl transition-all duration-500 border ${cell.isWhitespace ? "border-orange-200 bg-orange-50 shadow-sm group-hover:scale-105" : "border-gray-100 bg-white group-hover:bg-white shadow-sm group-hover:shadow-md group-hover:-translate-y-1"}`}>
                                {cell.isWhitespace ? (
                                  <div className="space-y-1.5">
                                    <div className="text-orange-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-1.5">
                                      <AlertCircle size={12}/>
                                      White Space
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Cơ hội vàng</div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="font-black text-gray-900 text-lg tracking-tighter mb-1">
                                      {cell.count} <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Accounts</span>
                                    </div>
                                    {cell.dealValue > 0 && (
                                      <div className="px-3 py-1 bg-primary/10 rounded-xl border border-primary/20 inline-block font-black text-primary text-[10px] shadow-sm">
                                        {formatVND(cell.dealValue)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className={`badge mt-4 text-[8px] font-black uppercase tracking-widest py-1 px-3 shadow-sm ${config.color}`}>{config.label}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 px-8 py-5 bg-orange-50 border border-orange-200 rounded-full text-orange-600 text-[10px] font-black uppercase tracking-widest italic w-fit mx-auto shadow-sm">
                <AlertCircle size={14} className="animate-pulse" />
                Dữ liệu chỉ ra cơ hội thâm nhập tại các vùng trắng kinh tế
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="space-y-6 h-[700px] flex flex-col animate-fade-in">
              <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button 
                      onClick={() => setMapFilter("all")}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                        ${mapFilter === "all" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Tất cả
                    </button>
                    <button 
                      onClick={() => setMapFilter("accounts")}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                        ${mapFilter === "accounts" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Tài khoản
                    </button>
                    <button 
                      onClick={() => setMapFilter("intel")}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                        ${mapFilter === "intel" ? "bg-amber-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Cơ hội mới
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">
                  Hiển thị {mapAccounts.length + mapIntel.length} điểm dữ liệu chiến lược
                </div>
              </div>

              <div className="flex-1 rounded-[2.5rem] overflow-hidden border border-gray-200 shadow-sm relative">
                <MapContainer 
                  center={[16.0471, 108.2062]} 
                  zoom={6} 
                  zoomControl={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <ZoomControl position="bottomright" />
                  
                  {/* Biomedia Accounts */}
                  {(mapFilter === "all" || mapFilter === "accounts") && mapAccounts.map(acc => (
                    <MapMarker 
                      key={`acc-${acc.id}`}
                      position={acc.position}
                      type={acc.type}
                      data={acc}
                      isLead={false}
                    />
                  ))}

                  {/* Market Intel (Leads) */}
                  {(mapFilter === "all" || mapFilter === "intel") && mapIntel.map(intel => (
                    <MapMarker 
                      key={`intel-${intel.id}`}
                      position={intel.position}
                      type={intel.category}
                      data={intel}
                      isLead={true}
                    />
                  ))}
                </MapContainer>
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
                            <span className={`badge ${PENETRATION_CONFIG[seg.penetration]?.color || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {PENETRATION_CONFIG[seg.penetration]?.label || seg.penetration}
                            </span>
                          </td>
                          <td className="max-w-xs">
                            <p className="text-sm line-clamp-2 text-gray-600">{seg.trends || "—"}</p>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingSegment(seg); setModalOpen(true); }} className="text-gray-400 hover:text-primary transition-colors">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => setDeleteTarget(seg)} className="text-gray-400 hover:text-red-500 transition-colors">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
              <div className="rounded-xl shadow-xl p-6 max-w-sm w-full bg-white border border-gray-200">
                <h3 className="font-semibold mb-2 text-gray-900">Xóa phân khúc?</h3>
                <p className="text-sm mb-5 text-gray-600">Xóa "<strong>{deleteTarget.name}</strong>"?</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Hủy</button>
                  <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger flex-1">Xóa</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md bg-white border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-900">{segment ? "Sửa phân khúc" : "Thêm phân khúc"}</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 transition-colors">×</button>
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
