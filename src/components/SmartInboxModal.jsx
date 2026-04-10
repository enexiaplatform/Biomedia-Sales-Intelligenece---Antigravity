import { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Check, AlertCircle, Loader2, Plus, Database, User, Building2, TrendingUp, Search, MessageSquare, Clipboard } from "lucide-react";
import { parseSmartInboxData } from "../lib/ai";
import { createContact, createAccount, createDeal, createInteraction, createCompetitor, fetchAccounts } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";

const MODULE_ICONS = {
  "Contacts": <User size={18} className="text-blue-500" />,
  "Accounts": <Building2 size={18} className="text-indigo-500" />,
  "Pipeline": <TrendingUp size={18} className="text-green-500" />,
  "Interactions": <MessageSquare size={18} className="text-orange-500" />,
  "Competitors": <Search size={18} className="text-red-500" />,
  "Market Map": <Database size={18} className="text-purple-500" />
};

export default function SmartInboxModal({ open, onClose, showToast }) {
  const [state, setState] = useState("INPUT"); // INPUT, PARSING, CONFIRMATION
  const [rawData, setRawData] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetchAccounts().then(({ data }) => setAccounts(data || []));
    } else {
      resetState();
    }
  }, [open]);

  function resetState() {
    setState("INPUT");
    setRawData("");
    setParsedData(null);
    setError("");
    setSaving(false);
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop().toLowerCase();

    if (['png', 'jpg', 'jpeg'].includes(extension)) {
      reader.onload = async (e) => {
        const base64 = e.target.result;
        // Multimodal input for Claude
        analyze([
          {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type,
              data: base64.split(',')[1]
            }
          },
          {
            type: "text",
            text: "Đây là tệp được đính kèm. Vui lòng phân tích dữ liệu bên trong."
          }
        ]);
      };
      reader.readAsDataURL(file);
    } else if (extension === 'pdf') {
       // PDF parsing using pdf.js from CDN
       setState("PARSING");
       try {
         const arrayBuffer = await file.arrayBuffer();
         const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.1.392/+esm');
         pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.1.392/build/pdf.worker.mjs';
         
         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
         let text = "";
         const numPages = Math.min(pdf.numPages, 3); // Extract first 3 pages
         for (let i = 1; i <= numPages; i++) {
           const page = await pdf.getPage(i);
           const content = await page.getTextContent();
           text += content.items.map(item => item.str).join(" ") + "\n";
         }
         analyze(text.slice(0, 5000));
       } catch (err) {
         console.error("PDF Parse error", err);
         setError("Không thể đọc tệp PDF. Vui lòng thử dán văn bản trực tiếp.");
         setState("INPUT");
       }
    } else if (extension === 'xlsx' || extension === 'xls') {
      setState("PARSING");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        analyze(csv.slice(0, 5000));
      } catch (err) {
        console.error("Excel Parse error", err);
        setError("Không thể đọc tệp Excel.");
        setState("INPUT");
      }
    } else if (extension === 'csv') {
      reader.onload = (e) => analyze(e.target.result.slice(0, 5000));
      reader.readAsText(file);
    } else {
      reader.onload = (e) => analyze(e.target.result);
      reader.readAsText(file);
    }
  };

  const analyze = async (content) => {
    setState("PARSING");
    setError("");
    try {
      const result = await parseSmartInboxData(content);
      setParsedData(result);
      setState("CONFIRMATION");
    } catch (err) {
      setError(err.message || "Lỗi khi phân tích dữ liệu");
      setState("INPUT");
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    const { detected_type, extracted_data } = parsedData;
    
    let result;
    try {
      switch (detected_type) {
        case "contact": result = await createContact(extracted_data); break;
        case "account": result = await createAccount(extracted_data); break;
        case "deal": result = await createDeal(extracted_data); break;
        case "interaction": result = await createInteraction(extracted_data); break;
        case "competitor": result = await createCompetitor(extracted_data); break;
        default: throw new Error("Loại dữ liệu không hỗ trợ");
      }

      if (result.error) throw result.error;

      showToast(`Đã lưu ${parsedData.suggested_module}!`);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const updateExtractedField = (field, value) => {
    setParsedData(prev => ({
      ...prev,
      extracted_data: {
        ...prev.extracted_data,
        [field]: value
      }
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-3xl shadow-xl w-full max-w-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl border border-brand/20">
              <Plus size={20} className="text-brand" />
            </div>
            <div>
              <h2 className="font-bold text-text-1 text-sm uppercase tracking-wider">Smart Inbox</h2>
              <p className="text-[10px] text-text-3 font-medium uppercase tracking-widest leading-tight">Universal Drop Zone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-3 hover:text-text-1 transition-colors hover:bg-bg-elevated rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {state === "INPUT" && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
                  ${isDragging ? 'border-brand bg-brand/5' : 'border-border hover:border-text-3 hover:bg-bg-elevated'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".txt,.pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                />
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center border border-border">
                  <Upload size={28} className="text-text-2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-1 mb-1">Kéo thả tệp hoặc click để chọn</p>
                  <p className="text-xs text-text-3 font-medium">Hỗ trợ PDF, Excel, CSV, Văn bản & Ảnh</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2">
                   <span className="px-4 py-1 bg-surface text-[10px] font-bold text-text-3 uppercase tracking-widest border border-border rounded-full">HOẶC DÁN VĂN BẢN</span>
                </div>
                <textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  className="input min-h-[200px] pt-6 font-medium text-text-2 resize-none"
                  placeholder="Ví dụ: Anh Nguyễn Văn A từ Bệnh viện Chợ Rẫy, sđt 090xxxxxxx, quan tâm máy đo vi sinh..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  disabled={!rawData.trim()}
                  onClick={() => analyze(rawData)}
                  className="btn-primary w-full sm:w-auto px-10 py-3"
                >
                  <TrendingUp size={18} />
                  Analyze intelligence
                </button>
              </div>
            </div>
          )}

          {state === "PARSING" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                 <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <TrendingUp size={24} className="text-brand animate-pulse" />
                 </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-text-1 mb-1">Đang phân tích...</h3>
                <p className="text-xs text-text-3 font-medium uppercase tracking-widest">Claude is extracting structured data</p>
              </div>
            </div>
          )}

          {state === "CONFIRMATION" && parsedData && (
            <div className="space-y-6">
              <div className="p-4 bg-bg-elevated rounded-2xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand/10 rounded-xl border border-brand/20 text-brand">
                    {MODULE_ICONS[parsedData.suggested_module] || <FileText size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Phát hiện:</span>
                      <span className="text-xs font-bold text-brand">{parsedData.detected_type.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Đưa vào:</span>
                      <span className="text-sm font-bold text-text-1">{parsedData.suggested_module}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block ${
                    parsedData.confidence === 'high' ? 'bg-green-500/10 text-green-500' :
                    parsedData.confidence === 'medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {parsedData.confidence} Confidence
                  </div>
                  <p className="text-[10px] text-text-3 mt-1 italic font-medium">"{parsedData.reason}"</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(parsedData.extracted_data).map(([field, value]) => (
                  <div key={field} className={["notes", "summary", "description", "weaknesses", "strengths"].includes(field) ? "sm:col-span-2" : ""}>
                    <label className="label">{field.replace('_', ' ')}</label>
                    {field === "account_id" ? (
                       <select 
                         value={value || ""} 
                         onChange={(e) => updateExtractedField(field, e.target.value)}
                         className="input"
                       >
                         <option value="">-- Chọn tài khoản --</option>
                         {accounts.map(acc => (
                           <option key={acc.id} value={acc.id}>{acc.name}</option>
                         ))}
                       </select>
                    ) : ["notes", "summary", "description", "weaknesses", "strengths"].includes(field) ? (
                      <textarea
                        value={value || ""}
                        onChange={(e) => updateExtractedField(field, e.target.value)}
                        className="input min-h-[100px]"
                      />
                    ) : (
                      <input
                        type={field === "value" ? "number" : "text"}
                        value={value || ""}
                        onChange={(e) => updateExtractedField(field, e.target.value)}
                        className="input"
                      />
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-surface py-4 border-t border-border">
                <button onClick={() => setState("INPUT")} className="btn-secondary flex-1">
                  Hủy & Làm lại
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Xác nhận & Lưu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
