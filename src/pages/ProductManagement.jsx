import { useState, useEffect } from "react";
import {
  Package, Tag, Map, GitBranch, Plus, Search, Edit2, Trash2, X, PlusCircle, Save, FileText, Upload, BrainCircuit, ExternalLink, Download, Sparkles
} from "lucide-react";
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  fetchMarketSizing, createMarketSizing, updateMarketSizing, deleteMarketSizing,
  uploadProductDoc, listProductDocs, getProductDocUrl, deleteProductDoc
} from "../lib/supabase";
import { callAISalesCoach } from "../lib/ai";
import TenderAssistantModal from "../components/TenderAssistantModal";
import AIProductSupportModal from "../components/AIProductSupportModal";
import { PageLoader } from "../components/LoadingSpinner";

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatTienTy = (val) => `${(val / 1000000000).toFixed(1)} tỷ ₫`;

const TABS = [
  { id: "catalog", label: "Danh Mục Sản Phẩm", icon: Tag },
  { id: "docs", label: "Tài Liệu Kỹ Thuật", icon: FileText },
  { id: "market", label: "Thị Trường (TAM/SAM/SOM)", icon: Map },
  { id: "gtm", label: "GTM / RTM Strategy", icon: GitBranch },
];

export default function ProductManagement({ showToast }) {
  const [activeTab, setActiveTab] = useState("catalog");

  return (
    <div className="space-y-6 w-full px-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: 'var(--text-1)' }}>Sản Phẩm</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Danh mục & Tài liệu kỹ thuật Biomedia</p>
        </div>
      </div>

      <div className="flex rounded-2xl shadow-xl p-1 overflow-x-auto scrollbar-hide" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              style={isActive
                ? { background: 'var(--brand-bg)', color: 'var(--brand)' }
                : { color: 'var(--text-2)' }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl shadow-2xl overflow-hidden min-h-[500px] relative" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
        {activeTab === "catalog" && <ProductCatalog showToast={showToast} />}
        {activeTab === "docs" && <ProductDocuments showToast={showToast} />}
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

      <div className="flex flex-wrap items-center gap-3 justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
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
                let badgeBg = 'var(--brand-bg)';
                let badgeColor = 'var(--brand)';
                if (margin >= 40) { badgeBg = 'rgba(34,197,94,0.1)'; badgeColor = '#16a34a'; }
                else if (margin >= 20) { badgeBg = 'rgba(234,179,8,0.1)'; badgeColor = '#ca8a04'; }

                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs" style={{ color: 'var(--text-2)' }}>{p.sku || "—"}</td>
                    <td className="font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                        {CATEGORIES.find(c => c.id === p.category)?.label || p.category}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-1)' }}>{p.unit || "—"}</td>
                    <td className="font-medium" style={{ color: 'var(--brand)' }}>{formatVND(p.list_price)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{formatVND(p.cost)}</td>
                    <td>
                      <span className="badge" style={{ background: badgeBg, color: badgeColor }}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} style={{ color: 'var(--text-3)' }} className="hover:text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} style={{ color: 'var(--text-3)' }} className="hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="text-center py-12" style={{ color: 'var(--text-2)' }}>Chưa có sản phẩm. Bấm "+ Thêm Sản Phẩm" để bắt đầu.</td></tr>
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
    <div className="p-5 rounded-2xl transition-all" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>{title}</div>
      <div className="text-2xl font-black tracking-tight truncate" style={{ color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

// ── 1.5. PRODUCT DOCUMENTS ───────────────────────────────────────────────────
function ProductDocuments({ showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tenderModal, setTenderModal] = useState(null);
  const [aiSupportModal, setAiSupportModal] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await fetchProducts();
    setProducts(data || []);
    if (data?.length > 0) handleSelectProduct(data[0]);
    setLoading(false);
  }

  async function handleSelectProduct(product) {
    setSelectedProduct(product);
    const { data, error } = await listProductDocs(product.id);
    if (!error) setDocs(data || []);
  }

  async function handleUpload(e) {
    if (!selectedProduct || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const path = `${selectedProduct.id}/${Date.now()}_${file.name}`;

    setUploading(true);
    const { error } = await uploadProductDoc(file, path);
    setUploading(false);

    if (error) showToast(error.message, "error");
    else {
      showToast("Đã tải lên tài liệu");
      handleSelectProduct(selectedProduct);
    }
  }

  async function handleDeleteDoc(name) {
    if (!confirm("Xác nhận xoá tài liệu này?")) return;
    const path = `${selectedProduct.id}/${name}`;
    const { error } = await deleteProductDoc(path);
    if (error) showToast(error.message, "error");
    else {
      showToast("Đã xoá tài liệu");
      handleSelectProduct(selectedProduct);
    }
  }

  async function handleDownload(name) {
    const path = `${selectedProduct.id}/${name}`;
    const url = await getProductDocUrl(path);
    if (url) window.open(url, "_blank");
  }

  if (loading) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-[700px]">
       {/* Sidebar: Product List */}
       <div className="flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                <input type="text" placeholder="Tìm sản phẩm..." className="input pl-9 h-10 text-xs" />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
             {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all"
                  style={selectedProduct?.id === p.id
                    ? { background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }
                    : { color: 'var(--text-2)', border: '1px solid transparent' }}
                >
                   <div className="text-xs font-black uppercase tracking-tight truncate">{p.name}</div>
                   <div className="text-[10px] opacity-60 mt-0.5">{p.sku || 'No SKU'}</div>
                </button>
             ))}
          </div>
       </div>

       {/* Content: Document List & AI Tools */}
       <div className="lg:col-span-2 flex flex-col relative" style={{ background: 'var(--bg-surface)' }}>
          {selectedProduct ? (
            <>
              <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                 <div>
                    <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-1)' }}>{selectedProduct.name}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-3)' }}>Quản lý tài liệu & Hỗ trợ kỹ thuật</p>
                 </div>
                 <div className="flex gap-2">
                    <button
                      onClick={() => setAiSupportModal(selectedProduct)}
                      className="btn-primary h-10 px-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-glow-sm"
                    >
                       <BrainCircuit size={16} /> Technical Q&A
                    </button>
                    <button
                      onClick={() => setTenderModal(selectedProduct)}
                      className="btn-secondary h-10 px-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-inner"
                      style={{ color: 'var(--brand)', borderColor: 'var(--brand-border)' }}
                    >
                       <Sparkles size={16} style={{ color: 'var(--brand)' }} /> Tender Assist
                    </button>
                 </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload Card */}
                    <label className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group active:scale-95" style={{ border: '2px dashed var(--border)', background: 'var(--bg-elevated)' }}>
                       <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                       <div className="p-4 rounded-2xl transition-colors" style={{ background: 'var(--bg-base)' }}>
                          <Upload size={32} className={`transition-colors ${uploading ? 'animate-bounce' : ''}`} style={{ color: 'var(--text-3)' }} />
                       </div>
                       <div className="text-center">
                          <div className="text-sm font-black uppercase tracking-widest leading-loose" style={{ color: 'var(--text-1)' }}>Tải lên Catalogue</div>
                          <p className="text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>PDF, JPG hoặc PNG (Max 10MB)</p>
                       </div>
                    </label>

                    {/* Doc Cards */}
                    {docs.map(doc => (
                       <div key={doc.name} className="rounded-2xl p-5 flex flex-col group transition-all" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <div className="flex items-start justify-between mb-4">
                             <div className="p-2.5 rounded-xl" style={{ background: 'var(--bg-base)' }}>
                                <FileText size={20} style={{ color: 'var(--brand)' }} />
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDownload(doc.name)} className="p-2 rounded-lg" style={{ background: 'var(--bg-base)', color: 'var(--text-2)' }}><Download size={14} /></button>
                                <button onClick={() => handleDeleteDoc(doc.name)} className="p-2 rounded-lg" style={{ background: 'var(--bg-base)', color: 'var(--text-2)' }}><Trash2 size={14} /></button>
                             </div>
                          </div>
                          <div className="flex-1">
                             <div className="text-xs font-black uppercase tracking-tight line-clamp-1 mb-1" style={{ color: 'var(--text-1)' }}>{doc.name.split('_').slice(1).join('_')}</div>
                             <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-2)' }}>{(doc.metadata?.size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <button
                            onClick={() => handleDownload(doc.name)}
                            className="mt-4 w-full h-9 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                            style={{ background: 'var(--bg-base)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                          >
                             Xem tài liệu <ExternalLink size={12} />
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40 uppercase font-black text-sm tracking-widest" style={{ color: 'var(--text-2)' }}>
               <div className="p-6 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                  <FileText size={48} />
               </div>
               Chọn một sản phẩm để quản lý tài liệu
            </div>
          )}
       </div>

       {tenderModal && (
         <TenderAssistantModal
           product={tenderModal}
           onClose={() => setTenderModal(null)}
           showToast={showToast}
         />
       )}
       {aiSupportModal && (
         <AIProductSupportModal
           product={aiSupportModal}
           onClose={() => setAiSupportModal(null)}
           showToast={showToast}
         />
       )}
    </div>
  );
}

function ProductStatCard({ title, value }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{title}</div>
      <div className="text-xl font-bold mt-1 truncate" style={{ color: 'var(--text-1)' }}>{value}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>{product ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X size={20}/></button>
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

            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <label className="label !mb-0">Đối thủ cạnh tranh</label>
                <button type="button" onClick={addCompetitor} className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                  <PlusCircle size={14} /> Thêm đối thủ
                </button>
              </div>
              {(form.competitor_alternatives || []).map((alt, idx) => (
                <div key={idx} className="flex gap-2 items-center mb-2 p-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <input placeholder="Hãng (Brand)..." className="input flex-1" value={alt.brand} onChange={e => updateCompetitor(idx, 'brand', e.target.value)} />
                  <input placeholder="Sản phẩm..." className="input flex-1" value={alt.product} onChange={e => updateCompetitor(idx, 'product', e.target.value)} />
                  <input type="number" placeholder="Giá..." className="input w-32" value={alt.price} onChange={e => updateCompetitor(idx, 'price', Number(e.target.value))} />
                  <button type="button" onClick={() => removeCompetitor(idx)} className="p-2" style={{ color: 'var(--text-3)' }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </form>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
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
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Phân Phân Tích Thị Trường (TAM/SAM/SOM)</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={15}/> Thêm Dữ Liệu
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="font-medium" style={{ color: 'var(--text-2)' }}>Mô hình Funnel Thị Trường</h3>
          {data.length === 0 ? (
            <div className="text-sm p-8 rounded text-center border border-dashed" style={{ color: 'var(--text-2)', background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              Chưa có dữ liệu vẽ biểu đồ.
            </div>
          ) : (
            data.map(item => <MarketFunnel key={item.id} item={item} />)
          )}
        </div>

        <div>
          <h3 className="font-medium mb-4" style={{ color: 'var(--text-2)' }}>Dữ liệu chi tiết</h3>
          <div className="rounded-lg overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
            <table className="table text-sm min-w-[600px]">
              <thead>
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
                    <td className="font-medium" style={{ color: 'var(--text-1)' }}>{SEGMENTS.find(s=>s.id===d.segment)?.label || d.segment}</td>
                    <td style={{ color: 'var(--text-1)' }}>{d.region}</td>
                    <td style={{ color: 'var(--text-1)' }}>{d.year}</td>
                    <td style={{ color: 'var(--text-1)' }}>{formatTienTy(d.tam)}</td>
                    <td style={{ color: 'var(--text-1)' }}>{formatTienTy(d.sam)}</td>
                    <td style={{ color: 'var(--text-1)' }}>{formatTienTy(d.som)}</td>
                    <td className="font-semibold" style={{ color: 'var(--brand)' }}>{formatTienTy(d.biomedia_share)}</td>
                    <td style={{ color: '#16a34a' }}>{(d.growth_rate * 100).toFixed(0)}%</td>
                    <td>
                      <button onClick={()=>handleDelete(d.id)} style={{ color: 'var(--text-3)' }}><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="9" className="text-center py-10" style={{ color: 'var(--text-2)' }}>Chưa có dữ liệu</td></tr>}
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
      <div className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>
        {SEGMENTS.find(s=>s.id===item.segment)?.label || item.segment} - {item.year}{' '}
        <span className="font-normal" style={{ color: 'var(--text-2)' }}>({item.region})</span>
      </div>
      <div className="space-y-2">
        <FunnelBar label="TAM" value={item.tam} pct={100} color="rgba(59,130,246,0.2)" textColor="#1e3a5f" />
        <FunnelBar label="SAM" value={item.sam} pct={pctSAM} color="rgba(20,184,166,0.3)" textColor="#134e4a" />
        <FunnelBar label="SOM" value={item.som} pct={pctSOM} color="rgba(34,197,94,0.4)" textColor="#14532d" />
        <FunnelBar label="Share" value={item.biomedia_share} pct={pctShare} color="rgba(234,179,8,0.4)" textColor="#713f12" />
      </div>
    </div>
  );
}

function FunnelBar({ label, value, pct, color, textColor }) {
  return (
    <div className="flex items-center text-sm">
      <div className="w-12 font-medium" style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="flex-1">
        <div
          className="h-8 rounded flex items-center px-3 font-semibold transition-all duration-500 whitespace-nowrap overflow-hidden"
          style={{ width: `${Math.max(pct, 15)}%`, minWidth: '80px', background: color, color: textColor }}
        >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-lg" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Thêm Dữ Liệu Thị Trường</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X size={20}/></button>
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
            <div>
              <label className="label">Share Biomedia (Tỷ VNĐ)</label>
              <input type="number" step="0.1" name="biomedia_share" className="input" value={form.biomedia_share} onChange={handleChange} style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }} />
            </div>
            <div><label className="label">Tăng trưởng (%)</label><input type="number" name="growth_rate" className="input" value={form.growth_rate} onChange={handleChange} /></div>
            <div className="col-span-2">
              <label className="label">Ghi chú</label>
              <input name="notes" className="input" value={form.notes} onChange={handleChange} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
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
      accentColor: "#3b82f6",
      bgColor: "rgba(59,130,246,0.05)",
      borderColor: "rgba(59,130,246,0.2)",
      textColor: "var(--text-1)"
    },
    {
      title: "F&B Manufacturing",
      target: "QC Director, R&D Manager, Factory Manager",
      msg: "Rapid testing, cost-per-test, food safety compliance",
      channels: "Direct visit, distributor network, trade shows",
      cycle: "1–3 tháng",
      products: "Microbiology rapid tests, Culture media, ATP testing",
      accentColor: "#14b8a6",
      bgColor: "rgba(20,184,166,0.05)",
      borderColor: "rgba(20,184,166,0.2)",
      textColor: "var(--text-1)"
    },
    {
      title: "Hospital & Clinical",
      target: "Lab Director, Procurement, Hospital Director",
      msg: "Reliability, after-sales support, clinical validation",
      channels: "Tender/đấu thầu, direct, medical distributor",
      cycle: "6–12 tháng (tender cycle)",
      products: "Culture media, ID/AST systems, QC materials",
      accentColor: "var(--brand)",
      bgColor: "var(--brand-bg)",
      borderColor: "var(--brand-border)",
      textColor: "var(--text-1)"
    },
    {
      title: "Research & University",
      target: "Principal Investigator, Lab Manager, Admin",
      msg: "Wide catalog, technical expertise, competitive price",
      channels: "Direct, online, demo",
      cycle: "2–4 tuần",
      products: "All categories",
      accentColor: "#f97316",
      bgColor: "rgba(249,115,22,0.05)",
      borderColor: "rgba(249,115,22,0.2)",
      textColor: "var(--text-1)"
    }
  ];

  return (
    <div className="p-6 md:p-8 space-y-12">
      <div>
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-1)' }}>Go-To-Market (GTM) Strategy</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {gtmCards.map((c, i) => (
            <div key={i} className="p-6 rounded-xl relative overflow-hidden transition-all hover:shadow-md" style={{ background: c.bgColor, border: `1px solid ${c.borderColor}` }}>
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl" style={{ background: c.accentColor }}></div>
              <h3 className="text-lg font-bold mb-4" style={{ color: c.textColor }}>{c.title}</h3>
              <div className="space-y-3 text-sm">
                <div><span className="font-semibold" style={{ color: 'var(--text-2)' }}>Người quyết định:</span> <span style={{ color: 'var(--text-1)' }}>{c.target}</span></div>
                <div><span className="font-semibold" style={{ color: 'var(--text-2)' }}>Thông điệp cốt lõi:</span> <span style={{ color: 'var(--text-1)' }}>{c.msg}</span></div>
                <div><span className="font-semibold" style={{ color: 'var(--text-2)' }}>Kênh tiếp cận:</span> <span style={{ color: 'var(--text-1)' }}>{c.channels}</span></div>
                <div><span className="font-semibold" style={{ color: 'var(--text-2)' }}>Chu kỳ sale:</span> <span style={{ color: 'var(--text-1)' }}>{c.cycle}</span></div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold" style={{ background: 'var(--bg-surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    Key Products: {c.products}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
         <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-1)' }}>Route-To-Market (RTM) Model</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="card shadow-sm transition-colors">
             <div className="p-4 text-center font-bold" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>Direct Sales</div>
             <ul className="p-6 space-y-4 text-sm" style={{ color: 'var(--text-2)' }}>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#3b82f6' }}></div> Key accounts pharma</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#3b82f6' }}></div> F&B large factories</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#3b82f6' }}></div> Henry handles directly</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#3b82f6' }}></div> High margin, long cycle</li>
             </ul>
           </div>
           <div className="card shadow-sm transition-colors">
             <div className="p-4 text-center font-bold" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>Distribution (Đại lý)</div>
             <ul className="p-6 space-y-4 text-sm" style={{ color: 'var(--text-2)' }}>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#14b8a6' }}></div> Tỉnh/thành xa</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#14b8a6' }}></div> F&B SME</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#14b8a6' }}></div> Partner network</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#14b8a6' }}></div> Lower margin, volume</li>
             </ul>
           </div>
           <div className="card shadow-sm transition-colors">
             <div className="p-4 text-center font-bold" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}>Tender / Đấu thầu</div>
             <ul className="p-6 space-y-4 text-sm" style={{ color: 'var(--text-2)' }}>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--brand)' }}></div> Bệnh viện, viện NC</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--brand)' }}></div> Government/State</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--brand)' }}></div> Formal procurement</li>
               <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--brand)' }}></div> Fixed price, compliance</li>
             </ul>
           </div>
         </div>
      </div>
    </div>
  );
}
