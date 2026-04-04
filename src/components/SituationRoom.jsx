import { useState, useRef, useEffect } from 'react';
import { Bot, Send, AlertTriangle, ShieldCheck, TrendingDown, Target, Zap, X } from 'lucide-react';
import { callAISalesCoach } from '../lib/ai';
import { SITUATION_ROOM_PROMPT } from '../lib/gm_ai_prompts';

const SCENARIOS = [
  {
    id: 1,
    title: "Đứt gãy Chuỗi Cung Ứng",
    description: "Nhà máy tại Munich báo delay chuyến hàng Môi trường nuôi cấy 30 ngày. BV Chợ Rẫy (Top 1 Account) sắp hết tồn kho trong 15 ngày tới.",
    impact: "Nguy cơ mất 2 tỷ VNĐ và bị phạt vi phạm hợp đồng thầu."
  },
  {
    id: 2,
    title: "Phản công từ Đối thủ",
    description: "Đối thủ BioTechX vừa chào giá thấp hơn 20% cho toàn bộ line Test Kit tại khu vực Miền Nam.",
    impact: "Nguy cơ mất Market Share 30% tại MN. Nếu chạy theo giá sẽ giảm Gross Margin xuống dưới mức cho phép (40%)."
  }
];

export default function SituationRoom({ onUpdateRadar, onClose }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const startScenario = (scenario) => {
    setActiveScenario(scenario);
    setChatHistory([{
      role: 'assistant',
      content: `[HQ BOARD WARNING]: Chúng tôi vừa nhận được báo cáo khẩn cấp.\n\n${scenario.title}\n${scenario.description}\n${scenario.impact}\n\nVới tư cách là GM, bạn quyết định xử lý tình huống này thế nào? Hãy trình bày phương án!`
    }]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = { role: 'user', content: inputText };
    setChatHistory(prev => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      // Build history for AI
      const aiContext = [
        { role: 'system', content: SITUATION_ROOM_PROMPT.replace('[CRISIS_SCENARIO]', activeScenario.description) },
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        userMessage
      ];

      // Temporary mock call directly to the standard AI function, passing the history
      // In production, you'd want a specialized endpoint
      const responseText = await callAISalesCoach(inputText, { history: aiContext.slice(0, -1) });
      
      // Parse JSON from response
      let msgContent = responseText;
      let jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
         try {
           const data = JSON.parse(jsonMatch[1]);
           if (data.radar_deltas) {
             onUpdateRadar(data.radar_deltas);
           }
         } catch (e) {
           console.error("Failed to parse JSON from AI response.");
         }
         // Remove json block from display text
         msgContent = responseText.replace(/```json\s*\{[\s\S]*?\}\s*```/, '').trim();
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: msgContent }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `[ERROR] Không thể kết nối với HQ. Lỗi: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
      <div className="bg-surface-900 border border-red-500/30 rounded-3xl w-full max-w-5xl h-full max-h-[85vh] shadow-[0_0_80px_rgba(239,68,68,0.15)] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/20 bg-red-500/5shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl relative overflow-hidden">
               <div className="absolute inset-0 bg-red-500/20 animate-ping"></div>
               <AlertTriangle className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] relative z-10" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-widest text-red-50">Crisis Situation Room</h2>
              <p className="text-[10px] text-red-400/80 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <ShieldCheck size={12}/> Executive Board Connection
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-surface-800 text-slate-400 hover:text-white rounded-xl hover:bg-surface-700 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Scenarios */}
          <div className="w-1/3 border-r border-red-500/10 p-6 bg-surface-900/50 flex flex-col gap-4 overflow-y-auto">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Simulated Crisis</h3>
             {SCENARIOS.map(sc => (
               <button 
                 key={sc.id}
                 onClick={() => startScenario(sc)}
                 className={`text-left p-5 rounded-2xl border transition-all duration-300 group
                   ${activeScenario?.id === sc.id 
                     ? 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' 
                     : 'bg-surface-800 border-surface-700 hover:border-red-500/30 hover:bg-surface-800/80'}`}
               >
                 <h4 className="font-bold text-slate-100 mb-2 truncate group-hover:text-red-400 transition-colors">{sc.title}</h4>
                 <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{sc.description}</p>
                 <div className="mt-4 flex flex-col gap-1.5">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Impact</span>
                   <span className="text-[10px] font-bold text-amber-500/80 leading-relaxed bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">{sc.impact}</span>
                 </div>
               </button>
             ))}
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-surface-950 relative">
             {!activeScenario ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <Target size={48} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">Select a crisis to begin</p>
                </div>
             ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {chatHistory.map((m, i) => (
                      <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'assistant' && (
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                            <Bot className="text-red-500" size={18} />
                          </div>
                        )}
                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                          m.role === 'user' 
                             ? 'bg-primary/20 border border-primary/30 text-primary-50 backdrop-blur-md rounded-tr-sm' 
                             : 'bg-surface-800 border border-surface-700 text-slate-300 rounded-tl-sm'
                        }`}>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                          <Bot className="text-red-500 animate-pulse" size={18} />
                        </div>
                        <div className="p-4 rounded-2xl bg-surface-800 border border-surface-700 text-slate-400 flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-[10px] uppercase font-black tracking-widest">BOD is evaluating...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  <div className="p-6 border-t border-red-500/20 bg-surface-900/50">
                    <div className="flex gap-3">
                      <textarea 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSend();
                           }
                         }}
                         placeholder="Nhập quyết định của bạn thưa GM... (Shift+Enter để xuống dòng)"
                         className="flex-1 bg-surface-950 border border-surface-700 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 resize-none"
                         rows={2}
                      />
                      <button 
                         onClick={handleSend}
                         disabled={loading || !inputText.trim()}
                         className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[10px] tracking-widest shrink-0"
                      >
                         <Send size={16} /> Gửi Trình Bày
                      </button>
                    </div>
                  </div>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
