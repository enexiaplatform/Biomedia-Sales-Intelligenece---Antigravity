import { useState, useEffect } from "react";
import { 
  Package, Tag, Map, GitBranch, Plus, Search, Edit2, Trash2, X, PlusCircle, Save 
} from "lucide-react";
import { PageLoader } from "../components/LoadingSpinner";
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  fetchMarketSizing, createMarketSizing, updateMarketSizing, deleteMarketSizing
} from "../lib/supabase";

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatTienTy = (val) => `${(val / 1000000000).toFixed(1)} tỷ ₫`;

const TABS = [
  { id: "catalog", label: "Danh Mục Sản Phẩm", icon: Tag },
  { id: "market", label: "Thị Trường (TAM/SAM/SOM)", icon: Map },
  { id: "gtm", label: "GTM / RTM Strategy", icon: GitBranch },
];

export default function ProductManagement({ showToast }) {
  const [activeTab, setActiveTab] = useState("catalog");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sản Phẩm</h1>
          <p className="text-sm text-gray-500">Danh mục & thông tin sản phẩm Biomedia</p>
        </div>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        {activeTab === "catalog" && <ProductCatalog showToast={showToast} />}
        {activeTab === "market" && <MarketSizing showToast={showToast} />}
        {activeTab === "gtm" && <GTMStrategy />}
      </div>
    </div>
  );
}

// ── 1. PRODUCT CATALOG ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "equipment", label: "Thiết bị" },
  { id: "reagent", label: "Hóa chất" },
  { id: "culture_media", label: "Môi trường" },
  { id: "consumable", label: "Vật tư tiêu hao" },
  { id: "service", label: "Dịch vụ" }
];

function ProductCatalog({ showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await fetchProducts();
    setProducts(data || []);
    setLoading(false);
  }

  const filtered = products.filter(p => {
    const matchCat = filterCategory ? p.category === filterCategory : true;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const validProducts = products.filter(p => p.list_price > 0 && p.cost >= 0);
  const avgMargin = validProducts.length > 0 
    ? validProducts.reduce((sum, p) => sum + ((p.list_price - p.cost) / p.list_price * 100), 0) / validProducts.length 
    : 0;
  const avgPrice = validProducts.length > 0 
    ? validProducts.reduce((sum, p) => sum + Number(p.list_price), 0) / validProducts.length 
    : 0;
  const uniqueCategories = new Set(products.map(p => p.category)).size;

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
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Tổng sản phẩm" value={products.length} />
        <StatCard title="Biên lợi nhuận TB" value={`${avgMargin.toFixed(1)}%`} />
        <StatCard title="Giá trung bình" value={formatVND(avgPrice)} />
        <StatCard title="Số danh mục" value={uniqueCategories} />
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between border-b pb-4 border-gray-100">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm theo tên hoặc SKU..." className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
          <table className="table min-w-[800px]">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th>Đơn vị</th>
                <th>Giá niêm yết</th>
                <th>Giá vốn</th>
                <th>Biên LN</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const margin = p.list_price > 0 ? ((p.list_price - p.cost) / p.list_price) * 100 : 0;
                let badgeClass = "bg-red-100 text-red-700";
                if (margin >= 40) badgeClass = "bg-green-100 text-green-700";
                else if (margin >= 20) badgeClass = "bg-yellow-100 text-yellow-700";

                return (
                  <tr key={p.id}>
                    <td className="text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="font-medium text-gray-900">{p.name}</td>
                    <td>
                      <span className="badge bg-gray-100 text-gray-700">
                        {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                      </span>
                    </td>
                    <td>{p.unit || "—"}</td>
                    <td className="font-medium text-blue-700">{formatVND(p.list_price)}</td>
                    <td className="text-gray-500">{formatVND(p.cost)}</td>
                    <td><span className={`badge ${badgeClass}`}>{margin.toFixed(1)}%</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="text-center py-12 text-gray-500">Chưa có sản phẩm. Bấm "+ Thêm Sản Phẩm" để bắt đầu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => setModalOpen(false)} 
          onSave={() => { setModalOpen(false); showToast("Đã lưu sản phẩm"); loadProducts(); }} 
        />
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</div>
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || {
    name: "", sku: "", category: "equipment", unit: "", list_price: 0, cost: 0, description: "", usp: "", competitor_alternatives: []
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const addCompetitor = () => setForm({ 
    ...form, competitor_alternatives: [...(form.competitor_alternatives || []), { brand: "", product: "", price: 0 }] 
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
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
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
                <label className="label">Danh mục *</label>
                <select required name="category" className="input" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Đơn vị</label>
                <input name="unit" className="input" placeholder="kit, hộp, cái..." value={form.unit} onChange={handleChange} />
              </div>
              <div></div>
              <div>
                <label className="label">Giá niêm yết (VNĐ) *</label>
                <input required type="number" name="list_price" className="input" value={form.list_price} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Giá vốn (VNĐ)</label>
                <input type="number" name="cost" className="input" value={form.cost} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="label">Mô tả</label>
                <textarea rows={2} name="description" className="input" value={form.description} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <label className="label">USP - Điểm bán hàng độc đáo</label>
                <textarea rows={2} name="usp" className="input" placeholder="Lý do khách hàng chọn sản phẩm này..." value={form.usp} onChange={handleChange} />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="label !mb-0">Đối thủ cạnh tranh</label>
                <button type="button" onClick={addCompetitor} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                  <PlusCircle size={14} /> Thêm đối thủ
                </button>
              </div>
              {(form.competitor_alternatives || []).map((alt, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-100">
                  <input placeholder="Hãng (Brand)..." className="input flex-1" value={alt.brand} onChange={e => updateCompetitor(idx, 'brand', e.target.value)} />
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

// ── 2. MARKET SIZING ────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "pharma_microbio", label: "QC Vi sinh Dược phẩm" },
  { id: "fnb_qc", label: "Kiểm nghiệm F&B" },
  { id: "hospital_lab", label: "Lab bệnh viện" },
  { id: "research_lab", label: "Phòng thí nghiệm nghiên cứu" }
];

function MarketSizing({ showToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetchMarketSizing();
    setData(res.data || []);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Xóa dữ liệu này?")) return;
    await deleteMarketSizing(id);
    loadData();
    showToast("Đã xóa");
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Phân Phân Tích Thị Trường (TAM/SAM/SOM)</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={15}/> Thêm Dữ Liệu
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="font-medium text-gray-700">Mô hình Funnel Thị Trường</h3>
          {data.length === 0 ? (
            <div className="text-gray-500 text-sm p-8 bg-gray-50 rounded text-center border border-dashed border-gray-300">
              Chưa có dữ liệu vẽ biểu đồ.
            </div>
          ) : (
            data.map(item => <MarketFunnel key={item.id} item={item} />)
          )}
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-4">Dữ liệu chi tiết</h3>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="table text-sm min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th>Phân khúc</th>
                  <th>Khu vực</th>
                  <th>Năm</th>
                  <th>TAM</th>
                  <th>SAM</th>
                  <th>SOM</th>
                  <th>B.Share</th>
                  <th>Tăng trưởng</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium">{SEGMENTS.find(s=>s.id===d.segment)?.label || d.segment}</td>
                    <td>{d.region}</td>
                    <td>{d.year}</td>
                    <td>{formatTienTy(d.tam)}</td>
                    <td>{formatTienTy(d.sam)}</td>
                    <td>{formatTienTy(d.som)}</td>
                    <td className="font-semibold text-blue-700">{formatTienTy(d.biomedia_share)}</td>
                    <td className="text-green-600">{(d.growth_rate * 100).toFixed(0)}%</td>
                    <td>
                      <button onClick={()=>handleDelete(d.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="9" className="text-center py-10 text-gray-500">Chưa có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && <MarketModal onClose={()=>setModalOpen(false)} onSave={()=>{setModalOpen(false); loadData(); showToast("Đã lưu dữ liệu");}} />}
    </div>
  );
}

function MarketFunnel({ item }) {
  const max = item.tam || 1;
  const pctSAM = (item.sam / max) * 100;
  const pctSOM = (item.som / max) * 100;
  const pctShare = (item.biomedia_share / max) * 100;

  return (
    <div className="card p-5 space-y-3">
      <div className="font-bold text-gray-800 mb-3">{SEGMENTS.find(s=>s.id===item.segment)?.label || item.segment} - {item.year} <span className="text-gray-500 font-normal">({item.region})</span></div>
      <div className="space-y-2">
        <FunnelBar label="TAM" value={item.tam} pct={100} color="bg-blue-200" text="text-blue-900" />
        <FunnelBar label="SAM" value={item.sam} pct={pctSAM} color="bg-teal-300" text="text-teal-900" />
        <FunnelBar label="SOM" value={item.som} pct={pctSOM} color="bg-green-400" text="text-green-900" />
        <FunnelBar label="Share" value={item.biomedia_share} pct={pctShare} color="bg-yellow-400" text="text-yellow-900" />
      </div>
    </div>
  );
}

function FunnelBar({ label, value, pct, color, text }) {
  return (
    <div className="flex items-center text-sm">
      <div className="w-12 font-medium text-gray-500">{label}</div>
      <div className="flex-1">
        <div className={`h-8 rounded flex items-center px-3 ${color} ${text} font-semibold transition-all duration-500 whitespace-nowrap overflow-hidden`} style={{ width: `${Math.max(pct, 15)}%`, minWidth: '80px' }}>
          {formatTienTy(value)} <span className="ml-1 opacity-70 font-normal text-xs">({pct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

function MarketModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    segment: "pharma_microbio", region: "Toàn quốc", year: new Date().getFullYear(),
    tam: 0, sam: 0, som: 0, biomedia_share: 0, growth_rate: 15, notes: ""
  });

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      year: Number(form.year),
      growth_rate: Number(form.growth_rate) / 100,
      tam: Number(form.tam) * 1000000000,
      sam: Number(form.sam) * 1000000000,
      som: Number(form.som) * 1000000000,
      biomedia_share: Number(form.biomedia_share) * 1000000000,
    };
    await createMarketSizing(payload);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Thêm Dữ Liệu Thị Trường</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Phân khúc</label>
              <select name="segment" className="input" value={form.segment} onChange={handleChange}>
                {SEGMENTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select name="region" className="input" value={form.region} onChange={handleChange}>
                <option value="Toàn quốc">Toàn quốc</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Miền Trung">Miền Trung</option>
                <option value="TP.HCM">TP.HCM</option>
              </select>
            </div>
            <div>
              <label className="label">Năm</label>
              <input type="number" name="year" className="input" value={form.year} onChange={handleChange} />
            </div>
            <div><label className="label">TAM (Tỷ VNĐ)</label><input type="number" step="0.1" name="tam" className="input" value={form.tam} onChange={handleChange} /></div>
            <div><label className="label">SAM (Tỷ VNĐ)</label><input type="number" step="0.1" name="sam" className="input" value={form.sam} onChange={handleChange} /></div>
            <div><label className="label">SOM (Tỷ VNĐ)</label><input type="number" step="0.1" name="som" className="input" value={form.som} onChange={handleChange} /></div>
            <div><label className="label">Share Biomedia (Tỷ VNĐ)</label><input type="number" step="0.1" name="biomedia_share" className="input bg-blue-50 text-blue-900 font-semibold" value={form.biomedia_share} onChange={handleChange} /></div>
            <div><label className="label">Tăng trưởng (%)</label><input type="number" name="growth_rate" className="input" value={form.growth_rate} onChange={handleChange} /></div>
            <div className="col-span-2">
              <label className="label">Ghi chú</label>
              <input name="notes" className="input" value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 mt-4 border-t">
             <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
             <button type="submit" className="btn-primary">Lưu Giá Trị</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 3. GTM / RTM STRATEGY ───────────────────────────────────────────────────
function GTMStrategy() {
  const gtmCards = [
    {
      title: "Pharma QC (Dược phẩm)",
      target: "QC Manager, Lab Manager, Procurement",
      msg: "GMP compliance, validated methods, technical support",
      channels: "Direct visit, seminar/webinar, tender",
      cycle: "3–6 tháng",
      products: "Sterility testing kits, Endotoxin LAL kits, Culture media",
      bgStyle: "bg-blue-50/50 border-blue-200",
      accent: "bg-blue-500",
      text: "text-blue-900"
    },
    {
      title: "F&B Manufacturing",
      target: "QC Director, R&D Manager, Factory Manager",
      msg: "Rapid testing, cost-per-test, food safety compliance",
      channels: "Direct visit, distributor network, trade shows",
      cycle: "1–3 tháng",
      products: "Microbiology rapid tests, Culture media, ATP testing",
      bgStyle: "bg-teal-50/50 border-teal-200",
      accent: "bg-teal-500",
      text: "text-teal-900"
    },
    {
      title: "Hospital & Clinical",
      target: "Lab Director, Procurement, Hospital Director",
      msg: "Reliability, after-sales support, clinical validation",
      channels: "Tender/đấu thầu, direct, medical distributor",
      cycle: "6–12 tháng (tender cycle)",
      products: "Culture media, ID/AST systems, QC materials",
      bgStyle: "bg-purple-50/50 border-purple-200",
      accent: "bg-purple-500",
      text: "text-purple-900"
    },
    {
      title: "Research & University",
      target: "Principal Investigator, Lab Manager, Admin",
      msg: "Wide catalog, technical expertise, competitive price",
      channels: "Direct, online, demo",
      cycle: "2–4 tuần",
      products: "All categories",
      bgStyle: "bg-orange-50/50 border-orange-200",
      accent: "bg-orange-500",
      text: "text-orange-900"
    }
  ];

  return (
    <div className="p-6 md:p-8 space-y-12">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Go-To-Market (GTM) Strategy</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {gtmCards.map((c, i) => (
            <div key={i} className={`p-6 rounded-xl border ${c.bgStyle} relative overflow-hidden transition-all hover:shadow-md`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${c.accent}`}></div>
              <h3 className={`text-lg font-bold ${c.text} mb-4`}>{c.title}</h3>
              <div className="space-y-3 text-sm">
                <div><span className="font-semibold text-gray-700">Người quyết định:</span> <span className="text-gray-900">{c.target}</span></div>
                <div><span className="font-semibold text-gray-700">Thông điệp cốt lõi:</span> <span className="text-gray-900">{c.msg}</span></div>
                <div><span className="font-semibold text-gray-700">Kênh tiếp cận:</span> <span className="text-gray-900">{c.channels}</span></div>
                <div><span className="font-semibold text-gray-700">Chu kỳ sale:</span> <span className="text-gray-900">{c.cycle}</span></div>
                <div className="pt-2"><span className="inline-block px-3 py-1 bg-white rounded-md text-xs font-semibold text-gray-700 border border-gray-200 shadow-sm">Key Products: {c.products}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-10">
         <h2 className="text-xl font-bold text-gray-900 mb-6">Route-To-Market (RTM) Model</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="card shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
             <div className="bg-gray-50/80 border-b p-4 text-center font-bold text-gray-800">Direct Sales</div>
             <ul className="p-6 space-y-4 text-sm text-gray-700">
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> Key accounts pharma</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> F&B large factories</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> Henry handles directly</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> High margin, long cycle</li>
             </ul>
           </div>
           <div className="card shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
             <div className="bg-gray-50/80 border-b p-4 text-center font-bold text-gray-800">Distribution (Đại lý)</div>
             <ul className="p-6 space-y-4 text-sm text-gray-700">
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></div> Tỉnh/thành xa</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></div> F&B SME</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></div> Partner network</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></div> Lower margin, volume</li>
             </ul>
           </div>
           <div className="card shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
             <div className="bg-gray-50/80 border-b p-4 text-center font-bold text-gray-800">Tender / Đấu thầu</div>
             <ul className="p-6 space-y-4 text-sm text-gray-700">
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div> Bệnh viện, viện NC</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div> Government/State</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div> Formal procurement</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div> Fixed price, compliance</li>
             </ul>
           </div>
         </div>
      </div>
    </div>
  );
}

