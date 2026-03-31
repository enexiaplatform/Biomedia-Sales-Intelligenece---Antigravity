import { useState, useEffect } from "react";
import { Plus, Search, Tag, FileText, Calculator, TrendingUp, Edit2, Trash2, X, PlusCircle, Save } from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner, { PageLoader } from "../components/LoadingSpinner";
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  fetchQuotes, createQuote, updateQuote, deleteQuote,
  fetchAccounts, fetchDeals
} from "../lib/supabase";

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const CATEGORIES = [
  { id: "sterility_testing", label: "Sterility Testing" },
  { id: "endotoxin", label: "Endotoxin" },
  { id: "environmental", label: "Environmental Monitoring" },
  { id: "microbial", label: "Microbial Limits" },
  { id: "consumable", label: "Consumables" },
  { id: "equipment", label: "Equipment" }
];

const TABS = [
  { id: "catalog", label: "Danh mục Sản phẩm", icon: Tag },
  { id: "quotes", label: "Báo giá", icon: FileText },
  { id: "roi", label: "Tính ROI", icon: Calculator },
  { id: "positioning", label: "So sánh giá", icon: TrendingUp },
];

export default function PricingTool({ showToast }) {
  const [activeTab, setActiveTab] = useState("catalog");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation Tabs */}
      <div className="flex bg-surface-900/50 backdrop-blur-md rounded-xl p-1.5 border border-surface-700/50 shadow-glow-sm overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${isActive 
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-surface-800"}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-surface-900 rounded-2xl shadow-xl border border-surface-700/50 overflow-hidden min-h-[600px]">
        {activeTab === "catalog" && <ProductCatalog showToast={showToast} />}
        {activeTab === "quotes" && <QuoteBuilder showToast={showToast} />}
        {activeTab === "roi" && <ROICalculator />}
        {activeTab === "positioning" && <PricePositioning />}
      </div>
    </div>
  );
}

// ── 1. PRODUCT CATALOG ────────────────────────────────────────────────────────
function ProductCatalog({ showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { loadProducts(); }, [filterCategory]);

  async function loadProducts() {
    setLoading(true);
    const { data } = await fetchProducts({ category: filterCategory });
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = products.filter(p => 
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    const { error } = await deleteProduct(id);
    if (error) showToast(error.message, "error");
    else {
      showToast("Đã xóa sản phẩm");
      loadProducts();
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm sản phẩm..." className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setEditingProduct(null); setModalOpen(true); }}>
          <Plus size={15} /> Thêm Sản Phẩm
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-surface-700/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mã (SKU)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Giá niêm yết</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Biên độ GP%</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filtered.map(p => {
                const gp = p.list_price > 0 ? ((p.list_price - (p.cost || 0)) / p.list_price) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-100">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-slate-400 border border-surface-700">
                        {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary">{formatVND(p.list_price)}</td>
                    <td className="px-6 py-4">
                      <div className={`text-xs font-bold ${gp > 30 ? 'text-green-400' : gp > 15 ? 'text-amber-400' : 'text-red-400'}`}>
                        {gp.toFixed(1)}% GP
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} className="text-slate-500 hover:text-primary transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Không tìm thấy sản phẩm nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => setModalOpen(false)} 
          onSave={() => { setModalOpen(false); showToast("Lưu thành công"); loadProducts(); }} 
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || {
    name: "", category: "sterility_testing", sku: "", list_price: 0, cost: 0, unit: "Hộp", description: "", usp: "", competitor_alternatives: []
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const addCompetitor = () => setForm({ 
    ...form, competitor_alternatives: [...form.competitor_alternatives, { competitor: "", product: "", price: 0 }] 
  });
  
  const updateCompetitor = (idx, field, val) => {
    const newAlts = [...form.competitor_alternatives];
    newAlts[idx][field] = val;
    setForm({ ...form, competitor_alternatives: newAlts });
  };
  
  const removeCompetitor = (idx) => {
    setForm({ ...form, competitor_alternatives: form.competitor_alternatives.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, list_price: Number(form.list_price), cost: Number(form.cost) };
    if (product) await updateProduct(product.id, payload);
    else await createProduct(payload);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-gray-900">{product ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Tên sản phẩm *</label>
                <input required name="name" className="input" value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Mã SKU</label>
                <input name="sku" className="input" value={form.sku} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Danh mục</label>
                <select name="category" className="input" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Giá niêm yết (VNĐ)</label>
                <input type="number" name="list_price" className="input" value={form.list_price} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Giá vốn (VNĐ)</label>
                  <input type="number" name="cost" className="input" value={form.cost} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Đơn vị</label>
                  <input name="unit" className="input" value={form.unit} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-2">
                <label className="label">Mô tả</label>
                <textarea rows={2} name="description" className="input" value={form.description} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="label">USP (Unique Selling Points)</label>
                <textarea rows={2} name="usp" className="input" placeholder="Điểm mạnh khác biệt..." value={form.usp} onChange={handleChange} />
              </div>
            </div>

            <div className="border-t pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="label !mb-0">Đối thủ cạnh tranh</label>
                <button type="button" onClick={addCompetitor} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                  <PlusCircle size={14} /> Thêm đối thủ
                </button>
              </div>
              {form.competitor_alternatives.map((alt, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-100">
                  <input placeholder="Hãng..." className="input flex-1" value={alt.competitor} onChange={e => updateCompetitor(idx, 'competitor', e.target.value)} />
                  <input placeholder="Sản phẩm..." className="input flex-1" value={alt.product} onChange={e => updateCompetitor(idx, 'product', e.target.value)} />
                  <input type="number" placeholder="Giá..." className="input w-32" value={alt.price} onChange={e => updateCompetitor(idx, 'price', Number(e.target.value))} />
                  <button type="button" onClick={() => removeCompetitor(idx)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
          <button type="submit" form="product-form" className="btn-primary">Lưu Sản Phẩm</button>
        </div>
      </div>
    </div>
  );
}

// ── 2. QUOTE BUILDER ────────────────────────────────────────────────────────
function QuoteBuilder({ showToast }) {
  const [view, setView] = useState("list"); // 'list' | 'create' | 'edit'
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (view === 'list') loadQuotes(); }, [view]);

  async function loadQuotes() {
    setLoading(true);
    const { data } = await fetchQuotes();
    setQuotes(data || []);
    setLoading(false);
  }

  const getStatusBadge = (status) => {
    const map = {
      draft: "bg-surface-800 text-slate-400 border-surface-700",
      sent: "bg-primary/10 text-primary border-primary/20",
      accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20"
    };
    const labels = { draft: "Nháp", sent: "Đã Gửi", accepted: "Chốt Deal", rejected: "Báo Rớt" };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status] || map.draft}`}>{labels[status] || status}</span>;
  };

  if (view !== "list") {
    return <QuoteForm showToast={showToast} onBack={() => setView('list')} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Quản lý Báo giá</h2>
          <p className="text-sm text-slate-500 mt-1">Theo dõi và tối ưu hóa lợi nhuận trên từng bảng báo giá.</p>
        </div>
        <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2">
          <PlusCircle size={18}/> 
          <span>Tạo Báo Giá Mới</span>
        </button>
      </div>
      
      {loading ? <PageLoader /> : (
        <div className="overflow-x-auto rounded-xl border border-surface-700/50 bg-surface-950/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-surface-700/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mã / Tên Báo Giá</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-surface-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-primary">#{q.name}</td>
                  <td className="px-6 py-4 text-slate-300">{q.accounts?.name || "—"}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(q.created_at), "dd/MM/yyyy")}</td>
                  <td className="px-6 py-4 font-bold text-slate-100">{formatVND(q.grand_total)}</td>
                  <td className="px-6 py-4">{getStatusBadge(q.status)}</td>
                  <td className="px-6 py-4 border-l border-surface-800/50">
                    <div className="flex gap-4">
                      <button className="text-slate-500 hover:text-white transition-colors" title="Xem chi tiết"><Edit2 size={16}/></button>
                      <button onClick={async () => {
                        if(confirm("Xóa báo giá này?")) {
                          await deleteQuote(q.id);
                          loadQuotes();
                        }
                      }} className="text-slate-500 hover:text-red-400 transition-colors" title="Xóa"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-16 text-center text-slate-500">Chưa có báo giá nào. Hãy tạo mới để bắt đầu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { callAISalesCoach } from "../lib/ai";

function QuoteForm({ onBack, showToast }) {
  const [form, setForm] = useState({ name: "", account_id: "", status: "draft", items: [], notes: "", valid_until: "" });
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  
  useEffect(() => {
    fetchAccounts().then(({data}) => setAccounts(data || []));
    fetchProducts().then(({data}) => setProducts(data || []));
  }, []);

  const addItem = (product) => {
    setForm(f => ({
      ...f,
      items: [...f.items, { 
        product_id: product.id, 
        name: product.name, 
        qty: 1, 
        unit_price: product.list_price, 
        cost: product.cost || 0,
        discount_pct: 0, 
        total: product.list_price,
        competitor_info: product.competitor_alternatives || []
      }]
    }));
    setProductSearch("");
  };

  const updateItem = (idx, field, val) => {
    const newItems = [...form.items];
    const item = newItems[idx];
    item[field] = val;
    // recalcalc
    const discount = item.unit_price * (item.discount_pct / 100);
    item.total = (item.unit_price - discount) * item.qty;
    setForm({ ...form, items: newItems });
  };

  const removeItem = (idx) => setForm(f => ({...f, items: f.items.filter((_, i) => i !== idx)}));

  // Auto calculate totals
  const subtotal = form.items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
  const grandTotal = form.items.reduce((s, i) => s + i.total, 0);
  const totalCost = form.items.reduce((s, i) => s + (i.cost * i.qty), 0);
  const totalDiscount = subtotal - grandTotal;
  const avgDiscountPct = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
  const totalGP = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal) * 100 : 0;

  const handleAISuggestion = async () => {
    if (form.items.length === 0) return showToast("Thêm ít nhất 1 sản phẩm để phân tích.", "error");
    setAiLoading(true);
    try {
      const quoteContext = {
        account: accounts.find(a => a.id === form.account_id)?.name || "Khách hàng mới",
        items: form.items.map(i => ({
          name: i.name,
          price: i.unit_price,
          discount: i.discount_pct,
          competitors: i.competitor_info
        })),
        total_gp: totalGP.toFixed(1)
      };
      const prompt = `Phân tích báo giá kỹ thuật cho khách hàng ${quoteContext.account}.
      Chi tiết sản phẩm: ${JSON.stringify(quoteContext.items)}
      Lợi nhuận gộp hiện tại (GP%): ${quoteContext.total_gp}%
      
      Hãy đưa ra nhận xét:
      1. Mức chiết khấu hiện tại đã cạnh tranh chưa so với các đối thủ (nếu có dữ liệu)?
      2. Lợi nhuận gộp có đang ở mức nguy hiểm (<20%) không?
      3. Gợi ý 3 'Quick Wins' để chốt deal thương vụ này (ví dụ: gộp gói dịch vụ, thời gian giao hàng, hoặc cam kết kỹ thuật).`;
      
      const res = await callAISalesCoach(prompt);
      setAiInsight(res);
    } catch (err) {
      console.error(err);
      showToast("Lỗi phân tích AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.account_id) return showToast("Vui lòng nhập tên Báo giá và chọn Khách hàng", "error");
    const payload = { ...form, subtotal, total_discount: totalDiscount, grand_total: grandTotal };
    const { error } = await createQuote(payload);
    if(error) showToast(error.message, "error");
    else { showToast("Lưu báo giá thành công"); onBack(); }
  };

  const searchedProducts = productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [];

  return (
    <div className="flex flex-col h-full bg-surface-950 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -z-10" />
      
      <div className="px-6 py-4 border-b border-surface-700/50 bg-surface-900/50 backdrop-blur-md flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-100 hover:bg-surface-800 rounded-lg transition-colors">
            <X size={20}/>
          </button>
          <div>
            <h2 className="font-bold text-slate-100">Soạn Báo Giá Chiến Lược</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${totalGP > 30 ? 'bg-emerald-500/10 text-emerald-400' : totalGP > 20 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                GP: {totalGP.toFixed(1)}%
              </span>
              <span className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded uppercase">DRAFT MODE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewOpen(true)} className="btn-secondary px-4 py-1.5">Xem trước</button>
          <button onClick={handleSave} className="btn-primary px-6 py-1.5 flex items-center gap-2 shadow-glow-sm">
            <Save size={16}/> 
            <span>Lưu báo giá</span>
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-y-auto">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5 bg-surface-900/50 border-surface-700/50">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Tên báo giá *</label>
              <input className="input-modern bg-surface-800/50 border-surface-700 text-slate-100" placeholder="VD: Dự án Bệnh viện Chợ Rẫy Q4" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="card p-5 bg-surface-900/50 border-surface-700/50">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Khách hàng mục tiêu *</label>
              <select className="input-modern bg-surface-800/50 border-surface-700 text-slate-100" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                <option value="">-- Chọn khách hàng --</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card p-0 bg-surface-900/50 border-surface-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-700/50 bg-white/5 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Tag size={16} className="text-primary"/>
                Danh mục sản phẩm đề xuất
              </h3>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  placeholder="Thêm sản phẩm..." 
                  className="input-modern bg-surface-800 pl-9 py-1.5 text-xs text-slate-100 w-full" 
                  value={productSearch} 
                  onChange={e => setProductSearch(e.target.value)} 
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {searchedProducts.map(p => (
                      <div key={p.id} className="p-3 hover:bg-surface-700 cursor-pointer flex justify-between items-center transition-colors border-b border-surface-700 last:border-0" onClick={() => addItem(p)}>
                        <div><div className="text-sm font-semibold text-white">{p.name}</div><div className="text-[10px] text-slate-500">{p.sku}</div></div>
                        <div className="text-xs font-bold text-primary">{formatVND(p.list_price)}</div>
                      </div>
                    ))}
                    {searchedProducts.length===0 && <div className="p-4 text-xs text-slate-500 text-center italic">Không tìm thấy mã phù hợp.</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sản phẩm kỹ thuật</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Số lượng</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right">Đơn giá niêm yết</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 text-center">Chiết khấu</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40 text-right">Thành tiền</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {form.items.map((item, idx) => {
                    const lineGP = item.total > 0 ? ((item.total - (item.cost * item.qty)) / item.total) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-100">{item.name}</div>
                          <div className={`text-[10px] font-bold mt-1 ${lineGP > 25 ? 'text-emerald-500' : 'text-amber-500'}`}>GP: {lineGP.toFixed(1)}%</div>
                        </td>
                        <td className="px-4 py-4">
                          <input type="number" min="1" className="bg-surface-800 border border-surface-700 text-slate-100 rounded px-2 py-1 w-full text-sm text-center" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} />
                        </td>
                        <td className="px-4 py-4 text-right text-slate-400 text-sm">{formatVND(item.unit_price)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" max="100" className="bg-surface-800/80 border border-surface-700 text-primary font-bold rounded px-2 py-1 w-full text-sm text-center" value={item.discount_pct} onChange={e => updateItem(idx, 'discount_pct', Number(e.target.value))} />
                            <span className="text-slate-600 text-xs">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-100 text-sm">{formatVND(item.total)}</td>
                        <td className="px-4 py-4">
                          <button onClick={()=>removeItem(idx)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic text-sm">Chưa có sản phẩm. Tìm kiếm để thêm mã hàng vào báo giá.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-surface-950 border-primary/20 shadow-glow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs">Tổng tiền hàng:</span>
                <span className="text-slate-100 font-medium text-sm">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span className="text-xs">Tiết kiệm (KH):</span>
                <span className="text-sm">-{formatVND(totalDiscount)}</span>
              </div>
              <div className="pt-4 border-t border-surface-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase">Biên lợi nhuận (GP):</span>
                  <span className={`font-bold ${totalGP > 30 ? 'text-emerald-400' : totalGP > 20 ? 'text-amber-400' : 'text-red-400'}`}>
                    {totalGP.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-10">
                    <span className="text-slate-100 font-bold text-lg uppercase tracking-tight">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-primary">{formatVND(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-1 bg-surface-900/50 border-surface-700/50 overflow-hidden">
            <button 
              onClick={handleAISuggestion}
              disabled={aiLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b border-surface-700/50"
            >
              {aiLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span>Đang tư vấn...</span>
                </>
              ) : (
                <>
                  <Calculator size={14} className="text-primary"/>
                  <span>Phân tích báo giá AI</span>
                </>
              )}
            </button>
            <div className="p-4">
              {aiInsight ? (
                <div className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 duration-500">
                  {aiInsight}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calculator size={32} className="mx-auto text-surface-700 mb-2 opacity-20"/>
                  <span className="text-[10px] text-slate-600 uppercase font-bold">Chưa có phân tích</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewOpen && <QuotePreviewModal form={form} totals={{subtotal, grandTotal, totalGP}} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

function QuotePreviewModal({ form, totals, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-950/90 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-none shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col p-12 relative overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={24}/>
        </button>
        
        {/* Quote Header */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Quotation</h1>
            <div className="text-slate-500 space-y-0.5 text-sm uppercase font-bold tracking-widest">
              <div>Ref: SI/2026/{Math.floor(Math.random()*9000)+1000}</div>
              <div>Date: {format(new Date(), "dd MMMM yyyy")}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">Biomedia Group VN</div>
            <div className="text-xs text-slate-500 max-w-[200px] mt-1">Laboratory Solutions & Life Science Excellence</div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-10 mb-10">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">Attention To:</div>
          <div className="text-xl font-bold uppercase">{form.account_name || "Valued Customer"}</div>
        </div>

        {/* Product Table */}
        <table className="w-full border-collapse mt-6">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-3 text-xs uppercase font-bold">Description</th>
              <th className="text-center py-3 text-xs uppercase font-bold w-20">Qty</th>
              <th className="text-right py-3 text-xs uppercase font-bold w-40">Unit Price</th>
              <th className="text-right py-3 text-xs uppercase font-bold w-40">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {form.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-4 font-medium">{item.name}</td>
                <td className="py-4 text-center">{item.qty}</td>
                <td className="py-4 text-right">{formatVND(item.unit_price)}</td>
                <td className="py-4 text-right font-bold">{formatVND(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Totals */}
        <div className="mt-auto pt-10 border-t border-slate-900 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-bold uppercase">Subtotal:</span>
              <span className="font-bold">{formatVND(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-lg font-black uppercase">Grand Total:</span>
              <span className="text-lg font-black text-slate-900">{formatVND(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
          Valid Until: {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "dd/MM/yyyy")} | Terms & Conditions Apply
        </div>
      </div>
    </div>
  );
}

// ── 3. ROI CALCULATOR ────────────────────────────────────────────────────────
function ROICalculator() {
  const [data, setData] = useState({
    currentCost: 150000, 
    currentTests: 500,
    bioPrice: 130000,
    bioTests: 500,
    equipmentCost: 0
  });

  const currentMonthly = data.currentCost * data.currentTests;
  const bioMonthly = data.bioPrice * data.bioTests;
  const monthlySavings = currentMonthly - bioMonthly;
  const annualSavings = monthlySavings * 12;
  const payback = data.equipmentCost > 0 && monthlySavings > 0 ? (data.equipmentCost / monthlySavings).toFixed(1) : 0;

  return (
    <div className="p-8 bg-surface-950/20 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-100 tracking-tight uppercase mb-2">ROI Calculator</h2>
          <p className="text-slate-500 font-medium tracking-wide">Giải pháp tối ưu chi phí vận hành Lab từ Biomedia</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="card p-6 bg-surface-900/50 border-surface-700/50 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 transition-all group-hover:bg-slate-500" />
            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Hiện tại (Đối thủ)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Chi phí mỗi test (VNĐ)</label>
                <input type="number" className="input-modern bg-surface-800 text-xl font-bold" value={data.currentCost} onChange={e=>setData({...data, currentCost: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Số lượng test / tháng</label>
                <input type="number" className="input-modern bg-surface-800" value={data.currentTests} onChange={e=>setData({...data, currentTests: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <div className="card p-6 bg-primary/5 border-primary/20 space-y-6 relative overflow-hidden group shadow-glow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Đề xuất Biomedia</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-primary/60 mb-2 block uppercase">Chi phí mỗi test (VNĐ)</label>
                <input type="number" className="input-modern bg-surface-800/80 border-primary/30 text-white text-xl font-bold focus:border-primary" value={data.bioPrice} onChange={e=>setData({...data, bioPrice: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-primary/60 mb-2 block uppercase">Số lượng test</label>
                  <input type="number" className="input-modern bg-surface-800/80 border-primary/30 text-slate-100" value={data.bioTests} onChange={e=>setData({...data, bioTests: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-primary/60 mb-2 block uppercase">Phí máy móc (CAPEX)</label>
                  <input type="number" className="input-modern bg-surface-800/80 border-primary/30 text-slate-100" value={data.equipmentCost} onChange={e=>setData({...data, equipmentCost: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card bg-surface-950 border border-surface-700/50 p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <h3 className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs">Phân tích hiệu quả kinh tế</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 divide-y md:divide-y-0 md:divide-x divide-surface-800">
            <div className="space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-black">Lợi ích tháng</div>
              <div className={`text-3xl font-black ${monthlySavings > 0 ? 'text-primary' : 'text-red-500'}`}>
                {formatVND(monthlySavings)}
              </div>
            </div>
            <div className="md:pl-10 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-black">Lợi ích năm</div>
              <div className={`text-4xl font-black ${annualSavings > 0 ? 'text-primary' : 'text-red-500'} tracking-tighter`}>
                {formatVND(annualSavings)}
              </div>
            </div>
            <div className="md:pl-10 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-black">Hoàn vốn dự kiến</div>
              <div className="text-3xl font-black text-white italic">
                {payback > 0 ? `${payback} Tháng` : 'Tức thì'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricePositioning() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(({data}) => { setProducts(data || []); setLoading(false); });
  }, []);

  const positioningData = products.filter(p => p.competitor_alternatives && p.competitor_alternatives.length > 0);

  return (
    <div className="p-8">
      <div className="mb-10">
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">Bản đồ Định Giá Chiến Lược</h2>
        <p className="text-sm text-slate-500 mt-2 font-medium">Báo cáo so sánh trực tiếp vị thế giá của Biomedia so với các đối thủ chính.</p>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-10">
          {CATEGORIES.map(category => {
            const catProducts = positioningData.filter(p => p.category === category.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={category.id} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-[1px] flex-1 bg-surface-800" />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{category.label}</span>
                  <div className="h-[1px] flex-1 bg-surface-800" />
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-surface-700/50 bg-surface-950/30">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left border-b border-surface-800">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/4">Sản Phẩm Biomedia</th>
                        <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/6">Giá Chúng Ta</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/4">Đối thủ cạnh tranh</th>
                        <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/6">Giá Đối Thủ</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kênh Chênh Lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {catProducts.map(p => (
                        p.competitor_alternatives.map((alt, idx) => {
                          const gap = p.list_price - alt.price;
                          const pctGap = alt.price > 0 ? (gap / alt.price) * 100 : 0;
                          const isCheaper = gap <= 0;

                          return (
                            <tr key={`${p.id}-${idx}`} className="hover:bg-surface-800/20 transition-colors">
                              {idx === 0 && (
                                <td rowSpan={p.competitor_alternatives.length} className="px-6 py-6 font-bold text-slate-100 align-top border-r border-surface-800/50">
                                  {p.name}
                                </td>
                              )}
                              {idx === 0 && (
                                <td rowSpan={p.competitor_alternatives.length} className="px-4 py-6 font-black text-primary align-top border-r border-surface-800/50">
                                  {formatVND(p.list_price)}
                                </td>
                              )}
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-300 uppercase text-xs">{alt.competitor}</div>
                                <div className="text-[10px] text-slate-500 italic mt-1">{alt.product}</div>
                              </td>
                              <td className="px-4 py-4 text-slate-100 font-medium">{formatVND(alt.price)}</td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter
                                  ${isCheaper ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                  {isCheaper ? 'Ưu thế giá' : 'Cao hơn'} {Math.abs(pctGap).toFixed(1)}%
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
