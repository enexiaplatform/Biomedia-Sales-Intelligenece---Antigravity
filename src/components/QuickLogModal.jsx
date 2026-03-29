import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import { fetchAccounts, fetchContacts, createInteraction } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";

const INTERACTION_TYPES = [
  { value: "call", label: "Cuộc gọi" },
  { value: "meeting", label: "Cuộc họp" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Demo sản phẩm" },
  { value: "proposal", label: "Gửi báo giá" },
  { value: "other", label: "Khác" }
];

export default function QuickLogModal({ open, onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    account_id: "",
    contact_id: "",
    type: "call",
    date: new Date().toISOString().slice(0, 16),
    summary: "",
    next_action: "",
    buying_signal: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetchAccounts().then(({ data }) => setAccounts(data || []));
    }
  }, [open]);

  useEffect(() => {
    if (form.account_id) {
      fetchContacts(form.account_id).then(({ data }) => setContacts(data || []));
    } else {
      setContacts([]);
      setForm((f) => ({ ...f, contact_id: "" }));
    }
  }, [form.account_id]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.account_id) return setError("Vui lòng chọn tài khoản");
    if (!form.summary.trim()) return setError("Vui lòng nhập tóm tắt");

    setSaving(true);
    const payload = {
      account_id: form.account_id,
      contact_id: form.contact_id || null,
      type: form.type,
      date: form.date,
      summary: form.summary,
      next_action: form.next_action || null,
      buying_signal: form.buying_signal || null
    };
    const { error: err } = await createInteraction(payload);
    setSaving(false);
    if (err) return setError(err.message);

    setForm({
      account_id: "",
      contact_id: "",
      type: "call",
      date: new Date().toISOString().slice(0, 16),
      summary: "",
      next_action: "",
      buying_signal: ""
    });
    onSuccess?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Ghi nhanh tương tác</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <label className="label">Tài khoản *</label>
            <select name="account_id" value={form.account_id} onChange={handleChange} className="input">
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Liên hệ</label>
            <select name="contact_id" value={form.contact_id} onChange={handleChange} className="input" disabled={!form.account_id}>
              <option value="">-- Không có --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.title ? `(${c.title})` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Loại</label>
              <select name="type" value={form.type} onChange={handleChange} className="input">
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ngày giờ</label>
              <input type="datetime-local" name="date" value={form.date} onChange={handleChange} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Tóm tắt *</label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Mô tả tóm tắt cuộc trao đổi..."
            />
          </div>

          <div>
            <label className="label">Hành động tiếp theo</label>
            <input
              type="text"
              name="next_action"
              value={form.next_action}
              onChange={handleChange}
              className="input"
              placeholder="Việc cần làm tiếp theo..."
            />
          </div>

          <div>
            <label className="label">Tín hiệu mua hàng</label>
            <input
              type="text"
              name="buying_signal"
              value={form.buying_signal}
              onChange={handleChange}
              className="input"
              placeholder="Tín hiệu tích cực từ khách hàng..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Hủy
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
