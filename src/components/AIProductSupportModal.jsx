import { useState, useRef, useEffect } from "react";
import { X, BrainCircuit, Send, User, Bot, PlusCircle, Trash2, CheckCircle, Copy } from "lucide-react";
import { callAISalesCoach } from "../lib/ai";

export default function AIProductSupportModal({ product, onClose, showToast }) {
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: `Chào bạn, tôi là trợ lý kỹ thuật Bio-AI. Bạn cần hỗ trợ gì về sản phẩm **${product.name}** không?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

      const response = await callAISalesCoach(userMsg, { product, history });
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTIONS = [
    `USP của sản phẩm này là gì?`,
    `So sánh với đối thủ cạnh tranh?`,
    `Cách giải thích cho khách hàng Pharma?`,
    `Thời hạn sử dụng và bảo quản?`
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700/50 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-surface-700/50 flex justify-between items-center bg-surface-900/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl">
               <BrainCircuit size={18} className="text-primary animate-pulse" />
             </div>
             <div>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight">Technical AI Support</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{product.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-950/20 scrollbar-hide" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === "assistant" 
                ? "bg-surface-800 text-slate-300 rounded-tl-none border border-surface-700/30 shadow-sm" 
                : "bg-primary/20 text-primary border border-primary/20 rounded-tr-none shadow-glow-sm"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                   {m.role === "assistant" ? <Bot size={14} className="text-primary" /> : <User size={14} className="text-primary" />}
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {m.role === "assistant" ? "Bio-AI Bot" : "Sales Team"}
                   </span>
                </div>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="bg-surface-800 p-4 rounded-2xl rounded-tl-none border border-surface-700/30 flex gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-0"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-300"></div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-900 border-t border-surface-700/50 shrink-0">
          <div className="flex flex-wrap gap-2 mb-4">
             {SUGGESTIONS.map(s => (
                <button 
                  key={s}
                  onClick={() => setInput(s)}
                  className="px-3 py-1 bg-surface-950/50 border border-surface-700/50 text-[9px] font-black text-slate-400 uppercase rounded-full hover:border-primary transition-all hover:text-primary active:scale-95"
                >
                  {s}
                </button>
             ))}
          </div>
          <div className="relative">
            <input 
              type="text" 
              className="input w-full pr-12 h-14 bg-surface-950 border-surface-700 focus:border-primary/50 text-slate-200 rounded-2xl"
              placeholder="Hỏi về kỹ thuật, ứng dụng hoặc so sánh..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1.5 h-11 w-11 bg-primary text-surface-950 rounded-xl flex items-center justify-center hover:shadow-glow-sm transition-all disabled:opacity-50 active:scale-90"
            >
               <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
