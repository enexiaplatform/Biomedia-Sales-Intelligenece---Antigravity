import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  Radar, RefreshCw, Star, MapPin, 
  CheckCircle, Link as LinkIcon, Edit3, X, Building 
} from "lucide-react";
import { 
  fetchMarketIntel, 
  updateMarketIntel, 
  supabase
} from "../lib/supabase";
import { PageLoader } from "../components/LoadingSpinner";

// Enum mappings
const CATEGORY_MAP = {
  pharma_factory: { label: "Nhà máy Pharma", color: "bg-blue-50 text-blue-700 border-blue-200" },
  fnb_factory: { label: "Nhà máy F&B", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  gmp_license: { label: "GMP License", color: "bg-violet-50 text-violet-700 border-violet-200" },
  tender: { label: "Đấu thầu", color: "bg-amber-50 text-amber-700 border-amber-200" },
  regulatory: { label: "Quy định", color: "bg-gray-50 text-gray-700 border-gray-200" }
};

export default function MarketScan({ showToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyLeads, setOnlyLeads] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // 'newest', 'score'

  // Modal State
  const [accountModal, setAccountModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: intelData, error } = await fetchMarketIntel();
    if (!error && intelData) {
      setData(intelData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const resp = await fetch("https://mrliknubgtuyznqutfue.supabase.co/functions/v1/market-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({})
      });
      if (!resp.ok) throw new Error("Lỗi máy chủ khi quét dữ liệu.");
      showToast("Đang quét... Kết quả sẽ cập nhật sau vài phút");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateNotes = async (id, newNotes) => {
    const { error } = await updateMarketIntel(id, { notes: newNotes });
    if (error) {
      showToast("Lỗi khi lưu ghi chú", "error");
    } else {
      setData(prev => prev.map(item => item.id === id ? { ...item, notes: newNotes } : item));
      showToast("Đã lưu ghi chú tự động");
    }
  };

  // derived stats
  const totalCount = data.length;
  const leadCount = data.filter(d => d.is_lead_candidate).length;
  const convertedCount = data.filter(d => d.converted_to_account).length;
  const lastScanDate = data.length > 0 
    ? Math.max(...data.map(d => new Date(d.scan_date).getTime()))
    : null;

  // filtering
  let displayData = [...data];
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displayData = displayData.filter(d => 
      (d.title || "").toLowerCase().includes(q) || 
      (d.companies_mentioned || []).some(c => c.toLowerCase().includes(q))
    );
  }
  
  if (categoryFilter !== "all") {
    displayData = displayData.filter(d => d.category === categoryFilter);
  }
  
  if (onlyLeads) {
    displayData = displayData.filter(d => d.is_lead_candidate);
  }

  if (sortBy === "newest") {
    displayData.sort((a, b) => new Date(b.scan_date) - new Date(a.scan_date));
  } else if (sortBy === "score") {
    displayData.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm">
            <Radar size={28} className={isScanning ? "animate-pulse" : ""} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Market Scan</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tin tức & Cơ hội mới tại Việt Nam</p>
          </div>
        </div>
        <button 
          onClick={handleScanNow} 
          disabled={isScanning}
          className="btn-primary flex items-center gap-2 whitespace-nowrap h-12 px-6 rounded-xl shadow-sm relative z-10"
        >
          <RefreshCw size={18} className={isScanning ? "animate-spin" : ""} />
          <span className="font-bold">{isScanning ? "Đang quét..." : "Quét Ngay"}</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng tin tức" value={totalCount} />
        <StatCard label="Lead tiềm năng" value={leadCount} color="text-amber-400" />
        <StatCard label="Đã chuyển đổi" value={convertedCount} color="text-primary" />
        <StatCard 
          label="Lần quét gần nhất" 
          value={lastScanDate ? format(new Date(lastScanDate), "dd/MM/yyyy HH:mm") : "---"} 
          valueClassName="text-sm md:text-base"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center flex-wrap">
        <div className="w-full md:flex-1">
          <input 
            type="text" 
            placeholder="Tìm theo tiêu đề, công ty..." 
            className="input w-full bg-gray-50 border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="input w-full md:w-auto bg-gray-50 border-gray-200"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          <option value="pharma_factory">Nhà máy Pharma</option>
          <option value="fnb_factory">Nhà máy F&B</option>
          <option value="gmp_license">GMP License</option>
          <option value="tender">Đấu thầu</option>
          <option value="regulatory">Quy định</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto py-2 pr-4 bg-gray-50 rounded-lg px-3 border border-gray-200">
          <input 
            type="checkbox" 
            className="rounded border-gray-200 bg-white text-primary cursor-pointer"
            checked={onlyLeads}
            onChange={(e) => setOnlyLeads(e.target.checked)}
          />
          <span className="text-[10px] uppercase font-black text-gray-500">Chỉ xem Lead</span>
        </label>
        <select 
          className="input w-full md:w-auto bg-gray-50 border-gray-200"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Mới nhất</option>
          <option value="score">Điểm cao nhất</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(k => <SkeletonCard key={k} />)}
        </div>
      ) : displayData.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-16 text-center shadow-sm">
          <div className="p-4 rounded-full mb-4 bg-gray-50">
            <Radar size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-gray-900">Chưa có dữ liệu</h3>
          <p className="mb-6 max-w-sm text-gray-600">Chưa có thông tin thị trường nào. Bấm 'Quét Ngay' để bắt đầu lấy dữ liệu mới.</p>
          <button onClick={handleScanNow} className="btn-primary">
            Quét Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayData.map(item => (
            <IntelCard 
              key={item.id} 
              item={item} 
              onUpdateNotes={(notes) => handleUpdateNotes(item.id, notes)}
              onConvertClick={() => setAccountModal(item)}
            />
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      {accountModal && (
        <CreateAccountModal 
          intel={accountModal}
          onClose={() => setAccountModal(null)}
          onSuccess={(newAccountData) => {
            setAccountModal(null);
            showToast("Account đã được tạo!");
            setData(prev => prev.map(d => 
              d.id === accountModal.id 
                ? { ...d, converted_to_account: newAccountData.id } 
                : d
            ));
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────────

function IntelCard({ item, onUpdateNotes, onConvertClick }) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes || "");
  
  const catInfo = CATEGORY_MAP[item.category] || { label: item.category, color: "bg-gray-100 text-gray-500 border-gray-200" };
  const score = item.relevance_score || 0;
  
  let scoreColor = "text-amber-500 bg-amber-50 border-amber-200";
  if (score >= 70) scoreColor = "text-primary bg-primary/10 border-primary/20 shadow-sm";
  else if (score < 40) scoreColor = "text-gray-500 bg-gray-100 border-gray-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-300 group overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap bg-gray-50/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${catInfo.color}`}>
            {catInfo.label}
          </span>
          {item.is_lead_candidate && (
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border border-amber-200 bg-amber-50 text-amber-600 flex items-center gap-1">
              <Star size={10} className="fill-amber-500"/> Lead
            </span>
          )}
          {item.converted_to_account && (
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border border-primary/30 bg-primary/10 text-primary flex items-center gap-1">
              <CheckCircle size={10} /> Đã chuyển đổi
            </span>
          )}
        </div>
        <div className={`px-2 py-0.5 text-[10px] font-black tracking-widest rounded border flex items-center gap-1 ${scoreColor}`}>
          SCORE: {score}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-black text-gray-900 mb-3 leading-tight tracking-tight group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        {item.region && (
          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold mb-4">
            <MapPin size={12} className="text-primary" />
            {item.region}
          </div>
        )}
        
        <div className="text-sm text-gray-700 mb-6 whitespace-pre-wrap leading-relaxed">
          {expanded ? item.summary : (item.summary?.substring(0, 150) || "") + (item.summary?.length > 150 ? "..." : "")}
          {item.summary?.length > 150 && (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-primary font-black ml-1 hover:underline focus:outline-none uppercase text-[10px] tracking-widest"
            >
              [{expanded ? "Thu gọn" : "Xem thêm"}]
            </button>
          )}
        </div>

        {item.companies_mentioned?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {item.companies_mentioned.map((c, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded border border-gray-200 flex items-center gap-1.5 shadow-none">
                <Building size={10} className="text-primary" /> {c}
              </span>
            ))}
          </div>
        )}

        <div className="text-[10px] font-black text-gray-500 mb-4 mt-auto uppercase tracking-widest flex items-center gap-2">
           <div className="w-1 h-1 rounded-full bg-gray-400"></div>
           Cập nhật: {format(new Date(item.scan_date), "dd/MM/yyyy")}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-200 flex flex-col gap-3">
          <textarea
            className="input w-full text-xs resize-none bg-gray-50 border-gray-200 focus:border-primary/50 text-gray-900"
            placeholder="Ghi chú thêm..."
            rows={2}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => {
              if (localNotes !== item.notes) onUpdateNotes(localNotes);
            }}
          />
          {item.is_lead_candidate && !item.converted_to_account && (
            <button onClick={onConvertClick} className="btn-secondary w-full justify-center h-10 rounded-xl font-black uppercase tracking-widest text-[10px] border-amber-300 text-amber-600 hover:bg-amber-50">
              Tạo Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateAccountModal({ intel, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    name: intel.title || "",
    type: intel.category === "fnb_factory" ? "fnb" : "pharma",
    region: intel.region || "North",
    status: "active",
    score: intel.relevance_score || 50,
    createDeal: true,
    dealName: intel.title || "",
    dealValue: 0,
    dealDate: format(new Date(), "yyyy-MM-dd")
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Create explicitly through direct query if standard method has complex requirements
    const { data: accData, error: accError } = await supabase.from("accounts").insert([{
      name: form.name,
      type: form.type,
      region: form.region,
      status: form.status,
      score: form.score
    }]).select().single();
    
    if (accError) {
      showToast(accError.message, "error");
      setSubmitting(false);
      return;
    }

    // Create Deal if requested
    if (form.createDeal) {
      const { error: dealError } = await supabase.from("deals").insert([{
        account_id: accData.id,
        name: form.dealName,
        value: form.dealValue,
        expected_close: form.dealDate,
        stage: "prospect",
        probability: 10,
        notes: `Tự động tạo từ Market Scan: ${intel.title}`
      }]);
      if (dealError) showToast("Lỗi khi tạo deal: " + dealError.message, "error");
    }

    // Link market_intel
    const { error: linkError } = await supabase.from("market_intel")
      .update({ converted_to_account: accData.id })
      .eq("id", intel.id);

    setSubmitting(false);
    onSuccess(accData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md bg-white border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-900">Tạo Account mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tên Account</label>
            <input
              type="text"
              className="input w-full bg-gray-50 border-gray-200"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Loại ngành</label>
              <div className="flex gap-4 items-center h-10">
                <label className="flex items-center gap-1 text-sm cursor-pointer text-gray-600">
                  <input type="radio" checked={form.type === "pharma"} onChange={() => setForm({...form, type:"pharma"})} className="accent-primary" /> Pharma
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer text-gray-600">
                  <input type="radio" checked={form.type === "fnb"} onChange={() => setForm({...form, type:"fnb"})} className="accent-primary" /> F&B
                </label>
              </div>
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select className="input w-full bg-gray-50 border-gray-200" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                <option value="North">Miền Bắc</option>
                <option value="South">Miền Nam</option>
                <option value="Central">Miền Trung</option>
              </select>
            </div>
          </div>

          <div className="pt-4 space-y-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.createDeal}
                onChange={e => setForm({...form, createDeal: e.target.checked})}
                className="rounded accent-primary"
              />
              <span className="text-sm font-bold text-gray-700">Tạo kèm một Deal (Cơ hội)</span>
            </label>

            {form.createDeal && (
              <div className="space-y-3 p-3 rounded-lg animate-in fade-in duration-300 bg-gray-50 border border-gray-200">
                <div>
                  <label className="label">Tên Deal</label>
                  <input
                    type="text"
                    className="input w-full bg-white border-gray-200 h-9 text-sm"
                    value={form.dealName}
                    onChange={e => setForm({...form, dealName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Giá trị dự kiến</label>
                    <input
                      type="number"
                      className="input w-full bg-white border-gray-200 h-9 text-sm"
                      value={form.dealValue}
                      onChange={e => setForm({...form, dealValue: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="label">Ngày dự kiến chốt</label>
                    <input
                      type="date"
                      className="input w-full bg-white border-gray-200 h-9 text-sm"
                      value={form.dealDate}
                      onChange={e => setForm({...form, dealDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Đang tạo..." : "Xác nhận tạo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-900", valueClassName = "text-2xl md:text-3xl" }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{label}</div>
      <div className={`${valueClassName} font-black tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 animate-pulse flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="h-6 w-24 rounded-full bg-gray-100"></div>
        <div className="h-6 w-16 rounded-full bg-gray-100"></div>
      </div>
      <div className="h-6 rounded w-3/4 bg-gray-100"></div>
      <div className="h-4 rounded w-1/4 bg-gray-100"></div>
      <div className="space-y-2 mt-2">
        <div className="h-3 rounded w-full bg-gray-100"></div>
        <div className="h-3 rounded w-5/6 bg-gray-100"></div>
      </div>
      <div className="mt-auto h-10 rounded w-full bg-gray-100"></div>
    </div>
  );
}
