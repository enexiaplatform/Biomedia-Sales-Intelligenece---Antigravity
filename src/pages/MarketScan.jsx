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
  pharma_factory: { label: "Nhà máy Pharma", color: "bg-blue-100 text-blue-800 border-blue-200" },
  fnb_factory: { label: "Nhà máy F&B", color: "bg-green-100 text-green-800 border-green-200" },
  gmp_license: { label: "GMP License", color: "bg-purple-100 text-purple-800 border-purple-200" },
  tender: { label: "Đấu thầu", color: "bg-orange-100 text-orange-800 border-orange-200" },
  regulatory: { label: "Quy định", color: "bg-gray-100 text-gray-800 border-gray-200" }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Radar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Market Scan</h1>
            <p className="text-gray-500 text-sm">Tin tức nhà máy & cơ hội mới tại Việt Nam</p>
          </div>
        </div>
        <button 
          onClick={handleScanNow} 
          disabled={isScanning}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "Đang quét..." : "Quét Ngay"}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng tin tức" value={totalCount} />
        <StatCard label="Lead tiềm năng" value={leadCount} color="text-yellow-600" />
        <StatCard label="Đã chuyển đổi" value={convertedCount} color="text-emerald-600" />
        <StatCard 
          label="Lần quét gần nhất" 
          value={lastScanDate ? format(new Date(lastScanDate), "dd/MM/yyyy HH:mm") : "---"} 
          valueClassName="text-lg"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center flex-wrap">
        <div className="w-full md:flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="Tìm theo tiêu đề, công ty..." 
            className="input w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="input w-full md:w-auto"
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
        <label className="flex items-center gap-2 cursor-pointer w-full md:w-auto mt-2 md:mt-0">
          <input 
            type="checkbox" 
            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            checked={onlyLeads}
            onChange={(e) => setOnlyLeads(e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">Chỉ xem Lead</span>
        </label>
        <select 
          className="input w-full md:w-auto"
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
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center p-16 text-center shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Radar className="text-gray-400" size={48} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có dữ liệu</h3>
          <p className="text-gray-500 mb-6 max-w-sm">Chưa có thông tin thị trường nào. Bấm 'Quét Ngay' để bắt đầu lấy dữ liệu mới.</p>
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
  
  const catInfo = CATEGORY_MAP[item.category] || { label: item.category, color: "bg-gray-100 text-gray-800 border-gray-200" };
  const score = item.relevance_score || 0;
  
  let scoreColor = "text-red-700 bg-red-50 border-red-100";
  if (score >= 70) scoreColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
  else if (score >= 40) scoreColor = "text-yellow-700 bg-yellow-50 border-yellow-100";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap bg-gray-50/50 rounded-t-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${catInfo.color}`}>
            {catInfo.label}
          </span>
          {item.is_lead_candidate && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full border border-yellow-300 bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Star size={12} className="fill-yellow-500 text-yellow-500"/> Lead
            </span>
          )}
          {item.converted_to_account && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-emerald-200 bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle size={12} /> Đã chuyển đổi
            </span>
          )}
        </div>
        <div className={`px-2.5 py-1 text-xs font-bold rounded border flex items-center gap-1 ${scoreColor}`}>
          Điểm: {score}/100
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
          {item.title}
        </h3>
        {item.region && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
            <MapPin size={14} />
            {item.region}
          </div>
        )}
        
        <div className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">
          {expanded ? item.summary : (item.summary?.substring(0, 150) || "") + (item.summary?.length > 150 ? "..." : "")}
          {item.summary?.length > 150 && (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-blue-600 font-medium ml-1 hover:underline focus:outline-none"
            >
              {expanded ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
        </div>

        {item.companies_mentioned?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.companies_mentioned.map((c, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200 flex items-center gap-1">
                <Building size={10} /> {c}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 mb-4 mt-auto">
          Cập nhật: {format(new Date(item.scan_date), "dd/MM/yyyy HH:mm")}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
          <textarea
            className="input w-full text-sm resize-none"
            placeholder="Ghi chú thêm..."
            rows={2}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => {
              if (localNotes !== item.notes) onUpdateNotes(localNotes);
            }}
          />
          {item.is_lead_candidate && !item.converted_to_account && (
            <button onClick={onConvertClick} className="btn-secondary w-full justify-center">
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
    score: intel.relevance_score || 50
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Create explicitly through direct query if standard method has complex requirements
    const { data: accData, error: accError } = await supabase.from("accounts").insert([form]).select().single();
    
    if (accError) {
      showToast(accError.message, "error");
      setSubmitting(false);
      return;
    }

    // Link market_intel
    const { error: linkError } = await supabase.from("market_intel")
      .update({ converted_to_account: accData.id })
      .eq("id", intel.id);

    setSubmitting(false);
    onSuccess(accData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Tạo Account mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tên Account</label>
            <input 
              type="text" 
              className="input text-gray-900 font-medium" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Loại ngành</label>
              <div className="flex gap-4 items-center h-10">
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={form.type === "pharma"} onChange={() => setForm({...form, type:"pharma"})} className="text-blue-600" /> Pharma
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={form.type === "fnb"} onChange={() => setForm({...form, type:"fnb"})} className="text-blue-600" /> F&B
                </label>
              </div>
            </div>
            <div>
              <label className="label">Khu vực</label>
              <select className="input" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                <option value="North">Miền Bắc</option>
                <option value="South">Miền Nam</option>
                <option value="Central">Miền Trung</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
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

function StatCard({ label, value, color = "text-gray-900", valueClassName = "text-3xl" }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
      <div className="text-sm text-gray-500 font-medium mb-1">{label}</div>
      <div className={`${valueClassName} font-bold ${color}`}>{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-pulse flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="space-y-2 mt-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="mt-auto h-10 bg-gray-200 rounded w-full"></div>
    </div>
  );
}
