import React, { useState, useEffect, useCallback } from 'react';
import { 
  Network, Plus, Calendar, Target, AlertCircle, GitBranch, 
  Save, Edit2, X, Filter, Share2, Zap, History, Info, ChevronRight,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { 
  supabase, 
  fetchAccounts, 
  fetchContacts, 
  updateAccount,
  fetchOrgNodes,
  createOrgNode,
  updateOrgNode,
  deleteOrgNode,
  fetchOrgNodeHistory,
  fetchInfluenceLinks,
  createInfluenceLink,
  deleteInfluenceLink,
  fetchDeals,
  fetchCompetitors
} from '../lib/supabase';
import { callAISalesCoach } from '../lib/ai';
import OrgChartView, { buildTree } from '../components/OrgChart';

const DEPARTMENTS = ['QC', 'R&D', 'Procurement', 'Management', 'Production', 'Finance', 'Khác'];
const LEVELS = [
  { value: 1, label: '1 - C-Level' },
  { value: 2, label: '2 - Director' },
  { value: 3, label: '3 - Manager' },
  { value: 4, label: '4 - Staff' },
];
const RELATIONSHIPS = [
  { value: 'champion', label: 'Champion', icon: '★', color: 'text-green-400 border-green-400/30' },
  { value: 'supporter', label: 'Supporter', icon: '✓', color: 'text-teal-400 border-teal-400/30' },
  { value: 'neutral', label: 'Neutral', icon: '—', color: 'text-slate-400 border-slate-400/30' },
  { value: 'skeptic', label: 'Skeptic', icon: '⚠', color: 'text-orange-400 border-orange-400/30' },
  { value: 'blocker', label: 'Blocker', icon: '✕', color: 'text-red-400 border-red-400/30' },
];

function getDeptColor(dept) {
  switch (dept) {
    case 'QC': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'R&D': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'Procurement': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'Management': return 'text-red-700 bg-red-50 border-red-200';
    case 'Production': return 'text-green-700 bg-green-50 border-green-200';
    case 'Finance': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

function getRelStyles(rel) {
  const r = RELATIONSHIPS.find(x => x.value === rel);
  return r ? r.color : 'text-gray-500 border-gray-200';
}

function getRelLabel(rel) {
  const r = RELATIONSHIPS.find(x => x.value === rel);
  if (!r) return rel;
  return `${r.icon} ${r.label}`;
}

function renderCircles(score) {
  const max = 5;
  const filled = Math.ceil((score || 1) / 2);
  const circles = [];
  for (let i = 1; i <= max; i++) {
    circles.push(<span key={i} className={i <= filled ? 'text-primary' : 'text-gray-200'}>●</span>);
  }
  return <span className="flex tracking-widest text-[10px]">{circles}</span>;
}

const BudgetTimeline = ({ data }) => {
  if (!data) return null;
  const milestones = data.split('\n').filter(line => line.trim());
  
  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
      {milestones.map((ms, idx) => (
        <div key={idx} className="relative group">
          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-primary group-hover:scale-125 transition-transform" />
          <div className="bg-white p-3 rounded-xl border border-gray-100/60 shadow-sm hover:border-primary/30 transition-colors">
            <p className="text-sm text-gray-700">{ms}</p>
          </div>
        </div>
      ))}
    </div>
  );
};


export default function BDTool() {
  const [orgNodes, setOrgNodes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  const [activeTab, setActiveTab] = useState('org_chart');
  const [influenceLinks, setInfluenceLinks] = useState([]);
  const [deals, setDeals] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const chartContainerRef = React.useRef(null);
  
  // New States
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [showInfluences, setShowInfluences] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [nodeHistory, setNodeHistory] = useState([]);
  const [historyNode, setHistoryNode] = useState(null);
  
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      const acc = accounts.find(a => a.id === selectedAccountId);
      setSelectedAccount(acc || null);
      if (acc) {
        loadAccountData(selectedAccountId);
      }
    } else {
      setSelectedAccount(null);
      setOrgNodes([]);
      setContacts([]);
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    const { data } = await fetchAccounts();
    if (data) setAccounts(data);
  };

  const loadAccountData = async (accountId) => {
    setLoading(true);
    try {
      const [orgRes, contactsRes, influenceRes, dealsRes, compRes] = await Promise.all([
        fetchOrgNodes(accountId),
        fetchContacts(accountId),
        fetchInfluenceLinks(accountId),
        fetchDeals(accountId),
        fetchCompetitors()
      ]);
      if (orgRes.data) setOrgNodes(orgRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (influenceRes.data) setInfluenceLinks(influenceRes.data);
      if (dealsRes.data) setDeals(dealsRes.data);
      if (compRes.data) setCompetitors(compRes.data);
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải dữ liệu account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccountField = async (field, value) => {
    if (!selectedAccount) return;
    const { data, error } = await updateAccount(selectedAccount.id, { [field]: value });
    if (!error && data) {
      setSelectedAccount(data);
      setAccounts(prev => prev.map(a => a.id === data.id ? data : a));
      showToast('Đã lưu thành công');
    } else {
      showToast('Lỗi lưu thông tin');
    }
  };

  const handleSaveNode = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const nodeData = {
      account_id: selectedAccount.id,
      name: formData.get('name'),
      title: formData.get('title'),
      department: formData.get('department'),
      level: parseInt(formData.get('level'), 10),
      influence_score: parseInt(formData.get('influence_score'), 10),
      relationship_status: formData.get('relationship_status'),
      notes: formData.get('notes'),
    };
    
    let repTo = formData.get('reports_to');
    nodeData.reports_to = repTo ? repTo : null;
    let conId = formData.get('contact_id');
    nodeData.contact_id = conId ? conId : null;

    setLoading(true);
    try {
      if (editingNode) {
        await updateOrgNode(editingNode.id, nodeData);
        showToast('Đã cập nhật người dùng');
      } else {
        await createOrgNode(nodeData);
        showToast('Đã thêm người dùng mới');
      }
      setIsModalOpen(false);
      loadAccountData(selectedAccount.id);
    } catch (error) {
       showToast('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!editingNode) return;
    if (!confirm('Bạn có chắc xoá? Các ref bên dưới sẽ bị mồ côi (reports_to null)')) return;
    
    setLoading(true);
    const { error } = await deleteOrgNode(editingNode.id);
    setLoading(false);

    if (!error) {
      showToast('Đã xoá thành công');
      setIsModalOpen(false);
      loadAccountData(selectedAccount.id);
    } else {
      showToast('Lỗi khi xoá');
    }
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const linkData = {
      account_id: selectedAccount.id,
      source_node_id: formData.get('source_node_id'),
      target_node_id: formData.get('target_node_id'),
      influence_type: formData.get('influence_type'),
      strength: parseInt(formData.get('strength'), 10),
    };

    if (linkData.source_node_id === linkData.target_node_id) {
      showToast('Không thể tạo link tới chính mình');
      return;
    }

    setLoading(true);
    const { error } = await createInfluenceLink(linkData);
    setLoading(false);

    if (!error) {
      showToast('Đã thêm liên kết ảnh hưởng');
      setIsLinkModalOpen(false);
      loadAccountData(selectedAccount.id);
    } else {
      showToast('Lỗi khi lưu liên kết');
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Xoá liên kết này?')) return;
    setLoading(true);
    const { error } = await deleteInfluenceLink(linkId);
    setLoading(false);
    if (!error) {
      showToast('Đã xoá liên kết');
      loadAccountData(selectedAccount.id);
    }
  };

  const treeData = React.useMemo(() => buildTree(orgNodes), [orgNodes]);

  const handleFetchAIInsight = async () => {
    if (!selectedAccount) return;
    setAiLoading(true);
    try {
      const prompt = `Phân tích Stakeholder Map của account ${selectedAccount.name}. 
      Dữ liệu stakeholders: ${JSON.stringify(orgNodes.map(n => ({ name: n.name, title: n.title, dept: n.department, rel: n.relationship_status, influence: n.influence_score, notes: n.notes })))}
      Hợp đồng/Deals: ${JSON.stringify(deals.map(d => ({ name: d.name, stage: d.stage, value: d.value })))}
      Dữ liệu Đối thủ (Competitors): ${JSON.stringify(competitors.map(c => ({ name: c.name, strengths: c.strengths, weaknesses: c.weaknesses })))}
      
      Hãy đưa ra chiến lược "Path to Champion": 
      1. Ai là nhân vật chìa khóa (Champion candidate)?
      2. Cách trung lập hóa các Blocker hoặc Skeptic (đặc biệt nếu họ có liên quan đến đối thủ).
      3. Đối thủ nào là mối đe dọa lớn nhất tại account này và 'Kill Switch' để loại bỏ họ.
      4. Rủi ro lớn nhất và hành động tiếp theo trong 7 ngày tới.`;
      
      const res = await callAISalesCoach(prompt, { account: selectedAccount });
      setAiInsight(res);
    } catch (err) {
      showToast('Lỗi khi gọi AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenHistory = async (node) => {
    setHistoryNode(node);
    const { data } = await fetchOrgNodeHistory(node.id);
    setNodeHistory(data || []);
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center font-bold animate-in fade-in slide-in-from-bottom-4">
          <Zap size={18} className="mr-2 text-primary" />
          {toast}
        </div>
      )}

      {/* Premium Header */}
      <div className="w-full h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Network className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">BD Tool</h1>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Business Development Intelligence</p>
            </div>
          </div>
        </div>
        
        {/* Account Selector */}
        <div className="relative group w-full lg:w-96 flex items-center">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="input w-full bg-white border-gray-200 text-gray-900 h-10 px-4 font-bold rounded-xl appearance-none shadow-sm focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm"
          >
            <option value="">Chọn khách hàng...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} — {acc.type?.toUpperCase()} — {acc.region}
              </option>
            ))}
          </select>
          <div className="absolute right-4 pointer-events-none text-gray-400">
             <ChevronRight size={16} className="rotate-90" />
          </div>
        </div>
      </div>

      <div className="px-6">
      {!selectedAccount ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-200 border-dashed shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
            <Network size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Phân tích BD chiến lược</h2>
          <p className="text-gray-500 mt-2 max-w-sm text-center">Chọn một khách hàng từ danh sách phía trên để bắt đầu xây dựng bản đồ quan hệ và ngân sách.</p>
        </div>
      ) : (
        <>
          {/* Tabs Nav */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200 w-fit">
            {[
              { id: 'org_chart', label: 'Org Chart', icon: Network },
              { id: 'budget_intel', label: 'Budget Intel', icon: Calendar },
              { id: 'stakeholder_map', label: 'Stakeholder Map', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 animation-fade-in">
            {loading ? (
               <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Đang đồng bộ dữ liệu...</p>
               </div>
            ) : (
               <>
                 {/* TAB 1: ORG CHART */}
                 {activeTab === 'org_chart' && (
                    <div className="space-y-4">
                      {/* Controls Area */}
                      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Filter size={14} className="text-primary" />
                            <span>Lọc phòng:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {DEPARTMENTS.map(dept => (
                               <button
                                 key={dept}
                                 onClick={() => {
                                   if (selectedDepts.includes(dept)) setSelectedDepts(prev => prev.filter(d => d !== dept));
                                   else setSelectedDepts(prev => [...prev, dept]);
                                 }}
                                 className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedDepts.includes(dept) ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`}
                               >
                                 {dept}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => setShowInfluences(!showInfluences)}
                             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${showInfluences ? 'bg-secondary/10 border-secondary text-secondary' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                           >
                             <Zap size={14} /> {showInfluences ? 'Ẩn ảnh hưởng' : 'Hiện ảnh hưởng'}
                           </button>
                           <button 
                             onClick={() => setIsLinkModalOpen(true)}
                             className="btn-secondary text-xs h-9"
                           >
                             <Share2 size={14} /> Tạo liên kết
                           </button>
                           <button 
                             onClick={() => { setEditingNode(null); setIsModalOpen(true); }}
                             className="btn-primary text-xs h-9"
                           >
                             <Plus size={14} /> Thêm người
                           </button>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-3xl p-12 min-h-[700px] overflow-auto relative shadow-sm">
                        <OrgChartView 
                          nodes={orgNodes} 
                          links={influenceLinks} 
                          onEditNode={(n) => { setEditingNode(n); setIsModalOpen(true); }}
                        />
                      </div>
                    </div>
                 )}

                 {/* TAB 2: BUDGET INTEL */}
                 {activeTab === 'budget_intel' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                          <div className="card p-6 bg-white border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                              <Calendar className="text-primary" size={20} /> Lịch trình ngân sách dự kiến
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nhập lộ trình (mỗi dòng 1 mốc)</label>
                                  <textarea 
                                    className="input w-full min-h-[150px] bg-white border-gray-200 focus:border-primary/50 text-sm text-gray-900 shadow-sm"
                                    defaultValue={selectedAccount.budget_cycle || ''}
                                    placeholder="Ví dụ:&#10;Tháng 10: Lập kế hoạch dự toán&#10;Tháng 11: Trình ban giám đốc duyệt&#10;Tháng 12: Đấu thầu tập trung"
                                    onBlur={(e) => handleSaveAccountField('budget_cycle', e.target.value)}
                                  />
                               </div>
                               <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 block">Visual Timeline</label>
                                  {selectedAccount.budget_cycle ? (
                                    <BudgetTimeline data={selectedAccount.budget_cycle} />
                                  ) : (
                                    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl border border-gray-200 border-dashed text-gray-500 text-sm italic">
                                       Nhập lộ trình bên trái để xem timeline
                                    </div>
                                  )}
                               </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="card p-6 bg-white border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                                <GitBranch className="text-primary" size={18} /> Quy trình phê duyệt
                              </h3>
                              <textarea 
                                className="input w-full min-h-[120px] bg-white border-gray-200 text-sm text-gray-900 shadow-sm"
                                defaultValue={selectedAccount.buying_process || ''}
                                placeholder="Ghi chú quy trình: ai đề xuất, ai thẩm định, ai ký cuối..."
                                onBlur={(e) => handleSaveAccountField('buying_process', e.target.value)}
                              />
                            </div>
                            <div className="card p-6 bg-white border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                                <AlertCircle className="text-primary" size={18} /> Pain Points & Rào cản
                              </h3>
                              <textarea 
                                className="input w-full min-h-[120px] bg-white border-gray-200 text-sm text-gray-900 shadow-sm"
                                defaultValue={selectedAccount.pain_points || ''}
                                placeholder="Các vấn đề khách hàng đang gặp phải hoặc rào cản tài chính..."
                                onBlur={(e) => handleSaveAccountField('pain_points', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                           <div className="card p-6 bg-white border border-gray-200 shadow-sm">
                             <h3 className="font-bold text-gray-800 flex items-center justify-between mb-6">
                               <span>Active Deals</span>
                               <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{deals.length}</span>
                             </h3>
                             <div className="space-y-4">
                               {deals.length > 0 ? deals.map(deal => (
                                 <div key={deal.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="font-bold text-gray-800 text-sm group-hover:text-primary transition-colors">{deal.name}</div>
                                      <div className="text-[10px] py-0.5 px-1.5 bg-gray-200 text-gray-600 rounded uppercase font-bold">{deal.stage}</div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(deal.value || 0)}</span>
                                      <span className="text-gray-400 flex items-center gap-1"><Calendar size={10}/> {new Date(deal.close_date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                 </div>
                               )) : (
                                 <p className="text-center text-gray-500 py-10 text-sm italic">Không có deal đang thực hiện</p>
                               )}
                             </div>
                           </div>

                           <div className="card p-6 border-primary/20 bg-primary/5 shadow-sm">
                             <h3 className="font-bold text-primary flex items-center gap-2 mb-2">
                               <Zap size={18} /> Budget Tips
                             </h3>
                             <p className="text-xs text-gray-600 leading-relaxed">
                               Thường các khách hàng sản xuất sẽ chốt Budget vào cuối Q3. Hãy đảm bảo các buổi Demo diễn ra trước tháng 8 để kịp ghi nhận vào dự toán năm sau.
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>
                 )}

                 {/* TAB 3: STAKEHOLDER MAP */}
                 {activeTab === 'stakeholder_map' && (
                    <div className="space-y-6">
                      {/* Summary Banner */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {RELATIONSHIPS.map(rel => {
                           const count = orgNodes.filter(n => n.relationship_status === rel.value).length;
                           return (
                             <div key={rel.value} className={`p-4 rounded-2xl border bg-white shadow-sm transition-all hover:scale-105 ${rel.color}`}>
                                <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">{rel.label}</div>
                                <div className="text-2xl font-black">{count}</div>
                             </div>
                           )
                        })}
                      </div>

                      {/* AI Strategy Advisor */}
                      <div className="card p-8 border border-secondary/20 bg-gradient-to-br from-white to-secondary/5 shadow-sm relative overflow-hidden rounded-3xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                           <Zap size={120} className="text-secondary" />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20">
                                <Zap className="text-secondary" size={24} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">AI Sales Strategy Advisor</h3>
                                <p className="text-gray-500 text-sm">Phân tích ma trận quan hệ & đề xuất chiến lược tiếp cận "Path to Champion"</p>
                              </div>
                            </div>
                            <button 
                              onClick={handleFetchAIInsight}
                              disabled={aiLoading}
                              className="px-6 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {aiLoading ? (
                                <span className="flex items-center gap-2 italic"><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span> Thinking...</span>
                              ) : (
                                <span className="flex items-center gap-2"><Zap size={16} /> Generate Strategy</span>
                              )}
                            </button>
                          </div>

                          {aiInsight ? (
                            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm text-gray-700 whitespace-pre-wrap text-sm leading-relaxed animate-in slide-in-from-top-4 duration-500">
                               {aiInsight}
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-gray-500 p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                               <Info size={20} />
                               <p className="text-sm">Bấm "Generate Strategy" để AI phân tích cấu trúc nhân sự và đề xuất bước đi tiếp theo dựa trên dữ liệu hiện có.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Matrix */}
                      <div className="card overflow-hidden bg-white border border-gray-200 shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="font-bold text-gray-900">Ma Trận Ảnh Hưởng & Mối Quan Hệ</h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500 uppercase tracking-widest font-bold">
                             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span> Thấp</div>
                             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary shadow-sm"></span> Trung Bình</div>
                             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent shadow-sm"></span> Cao</div>
                          </div>
                        </div>
                        <div className="p-6 overflow-x-auto bg-gray-50">
                          <div className="min-w-[900px]">
                              <div className="grid grid-cols-[140px_repeat(5,1fr)] gap-4">
                                <div className="flex items-center justify-end pr-4 text-xs font-black text-gray-500 uppercase tracking-widest">
                                  Influence
                                </div>
                                {RELATIONSHIPS.map(rel => (
                                  <div key={rel.value} className="text-center pb-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                                    {rel.label}
                                  </div>
                                ))}
                                
                                {[
                                  { label: 'High (8-10)', check: s => (s||1) >= 8, color: 'text-accent' },
                                  { label: 'Medium (4-7)', check: s => (s||1) >= 4 && (s||1) <= 7, color: 'text-secondary' },
                                  { label: 'Low (1-3)', check: s => (s||1) <= 3, color: 'text-primary' }
                                ].map((row, idx) => (
                                  <React.Fragment key={idx}>
                                     <div className={`flex items-center justify-end pr-4 text-xs font-bold ${row.color}`}>
                                       {row.label}
                                     </div>
                                     {RELATIONSHIPS.map(rel => {
                                       const bucketNodes = orgNodes.filter(n => n.relationship_status === rel.value && row.check(n.influence_score));
                                       return (
                                         <div key={rel.value} className="bg-white border border-gray-200 p-3 min-h-[120px] rounded-2xl flex flex-wrap gap-2 content-start hover:bg-gray-50 transition-all border-dashed shadow-sm">
                                           {bucketNodes.map(bn => (
                                              <div 
                                                key={bn.id} 
                                                onClick={() => { setEditingNode(bn); setIsModalOpen(true); }}
                                                className="group relative"
                                              >
                                                <div 
                                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-gray-800 shadow-sm cursor-pointer border border-gray-200 bg-gray-50 hover:bg-primary hover:text-white hover:border-primary hover:-translate-y-1 transition-all duration-300`}
                                                >
                                                  {bn.name.split(' ').pop().charAt(0).toUpperCase()}
                                                </div>
                                                {/* Tooltip on hover */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-[10px] rounded-lg border border-gray-700 w-32 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                                                   <div className="font-bold border-b border-gray-700 pb-1 mb-1">{bn.name}</div>
                                                   <div>{bn.title}</div>
                                                   <div className="text-gray-300 mt-1">{bn.department}</div>
                                                </div>
                                              </div>
                                           ))}
                                         </div>
                                       )
                                     })}
                                  </React.Fragment>
                                ))}
                              </div>
                          </div>
                        </div>
                      </div>

                      {/* List */}
                      <div className="card overflow-hidden bg-white border border-gray-200 shadow-sm">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                           <h3 className="font-bold text-gray-900">Stakeholder Inventory</h3>
                           <div className="text-xs text-gray-500 italic">Sắp xếp theo thứ tự ưu tiên (Ảnh hưởng cao nhất)</div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-medium text-gray-800">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-200">
                              <tr>
                                <th className="p-5 font-black border-b border-gray-200">Stakeholder</th>
                                <th className="p-5 font-black border-b border-gray-200">Chức vụ & Phòng</th>
                                <th className="p-5 font-black border-b border-gray-200 text-center">Score</th>
                                <th className="p-5 font-black border-b border-gray-200">Mối quan hệ</th>
                                <th className="p-5 font-black border-b border-gray-200">Ghi chú chiến lược</th>
                                <th className="p-5 font-black border-b border-gray-200 text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[...orgNodes].sort((a,b) => (b.influence_score||0) - (a.influence_score||0)).map(node => (
                                <tr key={node.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="p-5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">{node.name.charAt(0)}</div>
                                       <div>
                                          <div className="font-bold text-gray-900">{node.name}</div>
                                          <div className="text-[10px] text-gray-500">{node.reports_to ? 'Reports to leader' : 'Department Lead/C-Level'}</div>
                                       </div>
                                    </div>
                                  </td>
                                  <td className="p-5">
                                    <div className="text-sm text-gray-800">{node.title}</div>
                                    <div className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded border ${getDeptColor(node.department)}`}>{node.department}</div>
                                  </td>
                                  <td className="p-5">
                                     <div className="flex flex-col items-center">
                                        <div className="text-lg font-black text-gray-800">{node.influence_score}/10</div>
                                        {renderCircles(node.influence_score)}
                                     </div>
                                  </td>
                                  <td className="p-5">
                                     <span className={`px-3 py-1 text-xs rounded-full border font-bold ${getRelStyles(node.relationship_status)}`}>
                                       {getRelLabel(node.relationship_status)}
                                     </span>
                                  </td>
                                  <td className="p-5">
                                     <div className="max-w-xs text-xs text-gray-500 line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                                        {node.notes || <span className="italic opacity-30">Chưa có ghi chú chiến lược...</span>}
                                     </div>
                                  </td>
                                  <td className="p-5 text-right">
                                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenHistory(node)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary" title="Lịch sử thay đổi">
                                          <History size={16} />
                                        </button>
                                        <button onClick={() => { setEditingNode(node); setIsModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary">
                                          <Edit2 size={16} />
                                        </button>
                                     </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                 )}
               </>
            )}
          </div>
        </>
      )}

      {/* MODAL ADD/EDIT NODE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary/10 rounded-lg">
                    <Edit2 className="text-primary" size={20} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900">{editingNode ? 'Sửa thông tin: ' + editingNode.name : 'Thêm Stakeholder Mới'}</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveNode} className="p-8 space-y-6 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Họ và tên *</label>
                   <input required type="text" name="name" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.name || ''} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Chức danh</label>
                   <input type="text" name="title" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.title || ''} />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Phòng ban</label>
                   <select name="department" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.department || 'Khác'}>
                     {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cấp bậc</label>
                   <select name="level" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.level || 4}>
                     {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Báo cáo cho (Hierarchy)</label>
                   <select name="reports_to" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.reports_to || ''}>
                     <option value="">-- Không có (Root) --</option>
                     {orgNodes.filter(n => n.id !== editingNode?.id).map(n => (
                       <option key={n.id} value={n.id}>{n.name} ({n.title})</option>
                     ))}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Link với CRM Contact</label>
                   <select name="contact_id" className="input w-full bg-surface-900/50 border-surface-700 focus:border-primary/50" defaultValue={editingNode?.contact_id || ''}>
                     <option value="" className="bg-surface-900">-- Không link --</option>
                     {contacts.map(c => (
                       <option key={c.id} value={c.id} className="bg-surface-900">{c.name} ({c.email})</option>
                     ))}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Influence Score (1-10)</label>
                   </div>
                   <input type="range" name="influence_score" min="1" max="10" defaultValue={editingNode?.influence_score || 5} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quan hệ hiện tại</label>
                   <select name="relationship_status" className="input w-full bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm" defaultValue={editingNode?.relationship_status || 'neutral'}>
                     {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                   </select>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ghi chú chiến lược</label>
                 <textarea name="notes" className="input w-full h-32 resize-none bg-white border-gray-200 text-gray-900 focus:border-primary/50 shadow-sm text-sm" defaultValue={editingNode?.notes || ''} placeholder="Cách tiếp cận, thông tin cá nhân quan trọng, sở thích..." />
               </div>

               <div className="pt-6 flex justify-between items-center border-t border-gray-100">
                 {editingNode ? (
                   <button type="button" onClick={handleDeleteNode} className="text-xs font-bold text-red-500 hover:underline">Xoá stakeholder</button>
                 ) : (<span></span>)}
                 <div className="flex gap-4">
                   <button type="button" className="btn-secondary h-11 px-8 rounded-xl" onClick={() => setIsModalOpen(false)}>Hủy</button>
                   <button type="submit" className="btn-primary h-11 px-8 rounded-xl shadow-lg shadow-primary/20">Lưu thông tin</button>
                 </div>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyNode && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white border border-gray-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                       <History className="text-secondary" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Lịch sử quan hệ: {historyNode.name}</h2>
                 </div>
                 <button className="text-gray-400 hover:text-gray-600" onClick={() => setHistoryNode(null)}>
                    <X size={24} />
                 </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {nodeHistory.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                       {nodeHistory.map((h, i) => (
                          <div key={h.id} className="relative pl-12">
                             <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10 transition-colors hover:border-secondary shadow-sm">
                                {h.new_status === 'champion' ? <TrendingUp size={16} className="text-primary" /> : h.new_status === 'blocker' ? <TrendingDown size={16} className="text-red-500" /> : <Minus size={16} className="text-gray-400" />}
                             </div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <span className="text-xs font-bold text-gray-400">{new Date(h.changed_at).toLocaleString('vi-VN')}</span>
                                   <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-black">{h.old_status} → {h.new_status}</span>
                                </div>
                                <p className="text-sm text-gray-600 font-medium">Trạng thái thay đổi sang <span className="text-gray-900 font-bold">{getRelLabel(h.new_status)}</span></p>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-12 text-center text-gray-400 italic">Chưa có lịch sử thay đổi trạng thái</div>
                 )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                 <button onClick={() => setHistoryNode(null)} className="btn-secondary px-6">Đóng</button>
              </div>
           </div>
        </div>
      )}
      {/* RELATIONSHIP LINK MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white border border-gray-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                       <Share2 className="text-secondary" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Tạo Liên Kết Ảnh Hưởng</h2>
                 </div>
                 <button className="text-gray-400 hover:text-gray-600" onClick={() => setIsLinkModalOpen(false)}>
                    <X size={24} />
                 </button>
              </div>
              <form onSubmit={handleSaveLink} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nguồn ảnh hưởng (Source)</label>
                    <select name="source_node_id" required className="input w-full bg-white border-gray-200 text-gray-900 shadow-sm">
                       <option value="">Chọn stakeholder...</option>
                       {orgNodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.title})</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Đối tượng bị ảnh hưởng (Target)</label>
                    <select name="target_node_id" required className="input w-full bg-white border-gray-200 text-gray-900 shadow-sm">
                       <option value="">Chọn stakeholder...</option>
                       {orgNodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.title})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loại ảnh hưởng</label>
                       <select name="influence_type" className="input w-full bg-white border-gray-200 text-gray-900 shadow-sm">
                          <option value="supportive">Supportive (Hỗ trợ)</option>
                          <option value="antagonistic">Antagonistic (Cản trở)</option>
                          <option value="mentor">Mentor (Dẫn dắt)</option>
                          <option value="peer">Peer (Ngang hàng)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mức độ (1-5)</label>
                       <input type="number" name="strength" min="1" max="5" defaultValue="3" className="input w-full bg-white border-gray-200 text-gray-900 shadow-sm" />
                    </div>
                 </div>
                 <div className="pt-6 flex justify-end gap-4 border-t border-gray-100">
                    <button type="button" className="btn-secondary px-6" onClick={() => setIsLinkModalOpen(false)}>Hủy</button>
                    <button type="submit" className="btn-primary px-8 shadow-lg shadow-primary/20">Tạo Liên Kết</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
