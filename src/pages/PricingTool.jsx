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
    <div className="space-y-8 w-full px-6">
      {/* Navigation Tabs */}
      <div className="flex bg-surface-950/40 backdrop-blur-2xl rounded-2xl p-1.5 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 group whitespace-nowrap
                ${isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-glow-sm"
                  : "border border-transparent"}`}
              style={!isActive ? { color: 'var(--text-3)' } : undefined}
            >
              <Icon size={16} className={`transition-all duration-500 ${isActive ? "drop-shadow-glow scale-110" : "group-hover:scale-110"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-surface-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden min-h-[600px] shadow-2xl relative">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10 rounded-full" />
        
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
    <div className="p-8 space-y-8 relative">
      <div className="flex flex-wrap items-center gap-4 justify-between bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="relative w-80 group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-3)' }} />
            <input type="text" placeholder="Tìm tên sản phẩm hoặc SKU..." className="input !pl-12 !bg-surface-950/50" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <select className="input w-auto cursor-pointer !bg-surface-950/50 pr-10" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="" className="bg-surface-900">Tất cả danh mục</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-surface-900">{c.label}</option>)}
            </select>
            <Tag size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          </div>
        </div>
        <button className="btn-primary shadow-glow-sm shadow-primary/20 uppercase tracking-widest text-[10px] h-11 px-6" onClick={() => { setEditingProduct(null); setModalOpen(true); }}>
          <Plus size={16} /> Thêm Sản Phẩm
        </button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="table-container rounded-2xl border border-white/5 bg-surface-950/20 overflow-hidden shadow-2xl">
          <table className="table">
            <thead>
              <tr>
                <th>Sản phẩm & Quy cách</th>
                <th>Mã (SKU)</th>
                <th>Danh mục</th>
                <th>Giá niêm yết</th>
                <th>Biên độ GP%</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const gp = p.list_price > 0 ? ((p.list_price - (p.cost || 0)) / p.list_price) * 100 : 0;
                return (
                  <tr key={p.id} className="group transition-all duration-300">
                    <td>
                      <div className="font-bold group-hover:text-primary transition-colors" style={{ color: 'var(--text-1)' }}>{p.name}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-3)' }}>{p.unit}</div>
                    </td>
                    <td className="font-mono text-[10px] opacity-60 tracking-tighter uppercase" style={{ color: 'var(--text-2)' }}>{p.sku || "—"}</td>
                    <td>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/5 border border-white/5" style={{ color: 'var(--text-3)' }}>
                        {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                      </span>
                    </td>
                    <td className="font-bold" style={{ color: 'var(--text-1)' }}>
                      <div className="text-primary drop-shadow-glow-sm">{formatVND(p.list_price)}</div>
                    </td>
                    <td>
                      <div className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-block border
                        ${gp > 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow-sm shadow-emerald-500/10' 
                          : gp > 15 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {gp.toFixed(1)}% GP
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} className="p-2 hover:text-primary hover:bg-primary/10 rounded-xl border border-transparent hover:border-primary/20 transition-all" style={{ color: 'var(--text-3)' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all" style={{ color: 'var(--text-3)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-20 text-center uppercase font-black text-[10px] tracking-[0.2em] opacity-40" style={{ color: 'var(--text-2)' }}>Không tìm thấy sản phẩm phù hợp</td></tr>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-sm p-4">
      <div className="bg-surface-900/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="font-black uppercase tracking-widest text-sm" style={{ color: 'var(--text-1)' }}>{product ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-3)' }}>Product Intelligence Catalog</p>
          </div>
          <button onClick={onClose} className="p-2 transition-colors hover:bg-white/5 rounded-xl" style={{ color: 'var(--text-3)' }}>
            <X size={20}/>
          </button>
        </div>
        <div className="overflow-y-auto p-8 flex-1 scrollbar-hide">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="label">Tên sản phẩm *</label>
                <input required name="name" className="input" placeholder="VD: Sterility Testing Kit Gen 3" value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Mã SKU</label>
                <input name="sku" className="input" placeholder="Mã SKU định danh..." value={form.sku} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Danh mục</label>
                <select name="category" className="input cursor-pointer" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-surface-900">{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Giá niêm yết (VNĐ)</label>
                <input type="number" name="list_price" className="input font-bold text-primary" value={form.list_price} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Giá vốn (VNĐ)</label>
                  <input type="number" name="cost" className="input" value={form.cost} onChange={handleChange} />
                </div>
                <div>
                  <label className="label">Đơn vị</label>
                  <input name="unit" className="input" placeholder="VD: Hộp, Cái..." value={form.unit} onChange={handleChange} />
                </div>
              </div>
              <div className="col-span-2">
                <label className="label">Mô tả kỹ thuật</label>
                <textarea rows={2} name="description" className="input" placeholder="Thông số kỹ thuật chính..." value={form.description} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="label">Lợi thế cạnh tranh (USP)</label>
                <textarea rows={2} name="usp" className="input border-primary/20 bg-primary/5" placeholder="Điều gì làm sản phẩm này nổi bật?" value={form.usp} onChange={handleChange} />
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="label !mb-0">Đối thủ cạnh tranh trực tiếp</label>
                <button type="button" onClick={addCompetitor} className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all">
                  <PlusCircle size={14} /> Thêm đối thủ
                </button>
              </div>
              <div className="space-y-3">
                {form.competitor_alternatives.map((alt, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-white/5 p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.08]">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Hãng sản xuất..." className="input !py-1 text-xs" value={alt.competitor} onChange={e => updateCompetitor(idx, 'competitor', e.target.value)} />
                        <input placeholder="Tên sản phẩm..." className="input !py-1 text-xs" value={alt.product} onChange={e => updateCompetitor(idx, 'product', e.target.value)} />
                      </div>
                      <input type="number" placeholder="Giá đối thủ (VNĐ)..." className="input !py-1 text-xs font-mono" value={alt.price} onChange={e => updateCompetitor(idx, 'price', Number(e.target.value))} />
                    </div>
                    <button type="button" onClick={() => removeCompetitor(idx)} className="p-3 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" style={{ color: 'var(--text-3)' }}>
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className="px-8 py-6 border-t border-white/5 bg-white/5 flex justify-end gap-4 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary px-6 font-bold uppercase tracking-widest text-[10px]">Hủy</button>
          <button type="submit" form="product-form" className="btn-primary px-8 shadow-glow-sm shadow-primary/20 uppercase tracking-widest text-[10px]">Lưu Sản Phẩm</button>
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
      draft: "bg-surface-800 border-surface-700",
      sent: "bg-primary/10 text-primary border-primary/20",
      accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20"
    };
    const labels = { draft: "Nháp", sent: "Đã Gửi", accepted: "Chốt Deal", rejected: "Báo Rớt" };
    const isDraft = !status || status === "draft";
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status] || map.draft}`} style={isDraft ? { color: 'var(--text-2)' } : undefined}>{labels[status] || status}</span>;
  };

  if (view !== "list") {
    return <QuoteForm showToast={showToast} onBack={() => setView('list')} />;
  }

  return (
    <div className="p-8 space-y-8 relative">
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--text-1)' }}>
            <div className="w-2 h-8 bg-primary rounded-full shadow-glow-sm" />
            Quản lý Báo giá Chiến lược
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 ml-5" style={{ color: 'var(--text-3)' }}>Sales Intelligence Engine</p>
        </div>
        <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2 h-11 px-6 shadow-glow-sm shadow-primary/20 uppercase tracking-widest text-[10px]">
          <PlusCircle size={18}/> 
          <span>Tạo Báo Giá Mới</span>
        </button>
      </div>
      
      {loading ? <PageLoader /> : (
        <div className="table-container rounded-2xl border border-white/5 bg-surface-950/20 overflow-hidden shadow-2xl">
          <table className="table">
            <thead>
              <tr>
                <th>Mã / Tên Báo Giá</th>
                <th>Khách hàng</th>
                <th>Ngày tạo</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="group transition-all duration-300">
                  <td>
                    <div className="font-bold text-primary drop-shadow-glow-sm text-sm">#{q.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-3)' }}>EST: {format(new Date(q.created_at), "MMM yyyy")}</div>
                  </td>
                  <td className="font-medium" style={{ color: 'var(--text-2)' }}>{q.accounts?.name || "—"}</td>
                  <td className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{format(new Date(q.created_at), "dd/MM/yyyy")}</td>
                  <td className="font-black" style={{ color: 'var(--text-1)' }}>{formatVND(q.grand_total)}</td>
                  <td>{getStatusBadge(q.status)}</td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      <button className="p-2 hover:text-white hover:bg-white/10 rounded-xl transition-all" style={{ color: 'var(--text-3)' }} title="Xem chi tiết"><Edit2 size={16}/></button>
                      <button onClick={async () => {
                        if(confirm("Xóa báo giá này?")) {
                          await deleteQuote(q.id);
                          loadQuotes();
                        }
                      }} className="p-2 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" style={{ color: 'var(--text-3)' }} title="Xóa"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-20 text-center uppercase font-black text-[10px] tracking-[0.2em] opacity-40" style={{ color: 'var(--text-2)' }}>Chưa có dữ liệu báo giá trong hệ thống</td></tr>
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
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[140px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
      
      <div className="px-8 py-6 border-b border-white/5 bg-surface-900/60 backdrop-blur-2xl flex justify-between items-center shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 -ml-2 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10" style={{ color: 'var(--text-3)' }}>
            <X size={20}/>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-tighter text-xl" style={{ color: 'var(--text-1)' }}>Soạn Báo Giá Chiến Lược</h2>
              <div className="h-4 w-[1px] bg-white/10" />
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-glow-sm">Draft Mode</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${totalGP > 30 ? 'bg-emerald-500 shadow-glow-sm shadow-emerald-500' : 'bg-amber-500 shadow-glow-sm shadow-amber-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Target GP:</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${totalGP > 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{totalGP.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPreviewOpen(true)} className="btn-secondary h-11 px-6 font-bold uppercase tracking-widest text-[10px]">Xem trước</button>
          <button onClick={handleSave} className="btn-primary h-11 px-8 flex items-center gap-2 shadow-glow-sm shadow-primary/20 uppercase tracking-widest text-[10px]">
            <Save size={18}/> 
            <span>Phát hành Báo giá</span>
          </button>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-y-auto scrollbar-hide">
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-inner space-y-4">
              <label className="label">Tên chiến dịch / Báo giá *</label>
              <input className="input !bg-surface-950/50" placeholder="VD: Dự án Bệnh viện Chợ Rẫy Q4" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-inner space-y-4">
              <label className="label">Khách hàng mục tiêu *</label>
              <select className="input !bg-surface-950/50 cursor-pointer" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                <option value="" className="bg-surface-900 border-0">-- Chọn khách hàng --</option>
                {accounts.map(a => <option key={a.id} value={a.id} className="bg-surface-900">{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-3" style={{ color: 'var(--text-1)' }}>
                <Tag size={18} className="text-primary drop-shadow-glow"/>
                Danh mục giải pháp đề xuất
              </h3>
              <div className="relative w-80 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-3)' }} />
                <input 
                  placeholder="Thêm sản phẩm từ Catalog..." 
                  className="input !bg-surface-950/50 !pl-12 !py-2.5 text-xs" 
                  value={productSearch} 
                  onChange={e => setProductSearch(e.target.value)} 
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-surface-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {searchedProducts.map(p => (
                      <div key={p.id} className="p-4 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0 group" onClick={() => addItem(p)}>
                        <div>
                          <div className="text-sm font-bold group-hover:text-primary transition-colors" style={{ color: 'var(--text-1)' }}>{p.name}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-3)' }}>{p.sku}</div>
                        </div>
                        <div className="text-xs font-black text-primary drop-shadow-glow-sm">{formatVND(p.list_price)}</div>
                      </div>
                    ))}
                    {searchedProducts.length===0 && <div className="p-6 text-xs text-center italic font-medium uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Không có mã phù hợp</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-white/5">
                  <tr>
                    <th>Giải pháp kỹ thuật</th>
                    <th className="w-32">Số lượng</th>
                    <th className="text-right w-40">Giá niêm yết</th>
                    <th className="text-center w-32">Chiết khấu</th>
                    <th className="text-right w-48">Thành tiền</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {form.items.map((item, idx) => {
                    const lineGP = item.total > 0 ? ((item.total - (item.cost * item.qty)) / item.total) * 100 : 0;
                    return (
                      <tr key={idx} className="group hover:bg-white/5 transition-all">
                        <td>
                          <div className="font-bold group-hover:text-primary transition-colors" style={{ color: 'var(--text-1)' }}>{item.name}</div>
                          <div className={`text-[10px] font-black uppercase tracking-widest mt-1 inline-flex items-center gap-1.5 ${lineGP > 25 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${lineGP > 25 ? 'bg-emerald-500 shadow-glow-sm shadow-emerald-500' : 'bg-amber-500 shadow-glow-sm shadow-amber-500'}`} />
                            Margin: {lineGP.toFixed(1)}%
                          </div>
                        </td>
                        <td>
                          <input type="number" min="1" className="bg-surface-950/50 border border-white/5 rounded-xl px-3 py-2 w-full text-sm text-center font-bold focus:border-primary/50 transition-all outline-none" style={{ color: 'var(--text-1)' }} value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} />
                        </td>
                        <td className="text-right text-sm font-medium" style={{ color: 'var(--text-2)' }}>{formatVND(item.unit_price)}</td>
                        <td>
                          <div className="flex items-center gap-2 px-3 border border-white/5 bg-surface-950/50 rounded-xl group-focus-within:border-primary/50 transition-all">
                            <input type="number" min="0" max="100" className="bg-transparent text-primary font-black py-2 w-full text-sm text-center outline-none" value={item.discount_pct} onChange={e => updateItem(idx, 'discount_pct', Number(e.target.value))} />
                            <span className="font-bold text-xs" style={{ color: 'var(--text-3)' }}>%</span>
                          </div>
                        </td>
                        <td className="text-right font-black text-sm" style={{ color: 'var(--text-1)' }}>{formatVND(item.total)}</td>
                        <td className="text-right">
                          <button onClick={()=>removeItem(idx)} className="p-3 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100" style={{ color: 'var(--text-3)' }}><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-24 text-center uppercase font-black text-[10px] tracking-[0.3em] opacity-40 italic" style={{ color: 'var(--text-2)' }}>Hệ thống đang chờ danh mục sản phẩm</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-surface-900 border border-primary/20 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -z-10 group-hover:bg-primary/10 transition-all duration-700" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
              <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-glow-sm shadow-primary" />
              Financial Summary
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Giá gộp:</span>
                <span className="font-bold text-sm font-mono" style={{ color: 'var(--text-1)' }}>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span className="text-[10px] font-bold uppercase tracking-widest">Tiết kiệm:</span>
                <span className="text-sm font-black italic">-{formatVND(totalDiscount)}</span>
              </div>
              <div className="pt-6 border-t border-white/5 space-y-6">
                <div className="flex justify-between items-center">
                   <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--text-3)' }}>Lợi nhuận gộp</span>
                    <span className={`text-xl font-black ${totalGP > 30 ? 'text-emerald-400' : 'text-amber-400'} drop-shadow-glow-sm`}>
                      {totalGP.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 shadow-inner">
                  <span className="text-[10px] font-black uppercase tracking-widest block mb-2" style={{ color: 'var(--text-3)' }}>Tổng cộng hệ thống:</span>
                  <div className="text-3xl font-black text-primary tracking-tighter drop-shadow-glow">
                    {formatVND(grandTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <button 
              onClick={handleAISuggestion}
              disabled={aiLoading}
              className="w-full py-5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border-b border-white/5"
            style={{ color: 'var(--text-2)' }}
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-primary animate-pulse">Computing Insights...</span>
                </>
              ) : (
                <>
                  <Calculator size={16} className="text-primary drop-shadow-glow"/>
                  <span>Phân tích chiến lược AI</span>
                </>
              )}
            </button>
            <div className="p-8">
              {aiInsight ? (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-4 duration-700 font-medium" style={{ color: 'var(--text-2)' }}>
                  {aiInsight}
                </div>
              ) : (
                <div className="text-center py-10 opacity-30 group-hover:opacity-50 transition-opacity duration-700">
                  <Calculator size={48} className="mx-auto mb-4" style={{ color: 'var(--text-3)' }}/>
                  <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-3)' }}>AI Sales Coach Standby</span>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-950/95 backdrop-blur-md p-4">
      <div className="rounded-[3rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-16 relative overflow-y-auto" style={{ background: 'var(--bg-surface)', color: 'var(--text-1)' }}>
        <button onClick={onClose} className="absolute top-10 right-10 p-3 rounded-2xl transition-all" style={{ color: 'var(--text-3)' }}>
          <X size={24}/>
        </button>
        
        {/* Document Header */}
        <div className="flex justify-between items-start pb-12" style={{ borderBottom: '8px solid var(--text-1)' }}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--text-1)' }}>
                <FileText size={24} style={{ color: 'var(--bg-surface)' }}/>
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none" style={{ color: 'var(--text-1)' }}>Quotation</h1>
            </div>
            <div className="space-y-1 text-[10px] uppercase font-black tracking-[0.2em]" style={{ color: 'var(--text-2)' }}>
              <div className="flex items-center gap-2">REF ID: <span style={{ color: 'var(--text-1)' }}>BM/SI/2026/{Math.floor(Math.random()*9000)+1000}</span></div>
              <div className="flex items-center gap-2">ISSUE DATE: <span style={{ color: 'var(--text-1)' }}>{format(new Date(), "dd MMMM yyyy")}</span></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>Biomedia Group</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-2)' }}>Life Science Solutions Division</div>
            <div className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--text-2)' }}>Ho Chi Minh City, Vietnam</div>
          </div>
        </div>

        {/* Client Context */}
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div>
            <div className="text-[10px] uppercase font-black tracking-[0.2em] mb-4" style={{ color: 'var(--text-2)' }}>Attention to:</div>
            <div className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>{form.account_name || "Valued Strategic Partner"}</div>
            <div className="text-xs font-bold mt-2 uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-2)' }}>Proposal for advanced laboratory <br/>intelligence & operational excellence.</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-16 flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--text-1)' }}>
                <th className="text-left py-4 text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-2)' }}>Description of Solutions</th>
                <th className="text-center py-4 text-[10px] uppercase font-black tracking-widest w-24" style={{ color: 'var(--text-2)' }}>Qty</th>
                <th className="text-right py-4 text-[10px] uppercase font-black tracking-widest w-44" style={{ color: 'var(--text-2)' }}>Unit Net (VND)</th>
                <th className="text-right py-4 text-[10px] uppercase font-black tracking-widest w-44" style={{ color: 'var(--text-2)' }}>Subtotal (VND)</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--border)' }}>
              {form.items.map((item, idx) => (
                <tr key={idx} className="group" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-6 pr-6">
                    <div className="font-black text-sm uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>{item.name}</div>
                    <div className="text-[10px] font-bold mt-1 uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Professional Grade Standard</div>
                  </td>
                  <td className="py-6 text-center font-bold" style={{ color: 'var(--text-1)' }}>{item.qty}</td>
                  <td className="py-6 text-right font-bold" style={{ color: 'var(--text-2)' }}>{formatVND(item.unit_price * (1 - item.discount_pct/100))}</td>
                  <td className="py-6 text-right font-black" style={{ color: 'var(--text-1)' }}>{formatVND(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="mt-12 pt-12" style={{ borderTop: '2px solid var(--text-1)' }}>
          <div className="flex justify-between items-end">
            <div className="max-w-md">
              <div className="text-[10px] uppercase font-black tracking-[0.2em] mb-4" style={{ color: 'var(--text-2)' }}>Official Terms:</div>
              <div className="text-[10px] font-bold leading-relaxed uppercase space-y-1" style={{ color: 'var(--text-2)' }}>
                <p>• Validity: 30 Days from issue date</p>
                <p>• Delivery: 4-6 Weeks upon PO acceptance</p>
                <p>• Quality: Certified ISO/USP Laboratory Standards</p>
              </div>
            </div>
            <div className="w-80 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-2" style={{ color: 'var(--text-2)' }}>
                <span>Gross Value:</span>
                <span>{formatVND(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded" style={{ color: '#16a34a', background: 'rgba(34,197,94,0.1)' }}>
                <span>Strategic Discount:</span>
                <span>-{formatVND(totals.subtotal - totals.grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 px-2" style={{ borderTop: '4px solid var(--text-1)' }}>
                <span className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>Total Price:</span>
                <span className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-1)' }}>{formatVND(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
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
    <div className="p-12 bg-surface-950/20 h-full overflow-y-auto scrollbar-hide">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 mb-4">
            <Calculator size={16} className="text-primary"/>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Financial Intelligence Module</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter uppercase leading-none" style={{ color: 'var(--text-1)' }}>ROI Optimizer</h2>
          <p className="font-bold uppercase tracking-[0.2em] text-[10px]" style={{ color: 'var(--text-3)' }}>Tối ưu hóa tổng chi phí sở hữu (TCO) cho phòng Lab</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Inputs - Competitor */}
          <div className="bg-surface-900/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group">
            <div className="absolute top-0 left-0 w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            </div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/5" style={{ background: 'var(--bg-elevated)' }}>
                <X size={20} style={{ color: 'var(--text-3)' }}/>
              </div>
              <h3 className="font-black uppercase text-xs tracking-[0.2em]" style={{ color: 'var(--text-2)' }}>Hiện trạng mô hình cũ</h3>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="label">Chi phí mỗi test (VNĐ)</label>
                <div className="relative group">
                  <input type="number" className="input !bg-surface-950/50 !text-2xl !font-black !py-4" value={data.currentCost} onChange={e=>setData({...data, currentCost: Number(e.target.value)})} />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase" style={{ color: 'var(--text-3)' }}>VND/TEST</div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="label">Số lượng test vận hành / tháng</label>
                <input type="number" className="input !bg-surface-950/50 !font-bold" value={data.currentTests} onChange={e=>setData({...data, currentTests: Number(e.target.value)})} />
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-end">
               <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Chi phí hàng tháng:</span>
               <span className="text-xl font-black" style={{ color: 'var(--text-2)' }}>{formatVND(currentMonthly)}</span>
            </div>
          </div>

          {/* Inputs - Biomedia */}
          <div className="bg-surface-900 border border-primary/20 p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
               <div className="h-full w-2/3 bg-primary shadow-glow shadow-primary" />
            </div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <TrendingUp size={20} className="text-primary drop-shadow-glow"/>
              </div>
              <h3 className="font-black text-primary uppercase text-xs tracking-[0.2em]">Giải pháp Biomedia Optimize</h3>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="label !text-primary/60">Chi phí mỗi test (VNĐ)</label>
                <div className="relative">
                  <input type="number" className="input !bg-surface-950/50 !border-primary/30 !text-primary !text-2xl !font-black !py-4 focus:!border-primary shadow-glow-sm shadow-primary/5" value={data.bioPrice} onChange={e=>setData({...data, bioPrice: Number(e.target.value)})} />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40 uppercase">VND/TEST</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="label !text-primary/60">Số lượng test</label>
                  <input type="number" className="input !bg-surface-950/50 !border-primary/20 !font-bold" value={data.bioTests} onChange={e=>setData({...data, bioTests: Number(e.target.value)})} />
                </div>
                <div className="space-y-3">
                  <label className="label !text-primary/60">CAPEX Đầu tư</label>
                  <input type="number" className="input !bg-surface-950/50 !border-primary/20 !font-bold" value={data.equipmentCost} onChange={e=>setData({...data, equipmentCost: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-end">
               <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Chi phí hàng tháng:</span>
               <span className="text-xl font-black" style={{ color: 'var(--text-1)' }}>{formatVND(bioMonthly)}</span>
            </div>
          </div>
        </div>

        {/* Results Visualization */}
        <div className="bg-surface-900 border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full group-hover:bg-primary/10 transition-all duration-1000" />
          <div className="relative flex flex-col md:flex-row gap-12 justify-between items-center">
            <div className="space-y-2 text-center md:text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--text-3)' }}>Annual Optimization Value</div>
              <div className={`text-6xl font-black tracking-tighter ${annualSavings > 0 ? 'text-primary drop-shadow-glow' : 'text-red-500'}`}>
                {formatVND(annualSavings)}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Lợi ích kinh tế trực tiếp hàng năm</div>
            </div>
            
            <div className="flex gap-12 divide-x divide-white/5">
              <div className="pl-12 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Monthly Gaining</div>
                <div className={`text-3xl font-black ${monthlySavings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatVND(monthlySavings)}
                </div>
              </div>
               <div className="pl-12 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Payback Period</div>
                <div className="text-3xl font-black italic tracking-tighter uppercase" style={{ color: 'var(--text-1)' }}>
                  {payback > 0 ? `${payback} Months` : 'Instant ROI'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. PRICE POSITIONING ─────────────────────────────────────────────────────
function PricePositioning() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(({data}) => { setProducts(data || []); setLoading(false); });
  }, []);

  const positioningData = products.filter(p => p.competitor_alternatives && p.competitor_alternatives.length > 0);

  return (
    <div className="p-8 space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4" style={{ color: 'var(--text-1)' }}>
            <div className="w-2 h-8 bg-primary rounded-full shadow-glow-sm" />
            Bản đồ Định Giá Chiến Lược
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 ml-6" style={{ color: 'var(--text-3)' }}>Competitive Intelligence Engine</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow-sm">
          Real-time Market Data
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-16">
          {CATEGORIES.map(category => {
            const catProducts = positioningData.filter(p => p.category === category.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-6 mb-8 group">
                  <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] whitespace-nowrap">{category.label}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent shadow-glow-sm" />
                </div>
                
                <div className="table-container rounded-3xl border border-white/5 bg-surface-950/20 overflow-hidden shadow-2xl">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-1/4">Sản Phẩm Biomedia</th>
                        <th className="w-1/6">Giá niêm yết</th>
                        <th className="w-1/4">Đối thủ cạnh tranh</th>
                        <th className="w-1/6">Giá Đối Thủ</th>
                        <th>Kênh Chênh Lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {catProducts.map(p => (
                        p.competitor_alternatives.map((alt, idx) => {
                          const gap = p.list_price - alt.price;
                          const pctGap = alt.price > 0 ? (gap / alt.price) * 100 : 0;
                          const isCheaper = gap <= 0;

                          return (
                            <tr key={`${p.id}-${idx}`} className="group hover:bg-white/5 transition-all">
                              {idx === 0 && (
                                <td rowSpan={p.competitor_alternatives.length} className="px-6 py-8 font-black align-top border-r border-white/5 group-hover:text-primary transition-colors" style={{ color: 'var(--text-1)' }}>
                                  {p.name}
                                </td>
                              )}
                              {idx === 0 && (
                                <td rowSpan={p.competitor_alternatives.length} className="px-4 py-8 font-black text-primary align-top border-r border-white/5 drop-shadow-glow">
                                  {formatVND(p.list_price)}
                                </td>
                              )}
                              <td className="px-6 py-6">
                                <div className="font-bold uppercase text-xs group-hover:text-white transition-colors" style={{ color: 'var(--text-2)' }}>{alt.competitor}</div>
                                <div className="text-[10px] italic mt-1 font-medium" style={{ color: 'var(--text-3)' }}>{alt.product}</div>
                              </td>
                              <td className="px-4 py-6 font-bold font-mono" style={{ color: 'var(--text-1)' }}>{formatVND(alt.price)}</td>
                              <td className="px-6 py-6">
                                <div className={`inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border
                                  ${isCheaper ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow-sm shadow-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
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
