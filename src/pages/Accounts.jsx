import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, LayoutGrid, List, Edit2, Trash2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import ScoreBadge from "../components/ScoreBadge";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from "../lib/supabase";

const ACCOUNT_TYPES = ["pharma", "lab", "hospital", "f&b", "university", "other"];
const REGIONS = ["Hà Nội", "TP.HCM", "Miền Trung", "Miền Nam", "Miền Bắc"];
const SIZES = ["small", "medium", "large", "enterprise"];

export default function Accounts({ showToast }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [filters, setFilters] = useState({ type: "", region: "", scoreMin: 0, scoreMax: 10, search: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAccounts(filters);
    if (error) setError(error.message);
    else setAccounts(data || []);
    setLoading(false);
  }

  async function handleSearch() {
    setLoading(true);
    const { data, error } = await fetchAccounts(filters);
    if (error) setError(error.message);
    else setAccounts(data || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(handleSearch, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  async function handleDelete(id) {
    setDeleting(true);
    const { error } = await deleteAccount(id);
    if (error) showToast(error.message, "error");
    else {
      showToast("Đã xóa tài khoản");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản..."
            className="input pl-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="input w-auto"
        >
          <option value="">Tất cả loại</option>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
          className="input w-auto"
        >
          <option value="">Tất cả khu vực</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded ${view === "grid" ? "bg-white shadow-sm" : ""}`}
          >
            <LayoutGrid size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded ${view === "list" ? "bg-white shadow-sm" : ""}`}
          >
            <List size={16} className="text-gray-600" />
          </button>
        </div>

        <button
          onClick={() => { setEditingAccount(null); setModalOpen(true); }}
          className="btn-primary"
        >
          <Plus size={14} /> Thêm tài khoản
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : accounts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 text-sm mb-3">Không có tài khoản nào</div>
          <button onClick={() => { setEditingAccount(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={14} /> Thêm tài khoản đầu tiên
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={() => { setEditingAccount(acc); setModalOpen(true); }}
              onDelete={() => setDeleteTarget(acc)}
              onClick={() => navigate(`/accounts/${acc.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="card table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Khu vực</th>
                <th>Loại</th>
                <th>Điểm</th>
                <th>Liên hệ</th>
                <th>Deal</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <Link to={`/accounts/${acc.id}`} className="font-medium text-blue-600 hover:underline">
                      {acc.name}
                    </Link>
                  </td>
                  <td>{acc.region || "—"}</td>
                  <td><span className="badge bg-gray-100 text-gray-700">{acc.type}</span></td>
                  <td><ScoreBadge score={acc.score} /></td>
                  <td>{acc.contacts?.[0]?.count ?? 0}</td>
                  <td>{acc.deals?.[0]?.count ?? 0}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingAccount(acc); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(acc)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Account Modal */}
      {modalOpen && (
        <AccountModal
          account={editingAccount}
          onClose={() => setModalOpen(false)}
          onSave={(saved) => {
            if (editingAccount) {
              setAccounts((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
              showToast("Đã cập nhật tài khoản");
            } else {
              setAccounts((prev) => [saved, ...prev]);
              showToast("Đã thêm tài khoản");
            }
            setModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-gray-600 mb-5">
              Bạn có chắc muốn xóa tài khoản <strong>{deleteTarget.name}</strong>? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1" disabled={deleting}>
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="btn-danger flex-1" disabled={deleting}>
                {deleting ? <LoadingSpinner size="sm" /> : null}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onEdit, onDelete, onClick }) {
  return (
    <div className="card p-4 cursor-pointer hover:shadow-md transition-shadow group relative">
      <div onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{account.name}</h3>
            <div className="text-xs text-gray-500 mt-0.5">{account.region || "—"}</div>
          </div>
          <ScoreBadge score={account.score} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="badge bg-blue-50 text-blue-700">{account.type}</span>
          {account.segment && <span className="badge bg-purple-50 text-purple-700">{account.segment}</span>}
        </div>

        <div className="flex gap-4 text-xs text-gray-500">
          <span>{account.contacts?.[0]?.count ?? 0} liên hệ</span>
          <span>{account.deals?.[0]?.count ?? 0} deal</span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 bg-white border border-gray-200 rounded text-gray-500 hover:text-blue-600 shadow-sm"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 bg-white border border-gray-200 rounded text-gray-500 hover:text-red-600 shadow-sm"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function AccountModal({ account, onClose, onSave }) {
  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "pharma",
    segment: account?.segment || "",
    region: account?.region || "",
    size: account?.size || "",
    website: account?.website || "",
    address: account?.address || "",
    score: account?.score ?? 5,
    score_reason: account?.score_reason || "",
    pain_points: account?.pain_points || "",
    budget_cycle: account?.budget_cycle || "",
    buying_process: account?.buying_process || "",
    current_needs: account?.current_needs || "",
    notes: account?.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "score" ? parseInt(value) : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Tên tài khoản là bắt buộc");
    setSaving(true);
    const fn = account ? updateAccount(account.id, form) : createAccount(form);
    const { data, error: err } = await fn;
    setSaving(false);
    if (err) return setError(err.message);
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            {account ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Tên tài khoản *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Tên công ty..." />
            </div>
            <div>
              <label className="label">Loại</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select name="region" value={form.region} onChange={handleChange} className="input">
                <option value="">-- Chọn khu vực --</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phân khúc</label>
              <input name="segment" value={form.segment} onChange={handleChange} className="input" placeholder="VD: Pharma QC" />
            </div>
            <div>
              <label className="label">Quy mô</label>
              <select name="size" value={form.size} onChange={handleChange} className="input">
                <option value="">-- Chọn quy mô --</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Website</label>
              <input name="website" value={form.website} onChange={handleChange} className="input" placeholder="https://..." />
            </div>
            <div>
              <label className="label">Điểm ({form.score}/10)</label>
              <input type="range" min={0} max={10} name="score" value={form.score} onChange={handleChange} className="w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Địa chỉ</label>
              <input name="address" value={form.address} onChange={handleChange} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lý do điểm</label>
              <input name="score_reason" value={form.score_reason} onChange={handleChange} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Điểm đau</label>
              <textarea name="pain_points" value={form.pain_points} onChange={handleChange} rows={2} className="input" />
            </div>
            <div>
              <label className="label">Chu kỳ ngân sách</label>
              <input name="budget_cycle" value={form.budget_cycle} onChange={handleChange} className="input" placeholder="VD: Q1, Q3 hàng năm" />
            </div>
            <div>
              <label className="label">Quy trình mua hàng</label>
              <input name="buying_process" value={form.buying_process} onChange={handleChange} className="input" placeholder="VD: Đấu thầu công khai" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nhu cầu hiện tại</label>
              <textarea name="current_needs" value={form.current_needs} onChange={handleChange} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ghi chú</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="input" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {account ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
