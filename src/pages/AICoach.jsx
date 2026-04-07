import { useState, useEffect, useRef } from "react";
import { Brain, Send, Trash2, Copy, Check, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { fetchAccounts, fetchDeals, fetchCompetitors } from "../lib/supabase";
import { callAISalesCoach } from "../lib/ai";
import LoadingSpinner from "../components/LoadingSpinner";

const QUICK_PROMPTS = [
  {
    label: "Tóm tắt tài khoản",
    icon: "🏢",
    prompt: (account, deal, competitor) =>
      account
        ? `Hãy tóm tắt tài khoản ${account.name}: các liên hệ chính, điểm đau, deals hiện tại, và bước tiếp theo cần làm.`
        : "Vui lòng chọn một tài khoản ở bên trái để tôi tóm tắt."
  },
  {
    label: "Tư vấn deal",
    icon: "🎯",
    prompt: (account, deal) =>
      deal
        ? `Tư vấn tôi về deal "${deal.name}" (${deal.stage}, ${deal.probability}%): chiến lược, xử lý phản đối và bước tiếp theo.`
        : "Vui lòng chọn một deal để tôi tư vấn chiến lược."
  },
  {
    label: "Chuẩn bị cuộc họp",
    icon: "📋",
    prompt: (account) =>
      account
        ? `Chuẩn bị cho tôi một cuộc họp với ${account.name}: agenda đề xuất, các điểm thảo luận và cách xử lý phản đối.`
        : "Vui lòng chọn tài khoản để tôi chuẩn bị agenda cuộc họp."
  },
  {
    label: "Phân tích đối thủ",
    icon: "🔍",
    prompt: (account, deal, competitor) =>
      competitor
        ? `Phân tích ${competitor.name}: điểm mạnh, điểm yếu và cách Biomedia định vị cạnh tranh. Tư vấn cách xử lý khi khách hàng so sánh.`
        : "Vui lòng chọn một đối thủ để phân tích."
  },
  {
    label: "Chiến lược thị trường",
    icon: "🗺️",
    prompt: () => "Tư vấn chiến lược thị trường cho phân khúc Pharma QC tại Việt Nam: cơ hội, định vị và go-to-market."
  }
];

export default function AICoach() {
  const [accounts, setAccounts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchDeals(), fetchCompetitors()]).then(
      ([accRes, dealRes, compRes]) => {
        setAccounts(accRes.data || []);
        setDeals(dealRes.data || []);
        setCompetitors(compRes.data || []);
      }
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg) return;

    const userMessage = { role: "user", content: msg, ts: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await callAISalesCoach(msg, {
        account: selectedAccount,
        deal: selectedDeal,
        competitor: selectedCompetitor,
        history
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, ts: new Date() }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Lỗi: ${err.message}. Vui lòng kiểm tra API key và thử lại.`,
          ts: new Date(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleCopy(content, id) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function clearConversation() {
    setMessages([]);
  }

  return (
    <div className="flex h-full gap-5" style={{ height: "calc(100vh - 130px)" }}>
      {/* Left Panel - Context */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Brain size={15} style={{ color: 'var(--brand)' }} />
            Ngữ cảnh AI
          </h3>

          <div className="space-y-3">
            <div>
              <label className="label">Tài khoản</label>
              <select
                value={selectedAccount?.id || ""}
                onChange={(e) => {
                  const acc = accounts.find((a) => a.id === e.target.value) || null;
                  setSelectedAccount(acc);
                  setSelectedDeal(null);
                }}
                className="input text-sm"
              >
                <option value="">-- Không chọn --</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Deal</label>
              <select
                value={selectedDeal?.id || ""}
                onChange={(e) => setSelectedDeal(deals.find((d) => d.id === e.target.value) || null)}
                className="input text-sm"
              >
                <option value="">-- Không chọn --</option>
                {(selectedAccount
                  ? deals.filter((d) => d.account_id === selectedAccount.id)
                  : deals
                ).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Đối thủ</label>
              <select
                value={selectedCompetitor?.id || ""}
                onChange={(e) => setSelectedCompetitor(competitors.find((c) => c.id === e.target.value) || null)}
                className="input text-sm"
              >
                <option value="">-- Không chọn --</option>
                {competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Context Summary */}
          {(selectedAccount || selectedDeal || selectedCompetitor) && (
            <div
              className="mt-4 space-y-2 border-t pt-4"
              style={{ borderColor: 'var(--border)' }}
            >
              {selectedAccount && (
                <div
                  className="text-[11px] px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{
                    background: 'var(--brand-bg)',
                    color: 'var(--text-1)',
                    border: '1px solid var(--brand-border)',
                  }}
                >
                  <User size={12} />
                  <span className="font-bold truncate">{selectedAccount.name}</span>
                </div>
              )}
              {selectedDeal && (
                <div
                  className="text-[11px] px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-1)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Bot size={12} />
                  <span className="font-bold truncate">{selectedDeal.name} · {selectedDeal.probability}%</span>
                </div>
              )}
              {selectedCompetitor && (
                <div className="text-[11px] bg-red-500/10 text-red-400 px-3 py-2 rounded-xl border border-red-500/20 flex items-center gap-2">
                  <Trash2 size={12} />
                  <span className="font-bold truncate">{selectedCompetitor.name}</span>
                </div>
              )}

              {selectedAccount && selectedDeal && (
                <button
                  onClick={() => {
                    const prompt = `Phân tích chiến lược chuyên sâu cho deal "${selectedDeal.name}" tại khách hàng "${selectedAccount.name}".
                    Hãy phân tích theo cấu trúc:
                    1. ĐÁNH GIÁ SỨC MẠNH: Điểm tựa của chúng ta tại đây là gì? (Champions, Technical Fit).
                    2. RỦI RO & RÀO CẢN: Ai là Blockers? Điều gì khiến deal này có thể thất bại?
                    3. KỊCH BẢN ĐỐI THỦ: Nếu ${selectedCompetitor?.name || "đối thủ"} nhảy vào, chúng ta nên phản ứng ra sao?
                    4. CHIẾN THUẬT 7 NGÀY TỚI: Hành động cụ thể để thắng deal này.`;
                    sendMessage(prompt);
                  }}
                  className="w-full mt-2 btn-primary text-[10px] font-black uppercase tracking-widest h-10 flex items-center justify-center gap-2"
                >
                  <Brain size={14} />
                  Phân tích Chiến Lược
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-1)' }}>Câu hỏi nhanh</h3>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => {
                  const msg = qp.prompt(selectedAccount, selectedDeal, selectedCompetitor);
                  sendMessage(msg);
                }}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--brand-bg)';
                  e.currentTarget.style.color = 'var(--text-1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-2)';
                }}
              >
                {qp.icon} {qp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Chat Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Brain size={18} style={{ color: 'var(--brand)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-1)' }}>AI Sales Coach</span>
            <span
              className="badge text-xs"
              style={{
                background: 'var(--brand-bg)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
              }}
            >
              Claude
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="text-xs flex items-center gap-1 hover:text-red-500 transition-colors"
              style={{ color: 'var(--text-2)' }}
            >
              <Trash2 size={13} /> Xóa hội thoại
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Brain size={40} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-2)' }}>Xin chào Henry!</h3>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-2)' }}>
                Tôi là AI Sales Coach của bạn. Chọn ngữ cảnh ở bên trái và hỏi tôi bất cứ điều gì về tài khoản, deal hay chiến lược.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt(selectedAccount, selectedDeal, selectedCompetitor))}
                    className="px-3 py-1.5 rounded-full text-sm transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--brand-bg)';
                      e.currentTarget.style.color = 'var(--text-1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }}
                  >
                    {qp.icon} {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <Bot size={14} style={{ color: 'var(--text-3)' }} />
                </div>
              )}

              <div className={`max-w-[80%] group relative`}>
                {msg.isError ? (
                  <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={
                      msg.role === "user"
                        ? { background: 'var(--brand)', color: '#ffffff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-1)' }
                    }
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                )}
                <div
                  className={`flex items-center gap-2 mt-1 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  style={{ color: 'var(--text-2)' }}
                >
                  {msg.ts && format(msg.ts, "HH:mm")}
                  {msg.role === "assistant" && !msg.isError && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === idx ? <Check size={12} className="text-[#22C55E]" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <User size={14} style={{ color: 'var(--text-2)' }} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <Bot size={14} style={{ color: 'var(--text-3)' }} />
              </div>
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <LoadingSpinner size="sm" />
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>Đang suy nghĩ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi tôi bất cứ điều gì... (Enter để gửi, Shift+Enter để xuống dòng)"
              className="flex-1 input resize-none min-h-[40px] max-h-32 text-sm"
              rows={1}
              style={{ height: "auto" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-2)' }}>
            Trả lời bằng tiếng Việt · Claude claude-sonnet-4-20250514 · Phản hồi giới hạn 2-3 đoạn
          </div>
        </div>
      </div>
    </div>
  );
}
