import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Edit2, Trash2, Plus, Brain, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import ScoreBadge from "../components/ScoreBadge";
import RoleTagBadge from "../components/RoleTagBadge";
import CurrencyDisplay from "../components/CurrencyDisplay";
import { PageLoader } from "../components/LoadingSpinner";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  fetchAccountById, updateAccount, deleteAccount,
  fetchContacts, createContact, updateContact, deleteContact,
  fetchInteractions, createInteraction, deleteInteraction,
  fetchDeals, createDeal, updateDeal, deleteDeal,
  fetchWorkflows,
  fetchOrgNodes, fetchInfluenceLinks
} from "../lib/supabase";
import OrgChartView from "../components/OrgChart";
import { callAISalesCoach } from "../lib/ai";

const TABS = ["Tổng quan", "Liên hệ", "Sơ đồ tổ chức", "Tương tác", "Deals", "Quy trình"];

const DEAL_STAGES = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
const STAGE_LABELS = { prospect: "Tiềm năng", qualified: "Đã xác nhận", proposal: "Báo giá", negotiation: "Đàm phán", closed_won: "Thắng", closed_lost: "Thua" };
const INTERACTION_TYPES = [
  { value: "call", label: "Gọi điện" },
  { value: "meeting", label: "Cuộc họp" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Báo giá" },
  { value: "other", label: "Khác" }
];
const CONTACT_ROLES = ["decision_maker", "influencer", "user", "gatekeeper"];

export default function AccountDetail({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [deals, setDeals] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [orgNodes, setOrgNodes] = useState([]);
  const [influenceLinks, setInfluenceLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Tổng quan");
  const [editOpen, setEditOpen] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Modals
  const [contactModal, setContactModal] = useState(null);
  const [interactionModal, setInteractionModal] = useState(null);
  const [dealModal, setDealModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [accRes, contRes, intRes, dealRes, wfRes, orgRes, linkRes] = await Promise.all([
      fetchAccountById(id),
      fetchContacts(id),
      fetchInteractions(id),
      fetchDeals(id),
      fetchWorkflows(id),
      fetchOrgNodes(id),
      fetchInfluenceLinks(id)
    ]);
    setAccount(accRes.data);
    setContacts(contRes.data || []);
    setInteractions(intRes.data || []);
    setDeals(dealRes.data || []);
    setWorkflows(wfRes.data || []);
    setOrgNodes(orgRes.data || []);
    setInfluenceLinks(linkRes.data || []);
    setLoading(false);
  }

  async function handleGenerateBriefing() {
    setBriefingLoading(true);
    setBriefing("");
    try {
      const context = {
        account,
        history: []
      };
      const message = `Hãy tóm tắt tài khoản ${account?.name}: các liên hệ chính, điểm đau, deals hiện tại và bước tiếp theo cần làm.`;
      const reply = await callAISalesCoach(message, context);
      setBriefing(reply);
    } catch (err) {
      setBriefing("Lỗi: " + err.message);
    }
    setBriefingLoading(false);
  }

  async function handleDeleteAccount() {
    const { error } = await deleteAccount(id);
    if (error) showToast(error.message, "error");
    else {
      showToast("Đã xóa tài khoản");
      navigate("/accounts");
    }
  }

  if (loading) return <PageLoader />;

  if (!account) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-[#B0B0B0] mb-4">Không tìm thấy tài khoản</p>
        <Link to="/accounts" className="btn-secondary">← Quay lại</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate("/accounts")} className="mt-1 text-[#707070] hover:text-[#B0B0B0]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#F0F0F0]">{account.name}</h1>
            <span className="badge bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/20">{account.type}</span>
            <ScoreBadge score={account.score} />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-[#B0B0B0] flex-wrap">
            {account.region && <span>{account.region}</span>}
            {account.website && (
              <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink size={12} /> Website
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="btn-secondary">
            <Edit2 size={14} /> Sửa
          </button>
          <button onClick={() => setDeleteConfirm("account")} className="btn-danger">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${tab === t ? "border-[#8B0000] text-[#8B0000]" : "border-transparent text-[#707070] hover:text-[#B0B0B0]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "Tổng quan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-[#F0F0F0]">Thông tin công ty</h3>
            <InfoRow label="Địa chỉ" value={account.address} />
            <InfoRow label="Phân khúc" value={account.segment} />
            <InfoRow label="Quy mô" value={account.size} />
            <InfoRow label="Chu kỳ ngân sách" value={account.budget_cycle} />
            <InfoRow label="Quy trình mua hàng" value={account.buying_process} />
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-[#F0F0F0]">Đánh giá</h3>
            <div>
              <div className="label">Điểm tài khoản: <ScoreBadge score={account.score} /></div>
              {account.score_reason && <p className="text-sm text-[#B0B0B0] mt-1">{account.score_reason}</p>}
            </div>
            <InfoRow label="Điểm đau" value={account.pain_points} />
            <InfoRow label="Nhu cầu hiện tại" value={account.current_needs} />
            {account.notes && (
              <div>
                <div className="label">Ghi chú</div>
                <p className="text-sm text-gray-700">{account.notes}</p>
              </div>
            )}
          </div>

          {/* AI Briefing */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Brain size={16} className="text-purple-600" />
                AI Account Briefing
              </h3>
              <button onClick={handleGenerateBriefing} disabled={briefingLoading} className="btn-primary text-sm">
                {briefingLoading ? <LoadingSpinner size="sm" /> : <Brain size={14} />}
                {briefingLoading ? "Đang tạo..." : "Tạo briefing"}
              </button>
            </div>
            {briefing ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{briefing}</div>
            ) : (
              <p className="text-sm text-gray-400">Nhấn "Tạo briefing" để AI phân tích tài khoản này</p>
            )}
          </div>
        </div>
      )}

      {tab === "Liên hệ" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">{contacts.length} liên hệ</h3>
            <button onClick={() => setContactModal({})} className="btn-primary text-sm">
              <Plus size={14} /> Thêm liên hệ
            </button>
          </div>
          {contacts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Chưa có liên hệ nào</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                      {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setContactModal(c)} className="text-gray-400 hover:text-blue-600">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: "contact", item: c })} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <RoleTagBadge role={c.role} />
                    {c.email && <div className="text-xs text-[#707070]">{c.email}</div>}
                    {c.phone && <div className="text-xs text-[#707070]">{c.phone}</div>}
                    {c.notes && <div className="text-xs text-[#707070] italic mt-1">{c.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Sơ đồ tổ chức" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Bản đồ quan hệ (Stakeholder Map)</h3>
            <Link to="/bd-tool" className="btn-secondary text-sm">Quản lý nâng cao</Link>
          </div>
          <OrgChartView 
            nodes={orgNodes} 
            links={influenceLinks} 
            onEditNode={() => navigate("/bd-tool")} 
          />
        </div>
      )}

      {tab === "Tương tác" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">{interactions.length} tương tác</h3>
            <button onClick={() => setInteractionModal({})} className="btn-primary text-sm">
              <Plus size={14} /> Thêm
            </button>
          </div>
          {interactions.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Chưa có tương tác nào</div>
          ) : (
            <div className="space-y-3">
              {interactions.map((intr) => (
                <div key={intr.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge bg-blue-50 text-blue-700 text-xs">
                          {INTERACTION_TYPES.find((t) => t.value === intr.type)?.label || intr.type}
                        </span>
                        {intr.contacts?.name && (
                          <span className="text-xs text-gray-500">· {intr.contacts.name}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {intr.date ? format(parseISO(intr.date), "dd/MM/yyyy HH:mm") : ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mt-2">{intr.summary}</p>
                      {intr.next_action && (
                        <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded mt-1">
                          → {intr.next_action}
                        </p>
                      )}
                      {intr.buying_signal && (
                        <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-1">
                          🎯 {intr.buying_signal}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteConfirm({ type: "interaction", item: intr })}
                      className="text-gray-400 hover:text-red-600 ml-3"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Deals" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">{deals.length} deals</h3>
            <button onClick={() => setDealModal({})} className="btn-primary text-sm">
              <Plus size={14} /> Thêm deal
            </button>
          </div>
          {deals.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Chưa có deal nào</div>
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên deal</th>
                    <th>Sản phẩm</th>
                    <th>Giá trị</th>
                    <th>Giai đoạn</th>
                    <th>Xác suất</th>
                    <th>Ngày đóng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium">{d.name}</td>
                      <td>{d.product || "—"}</td>
                      <td><CurrencyDisplay value={d.value} /></td>
                      <td>
                        <span className={`badge text-xs ${d.stage === "closed_won" ? "bg-green-100 text-green-700" : d.stage === "closed_lost" ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                          {STAGE_LABELS[d.stage] || d.stage}
                        </span>
                      </td>
                      <td>{d.probability}%</td>
                      <td>{d.expected_close || "—"}</td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => setDealModal(d)} className="text-gray-400 hover:text-blue-600">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: "deal", item: d })} className="text-gray-400 hover:text-red-600">
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

      {tab === "Quy trình" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">{workflows.length} quy trình</h3>
            <Link to="/workflows" className="btn-secondary text-sm">Quản lý quy trình</Link>
          </div>
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Chưa có quy trình nào liên kết</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workflows.map((wf) => (
                <div key={wf.id} className="card p-4">
                  <div className="font-medium text-gray-900 text-sm">{wf.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{wf.type} · {(wf.steps || []).length} bước</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Account Modal */}
      {editOpen && (
        <AccountEditModal
          account={account}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => {
            setAccount(updated);
            setEditOpen(false);
            showToast("Đã cập nhật tài khoản");
          }}
        />
      )}

      {/* Contact Modal */}
      {contactModal !== null && (
        <ContactModal
          contact={contactModal.id ? contactModal : null}
          accountId={id}
          onClose={() => setContactModal(null)}
          onSave={(saved) => {
            if (contactModal.id) setContacts((p) => p.map((c) => (c.id === saved.id ? saved : c)));
            else setContacts((p) => [...p, saved]);
            setContactModal(null);
            showToast(contactModal.id ? "Đã cập nhật liên hệ" : "Đã thêm liên hệ");
          }}
        />
      )}

      {/* Interaction Modal */}
      {interactionModal !== null && (
        <InteractionModal
          accountId={id}
          contacts={contacts}
          onClose={() => setInteractionModal(null)}
          onSave={(saved) => {
            setInteractions((p) => [saved, ...p]);
            setInteractionModal(null);
            showToast("Đã thêm tương tác");
          }}
        />
      )}

      {/* Deal Modal */}
      {dealModal !== null && (
        <DealModal
          deal={dealModal.id ? dealModal : null}
          accountId={id}
          onClose={() => setDealModal(null)}
          onSave={(saved) => {
            if (dealModal.id) setDeals((p) => p.map((d) => (d.id === saved.id ? saved : d)));
            else setDeals((p) => [saved, ...p]);
            setDealModal(null);
            showToast(dealModal.id ? "Đã cập nhật deal" : "Đã thêm deal");
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <DeleteConfirmModal
          message={
            deleteConfirm === "account"
              ? `Xóa tài khoản "${account.name}"? Không thể hoàn tác.`
              : `Xóa ${deleteConfirm.type === "contact" ? "liên hệ" : deleteConfirm.type === "interaction" ? "tương tác" : "deal"} này?`
          }
          onConfirm={async () => {
            if (deleteConfirm === "account") {
              await handleDeleteAccount();
            } else if (deleteConfirm.type === "contact") {
              await deleteContact(deleteConfirm.item.id);
              setContacts((p) => p.filter((c) => c.id !== deleteConfirm.item.id));
              showToast("Đã xóa liên hệ");
            } else if (deleteConfirm.type === "interaction") {
              await deleteInteraction(deleteConfirm.item.id);
              setInteractions((p) => p.filter((i) => i.id !== deleteConfirm.item.id));
              showToast("Đã xóa tương tác");
            } else if (deleteConfirm.type === "deal") {
              await deleteDeal(deleteConfirm.item.id);
              setDeals((p) => p.filter((d) => d.id !== deleteConfirm.item.id));
              showToast("Đã xóa deal");
            }
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 uppercase">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

function DeleteConfirmModal({ message, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-semibold text-[#F0F0F0] mb-3">Xác nhận xóa</h3>
        <p className="text-sm text-[#B0B0B0] mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>Hủy</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} className="btn-danger flex-1" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : null} Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountEditModal({ account, onClose, onSave }) {
  const [form, setForm] = useState({ ...account });
  const [saving, setSaving] = useState(false);
  const REGIONS = ["Hà Nội", "TP.HCM", "Miền Trung", "Miền Nam", "Miền Bắc"];

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await updateAccount(account.id, form);
    setSaving(false);
    if (!error) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Chỉnh sửa: {account.name}</h2>
          <button onClick={onClose} className="text-[#707070] text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Tên</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select value={form.region || ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="input">
                <option value="">--</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Điểm ({form.score}/10)</label>
              <input type="range" min={0} max={10} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: parseInt(e.target.value) }))} className="w-full mt-2" />
            </div>
            <div className="col-span-2">
              <label className="label">Điểm đau</label>
              <textarea value={form.pain_points || ""} onChange={(e) => setForm((f) => ({ ...f, pain_points: e.target.value }))} rows={2} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Nhu cầu hiện tại</label>
              <textarea value={form.current_needs || ""} onChange={(e) => setForm((f) => ({ ...f, current_needs: e.target.value }))} rows={2} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Ghi chú</label>
              <textarea value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input" />
            </div>
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

function ContactModal({ contact, accountId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: contact?.name || "", title: contact?.title || "",
    email: contact?.email || "", phone: contact?.phone || "",
    role: contact?.role || "user", notes: contact?.notes || "",
    account_id: accountId
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fn = contact ? updateContact(contact.id, form) : createContact(form);
    const { data } = await fn;
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{contact ? "Sửa liên hệ" : "Thêm liên hệ"}</h2>
          <button onClick={onClose} className="text-[#707070] text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="label">Họ tên *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">Chức vụ</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Điện thoại</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Vai trò</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input">
              {CONTACT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input" />
          </div>
          <div className="flex gap-3 pt-1">
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

function InteractionModal({ accountId, contacts, onClose, onSave }) {
  const [form, setForm] = useState({
    account_id: accountId, contact_id: "", type: "call",
    date: new Date().toISOString().slice(0, 16),
    summary: "", next_action: "", buying_signal: ""
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data } = await createInteraction({ ...form, contact_id: form.contact_id || null });
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Thêm tương tác</h2>
          <button onClick={onClose} className="text-[#707070] text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Loại</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input">
                {INTERACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ngày giờ</label>
              <input type="datetime-local" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Liên hệ</label>
            <select value={form.contact_id} onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))} className="input">
              <option value="">-- Không có --</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tóm tắt *</label>
            <textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={3} className="input" required />
          </div>
          <div>
            <label className="label">Hành động tiếp theo</label>
            <input value={form.next_action} onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Tín hiệu mua hàng</label>
            <input value={form.buying_signal} onChange={(e) => setForm((f) => ({ ...f, buying_signal: e.target.value }))} className="input" />
          </div>
          <div className="flex gap-3 pt-1">
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

function DealModal({ deal, accountId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: deal?.name || "", product: deal?.product || "",
    value: deal?.value || 0, stage: deal?.stage || "prospect",
    probability: deal?.probability ?? 50,
    expected_close: deal?.expected_close || "",
    notes: deal?.notes || "", account_id: accountId
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const fn = deal ? updateDeal(deal.id, form) : createDeal(form);
    const { data } = await fn;
    setSaving(false);
    if (data) onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{deal ? "Sửa deal" : "Thêm deal"}</h2>
          <button onClick={onClose} className="text-[#707070] text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="label">Tên deal *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sản phẩm</label>
              <input value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Giá trị (VND)</label>
              <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: parseInt(e.target.value) || 0 }))} className="input" />
            </div>
            <div>
              <label className="label">Giai đoạn</label>
              <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} className="input">
                {DEAL_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
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
          <div className="flex gap-3 pt-1">
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
