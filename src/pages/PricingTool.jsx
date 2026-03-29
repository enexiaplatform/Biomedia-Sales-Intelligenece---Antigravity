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
      <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
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
          <table className="table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Mã (SKU)</th>
                <th>Danh mục</th>
                <th>Giá niêm yết</th>
                <th>Đơn vị</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-gray-500">{p.sku || "—"}</td>
                  <td>
                    <span className="badge bg-gray-100 text-gray-700">
                      {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                    </span>
                  </td>
                  <td className="font-medium text-blue-700">{formatVND(p.list_price)}</td>
                  <td>{p.unit || "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Không tìm thấy sản phẩm nào</td></tr>
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
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700"
    };
    const labels = { draft: "Nháp", sent: "Đã Gửi", accepted: "Chốt Deal", rejected: "Báo Rớt" };
    return <span className={`badge ${map[status] || map.draft}`}>{labels[status] || status}</span>;
  };

  if (view !== "list") {
    return <QuoteForm showToast={showToast} onBack={() => setView('list')} />;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Danh sách Báo giá</h2>
        <button onClick={() => setView('create')} className="btn-primary"><Plus size={15}/> Tạo Báo Giá Mới</button>
      </div>
      
      {loading ? <PageLoader /> : (
        <table className="table">
          <thead>
            <tr>
              <th>Báo giá</th>
              <th>Khách hàng</th>
              <th>Ngày tạo</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id}>
                <td className="font-medium text-blue-600">{q.name}</td>
                <td>{q.accounts?.name || "—"}</td>
                <td className="text-gray-500">{format(new Date(q.created_at), "dd/MM/yyyy")}</td>
                <td className="font-semibold">{formatVND(q.grand_total)}</td>
                <td>{getStatusBadge(q.status)}</td>
                <td>
                  <button onClick={async () => {
                    if(confirm("Xóa báo giá này?")) {
                      await deleteQuote(q.id);
                      loadQuotes();
                    }
                  }} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && <tr><td colSpan="6" className="text-center py-8">Chưa có báo giá nào.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function QuoteForm({ onBack, showToast }) {
  const [form, setForm] = useState({ name: "", account_id: "", status: "draft", items: [], notes: "", valid_until: "" });
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  
  useEffect(() => {
    fetchAccounts().then(({data}) => setAccounts(data || []));
    fetchProducts().then(({data}) => setProducts(data || []));
  }, []);

  const addItem = (product) => {
    setForm(f => ({
      ...f,
      items: [...f.items, { product_id: product.id, name: product.name, qty: 1, unit_price: product.list_price, discount_pct: 0, total: product.list_price }]
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
  const totalDiscount = subtotal - grandTotal;
  const avgDiscountPct = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;

  const handleSave = async () => {
    if (!form.name || !form.account_id) return showToast("Vui lòng nhập tên Báo giá và chọn Khách hàng", "error");
    const payload = { ...form, subtotal, total_discount: totalDiscount, grand_total: grandTotal };
    const { error } = await createQuote(payload);
    if(error) showToast(error.message, "error");
    else { showToast("Lưu báo giá thành công"); onBack(); }
  };

  const searchedProducts = productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [];

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-900"><X size={18}/></button>
          Soạn Báo Giá Mới
        </h2>
        <div className="flex gap-2">
          <select className="input input-sm py-1" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="draft">Nháp</option>
            <option value="sent">Đã Gửi</option>
            <option value="accepted">Chốt Deal</option>
          </select>
          <button onClick={handleSave} className="btn-primary py-1"><Save size={14}/> Lưu</button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
        <div className="col-span-2 space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-medium">Thông tin chung</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Tên báo giá (VD: Báo giá MT nuôi cấy Q3)</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="label">Khách hàng</label>
                <select className="input" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                  <option value="">-- Chọn khách hàng --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-medium">Sản phẩm & Dịch vụ</h3>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                placeholder="Tìm sản phẩm để thêm vào báo giá..." 
                className="input pl-9" 
                value={productSearch} 
                onChange={e => setProductSearch(e.target.value)} 
              />
              {productSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchedProducts.map(p => (
                    <div key={p.id} className="p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center" onClick={() => addItem(p)}>
                      <div><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.sku}</div></div>
                      <div className="text-sm text-blue-600">{formatVND(p.list_price)}</div>
                    </div>
                  ))}
                  {searchedProducts.length===0 && <div className="p-3 text-sm text-gray-500">Không tìm thấy sản phẩm.</div>}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="table text-sm">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th>Sản phẩm</th>
                    <th className="w-20">SL</th>
                    <th className="w-32">Đơn giá (VNĐ)</th>
                    <th className="w-20">Giảm(%)</th>
                    <th className="w-32">Thành tiền</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{item.name}</td>
                      <td><input type="number" min="1" className="input p-1" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} /></td>
                      <td><input type="number" className="input p-1" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} /></td>
                      <td><input type="number" min="0" max="100" className="input p-1" value={item.discount_pct} onChange={e => updateItem(idx, 'discount_pct', Number(e.target.value))} /></td>
                      <td className="font-semibold text-blue-700">{formatVND(item.total)}</td>
                      <td><button onClick={()=>removeItem(idx)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                  {form.items.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-gray-400">Chưa có sản phẩm nào. Tìm và thêm ở trên.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-medium">Tổng quan</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính:</span>
                <span className="font-medium">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Chiết khấu ({avgDiscountPct.toFixed(1)}%):</span>
                <span>-{formatVND(totalDiscount)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-medium text-gray-900">Tổng cộng:</span>
                <span className="text-xl font-bold text-blue-700">{formatVND(grandTotal)}</span>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <label className="label">Ghi chú cho KH</label>
            <textarea className="input" rows="4" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Vd: Hiệu lực báo giá 30 ngày..." />
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
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">ROI Calculator - Công cụ thuyết phục khách hàng</h2>
          <p className="text-gray-500 mt-2">Nhập thông tin so sánh chi phí để tính toán hiệu quả đầu tư khi chuyển sang dùng Biomedia.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="card p-6 space-y-5 border-l-4 border-l-gray-400">
            <h3 className="font-semibold text-lg">Hiện tại (Đối thủ)</h3>
            <div>
              <label className="label">Chi phí mỗi test (VNĐ)</label>
              <input type="number" className="input text-lg font-medium" value={data.currentCost} onChange={e=>setData({...data, currentCost: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">Số lượng test / tháng</label>
              <input type="number" className="input" value={data.currentTests} onChange={e=>setData({...data, currentTests: Number(e.target.value)})} />
            </div>
          </div>

          <div className="card p-6 space-y-5 border-l-4 border-l-blue-500 bg-blue-50/20">
            <h3 className="font-semibold text-lg text-blue-800">Giải pháp Biomedia</h3>
            <div>
              <label className="label">Chi phí mỗi test (VNĐ)</label>
              <input type="number" className="input text-lg font-medium border-blue-200 focus:border-blue-500 focus:ring-blue-500" value={data.bioPrice} onChange={e=>setData({...data, bioPrice: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Số lượng test</label>
                <input type="number" className="input border-blue-200" value={data.bioTests} onChange={e=>setData({...data, bioTests: Number(e.target.value)})} />
              </div>
              <div>
                <label className="label text-xs">Phí chuyển đổi/Máy móc (Tuỳ chọn)</label>
                <input type="number" className="input border-blue-200" value={data.equipmentCost} onChange={e=>setData({...data, equipmentCost: Number(e.target.value)})} />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card bg-gray-900 text-white p-8 mt-6">
          <h3 className="text-gray-400 font-medium mb-6 uppercase tracking-wider text-sm">Kết quả tiết kiệm</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-700">
            <div className="pt-4 md:pt-0">
              <div className="text-gray-400 text-sm mb-1">Tiết kiệm hằng tháng</div>
              <div className={`text-3xl font-bold ${monthlySavings > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatVND(monthlySavings)}
              </div>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <div className="text-gray-400 text-sm mb-1">Tiết kiệm hằng năm</div>
              <div className={`text-4xl font-bold ${annualSavings > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatVND(annualSavings)}
              </div>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <div className="text-gray-400 text-sm mb-1">Thời gian hoàn vốn / Hoà vốn</div>
              <div className="text-3xl font-bold text-white">
                {payback > 0 ? `${payback} tháng` : 'Ngay lập tức'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. PRICE POSITIONING ──────────────────────────────────────────────────────
function PricePositioning() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(({data}) => { setProducts(data || []); setLoading(false); });
  }, []);

  // Filter products that actually have competitor alternatives
  const positioningData = products.filter(p => p.competitor_alternatives && p.competitor_alternatives.length > 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Bản đồ Định Giá (Price Positioning)</h2>
        <p className="text-sm text-gray-500">So sánh trực tiếp giá các sản phẩm của ta với đối thủ cạnh tranh trên thị trường.</p>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {CATEGORIES.map(category => {
            const catProducts = positioningData.filter(p => p.category === category.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={category.id} className="card overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{category.label}</h3>
                </div>
                <table className="table min-w-full">
                  <thead>
                    <tr className="bg-white">
                      <th className="w-1/4">Sản Phẩm Biomedia</th>
                      <th className="w-1/6">Giá Chúng Ta</th>
                      <th className="w-1/4">Đối thủ / Sản phẩm</th>
                      <th className="w-1/6">Giá Đối Thủ</th>
                      <th>Lợi thế Cạnh Tranh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catProducts.map(p => (
                      p.competitor_alternatives.map((alt, idx) => {
                        const gap = p.list_price - alt.price;
                        const pctGap = alt.price > 0 ? (gap / alt.price) * 100 : 0;
                        const isCheaper = gap <= 0;

                        return (
                          <tr key={`${p.id}-${idx}`}>
                            {idx === 0 && (
                              <td rowSpan={p.competitor_alternatives.length} className="align-top font-medium bg-gray-50/30">
                                {p.name}
                              </td>
                            )}
                            {idx === 0 && (
                              <td rowSpan={p.competitor_alternatives.length} className="align-top font-semibold text-blue-700 bg-gray-50/30">
                                {formatVND(p.list_price)}
                              </td>
                            )}
                            <td>
                              <div className="font-medium text-gray-800">{alt.competitor}</div>
                              <div className="text-xs text-gray-500">{alt.product}</div>
                            </td>
                            <td>{formatVND(alt.price)}</td>
                            <td>
                              <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                ${isCheaper ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                {isCheaper ? 'Rẻ hơn' : 'Đắt hơn'} {Math.abs(pctGap).toFixed(1)}%
                              </div>
                              {p.usp && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.usp}</div>}
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {positioningData.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-500">
              Không có dữ liệu định giá. Hãy thêm đối thủ cạnh tranh vào các sản phẩm trong tab Danh mục.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
