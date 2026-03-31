import { useState } from "react";
import { X, Sparkles, Send, Copy, CheckCircle, FileText } from "lucide-react";
import { callAISalesCoach } from "../lib/ai";

export default function TenderAssistantModal({ product, onClose, showToast }) {
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!requirement.trim()) {
      showToast("Vui lòng nhập yêu cầu lăm sàng/kỹ thuật", "error");
      return;
    }

    setLoading(true);
    try {
      const prompt = `Đây là một yêu cầu từ hồ sơ thầu hoặc khách hàng: "${requirement}". 
      Dựa trên thông tin sản phẩm ${product.name}, hãy viết một đoạn văn ngắn (2-3 đoạn) để đưa vào hồ sơ thầu, giải thích tại sao sản phẩm này là lựa chọn tối ưu nhất để đáp ứng yêu cầu trên. 
      Tập trung vào các thông số kỹ thuật (nếu có) và USP: ${product.usp}. 
      Ngôn ngữ chuyên nghiệp, thuyết phục.`;

      const response = await callAISalesCoach(prompt, { product });
      setDraft(response);
    } catch (err) {
      showToast("Lỗi khi tạo draft: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Đã sao chép vào bộ nhớ tạm");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700/50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-surface-700/50 flex justify-between items-center bg-surface-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Sparkles size={20} className="text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight">Tender Assistant</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={12} className="text-primary" /> Yêu cầu kỹ thuật từ khách hàng
            </label>
            <textarea
              className="input w-full min-h-[120px] bg-surface-950 border-surface-700 focus:border-primary/50 text-slate-200 p-4 rounded-2xl resize-none"
              placeholder="VD: Khách hàng yêu cầu bộ kit thử endotoxin có độ nhạy cao, thời gian trả kết quả dưới 30 phút..."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-glow-sm"
            >
              {loading ? <div className="w-5 h-5 border-2 border-surface-950 border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={18} />}
              {loading ? "Đang xử lý..." : "Tạo Draft Hồ Sơ"}
            </button>
          </div>

          {draft && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest">Đề xuất từ AI</label>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                  >
                    {copied ? <CheckCircle size={14} className="text-primary" /> : <Copy size={14} />}
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
               </div>
               <div className="bg-surface-950 border border-primary/20 p-6 rounded-2xl text-sm text-slate-300 leading-relaxed whitespace-pre-wrap shadow-inner group relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] pointer-events-none"></div>
                  {draft}
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-surface-950/50 border-t border-surface-700/50 text-center">
           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
             Nội dung được tạo bởi AI. Vui lòng kiểm tra lại thông số kỹ thuật thực tế trước khi gửi thầu.
           </p>
        </div>
      </div>
    </div>
  );
}
