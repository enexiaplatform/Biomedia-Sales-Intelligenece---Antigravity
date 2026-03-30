import React, { useState, useEffect, useCallback } from 'react';
import { Network, Plus, Calendar, Target, AlertCircle, GitBranch, Save, Edit2, X } from 'lucide-react';
import { 
  supabase, 
  fetchAccounts, 
  fetchContacts, 
  updateAccount,
  fetchOrgNodes,
  createOrgNode,
  updateOrgNode,
  deleteOrgNode
} from '../lib/supabase';

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
    case 'QC': return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
    case 'R&D': return 'text-purple-300 bg-purple-500/10 border-purple-500/20';
    case 'Procurement': return 'text-orange-300 bg-orange-500/10 border-orange-500/20';
    case 'Management': return 'text-red-300 bg-red-500/10 border-red-500/20';
    case 'Production': return 'text-green-300 bg-green-500/10 border-green-500/20';
    case 'Finance': return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
    default: return 'text-slate-300 bg-slate-500/10 border-slate-500/20';
  }
}

function getRelStyles(rel) {
  const r = RELATIONSHIPS.find(x => x.value === rel);
  return r ? r.color : 'text-slate-400 border-slate-400/30';
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
    circles.push(<span key={i} className={i <= filled ? 'text-indigo-400' : 'text-slate-600'}>●</span>);
  }
  return <span className="flex tracking-widest text-xs">{circles}</span>;
}

const buildTree = (nodes, parentId = null) => {
  return nodes
    .filter(n => n.reports_to === parentId)
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }));
};

const TreeNode = ({ node, onEdit }) => {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="flex flex-col items-center">
      <div 
        onClick={() => onEdit(node)}
        className="w-56 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-md cursor-pointer hover:border-indigo-500 hover:bg-slate-750 transition-all z-10 mx-2"
      >
        <div className="font-bold text-slate-100 truncate">{node.name}</div>
        <div className="text-sm text-slate-400 truncate mb-2">{node.title || 'Chưa rõ chức danh'}</div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`px-2 py-0.5 text-xs rounded border ${getDeptColor(node.department)}`}>
            {node.department || 'Khác'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded border ${getRelStyles(node.relationship_status)}`}>
            {getRelLabel(node.relationship_status)}
          </span>
        </div>
        <div className="mt-3 text-xs flex justify-between items-center bg-slate-900/50 p-1.5 rounded">
          <span className="text-slate-400">Ảnh hưởng:</span>
          <span>{renderCircles(node.influence_score)}</span>
        </div>
      </div>

      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-slate-600"></div>
          <div className="flex relative items-start justify-center">
             {node.children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === node.children.length - 1;
                const onlyChild = node.children.length === 1;

                return (
                  <div key={child.id} className="flex flex-col items-center relative">
                     {!onlyChild && (
                        <div 
                           className={`absolute top-0 h-px bg-slate-600`}
                           style={{ 
                              width: isFirst || isLast ? '50%' : '100%',
                              left: isFirst ? '50%' : 0,
                              right: isLast ? '50%' : 0
                           }}
                        ></div>
                     )}
                     <div className="w-px h-6 bg-slate-600 relative z-0"></div>
                     <TreeNode node={child} onEdit={onEdit} />
                  </div>
                )
             })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function BDTool() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  const [activeTab, setActiveTab] = useState('org_chart');
  const [orgNodes, setOrgNodes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

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
      const [orgRes, contactsRes] = await Promise.all([
        fetchOrgNodes(accountId),
        fetchContacts(accountId)
      ]);
      if (orgRes.data) setOrgNodes(orgRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
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

  const treeData = React.useMemo(() => buildTree(orgNodes), [orgNodes]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <Save size={18} className="mr-2" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             <Network className="text-indigo-400" />
             BD Tool
          </h1>
          <p className="text-slate-400 mt-1">Org Chart, Budget Intelligence & Stakeholder Map</p>
        </div>
        
        {/* Account Selector */}
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="input w-full lg:w-80 bg-slate-800 border-slate-700 text-slate-200"
        >
          <option value="">Chọn khách hàng...</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name} — {acc.type?.toUpperCase()} — {acc.region}
            </option>
          ))}
        </select>
      </div>

      {!selectedAccount ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800 rounded-xl border border-slate-700">
          <Network size={48} className="text-slate-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-300">Chọn một khách hàng để bắt đầu phân tích BD</h2>
        </div>
      ) : (
        <>
          {/* Tabs Nav */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('org_chart')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'org_chart' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
            >
              Org Chart
            </button>
            <button
              onClick={() => setActiveTab('budget_intel')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'budget_intel' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
            >
              Budget Intelligence
            </button>
            <button
              onClick={() => setActiveTab('stakeholder_map')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'stakeholder_map' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
            >
              Stakeholder Map
            </button>
          </div>

          <div className="pt-2">
            {loading ? (
               <div className="animate-pulse flex p-10 justify-center">Loading data...</div>
            ) : (
               <>
                 {/* TAB 1: ORG CHART */}
                 {activeTab === 'org_chart' && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 min-h-[500px] overflow-auto relative">
                      <div className="absolute top-4 right-4 z-20">
                        <button 
                          onClick={() => { setEditingNode(null); setIsModalOpen(true); }}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Plus size={16} /> Thêm Người
                        </button>
                      </div>

                      {treeData.length === 0 ? (
                        <div className="flex justify-center items-center h-[400px] text-slate-500">
                           Chưa có org chart. Bấm '+ Thêm Người' để bắt đầu.
                        </div>
                      ) : (
                        <div className="pt-12 min-w-max flex justify-center">
                           <div className="flex flex-row justify-center gap-8 items-start">
                             {treeData.map(rootNode => (
                               <TreeNode key={rootNode.id} node={rootNode} onEdit={(n) => { setEditingNode(n); setIsModalOpen(true); }} />
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                 )}

                 {/* TAB 2: BUDGET INTEL */}
                 {activeTab === 'budget_intel' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card p-5">
                          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
                            <Calendar className="text-indigo-400" size={18} /> Chu kỳ ngân sách & thời điểm phê duyệt
                          </h3>
                          <textarea 
                            className="input w-full min-h-[100px] bg-slate-900 resize-y"
                            defaultValue={selectedAccount.budget_cycle || ''}
                            placeholder="Chưa có thông tin. Ví dụ: Q4 hàng năm, tháng 10-11"
                            onBlur={(e) => handleSaveAccountField('budget_cycle', e.target.value)}
                          />
                        </div>
                        <div className="card p-5">
                          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
                            <GitBranch className="text-indigo-400" size={18} /> Quy trình & người phê duyệt
                          </h3>
                          <textarea 
                            className="input w-full min-h-[100px] bg-slate-900 resize-y"
                            defaultValue={selectedAccount.buying_process || ''}
                            placeholder="Ví dụ: QC đề xuất → Giám đốc duyệt → Procurement đấu thầu"
                            onBlur={(e) => handleSaveAccountField('buying_process', e.target.value)}
                          />
                        </div>
                        <div className="card p-5">
                          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
                            <Target className="text-indigo-400" size={18} /> Nhu cầu & vấn đề hiện tại
                          </h3>
                          <textarea 
                            className="input w-full min-h-[100px] bg-slate-900 resize-y"
                            defaultValue={selectedAccount.current_needs || ''}
                            placeholder="Ghi chú nhu cầu cấp bách..."
                            onBlur={(e) => handleSaveAccountField('current_needs', e.target.value)}
                          />
                        </div>
                        <div className="card p-5">
                          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
                            <AlertCircle className="text-indigo-400" size={18} /> Pain points & cơ hội
                          </h3>
                          <textarea 
                            className="input w-full min-h-[100px] bg-slate-900 resize-y"
                            defaultValue={selectedAccount.pain_points || ''}
                            placeholder="Ví dụ: Đang dùng máy hãng X hay bị hỏng..."
                            onBlur={(e) => handleSaveAccountField('pain_points', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="card p-6 border-indigo-500/30">
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                           Chiến lược tiếp cận
                        </h3>
                        <textarea 
                          className="input w-full min-h-[200px] bg-slate-900 text-slate-200"
                          defaultValue={selectedAccount.notes || ''}
                          placeholder="Ghi chú chiến lược: ai là champion, cách tiếp cận, timeline, rủi ro..."
                          onBlur={(e) => handleSaveAccountField('notes', e.target.value)}
                        />
                      </div>
                    </div>
                 )}

                 {/* TAB 3: STAKEHOLDER MAP */}
                 {activeTab === 'stakeholder_map' && (
                    <div className="space-y-6">
                      {/* Summary Banner */}
                      <div className="flex flex-wrap gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700 justify-center">
                        {RELATIONSHIPS.map(rel => {
                           const count = orgNodes.filter(n => n.relationship_status === rel.value).length;
                           return (
                             <div key={rel.value} className={`px-4 py-2 border rounded-full font-medium ${rel.color}`}>
                                {count} {rel.label}
                             </div>
                           )
                        })}
                      </div>

                      {/* Matrix */}
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 overflow-x-auto">
                        <div className="min-w-[800px]">
                            <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-3 mb-4">
                               <div className="font-bold flex items-end justify-end p-2 text-slate-400 text-sm border-r border-b border-transparent">
                                 Ảnh hưởng \ Quan hệ
                               </div>
                               {RELATIONSHIPS.map(rel => (
                                 <div key={rel.value} className="font-bold text-center p-2 text-slate-300 border-b border-slate-700">
                                   {rel.label}
                                 </div>
                               ))}
                               
                               {[
                                 { label: 'Cao (8-10)', check: s => (s||1) >= 8 },
                                 { label: 'TB (4-7)', check: s => (s||1) >= 4 && (s||1) <= 7 },
                                 { label: 'Thấp (1-3)', check: s => (s||1) <= 3 }
                               ].map((row, idx) => (
                                 <React.Fragment key={idx}>
                                    <div className="font-bold flex items-center justify-end p-2 pr-4 text-slate-300 text-sm border-r border-slate-700">
                                      {row.label}
                                    </div>
                                    {RELATIONSHIPS.map(rel => {
                                      const bucketNodes = orgNodes.filter(n => n.relationship_status === rel.value && row.check(n.influence_score));
                                      return (
                                        <div key={rel.value} className="bg-slate-800/50 border border-slate-700/50 p-2 min-h-[100px] rounded flex flex-wrap gap-2 content-start hover:bg-slate-800 transition-colors">
                                          {bucketNodes.map(bn => {
                                            const bgClass = getDeptColor(bn.department).split(' ').find(c => c.startsWith('bg-'))?.replace('/10', '') || 'bg-slate-600';
                                            return (
                                              <div 
                                                key={bn.id} 
                                                onClick={() => { setEditingNode(bn); setIsModalOpen(true); }}
                                                title={`${bn.name} - ${bn.title}\nPhòng: ${bn.department}`} 
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg cursor-pointer border-2 border-slate-900 ${bgClass} hover:opacity-80 hover:scale-110 transition-transform`}
                                              >
                                                {bn.name.split(' ').pop().charAt(0).toUpperCase()}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )
                                    })}
                                 </React.Fragment>
                               ))}
                            </div>
                        </div>
                      </div>

                      {/* List */}
                      <div className="card overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                          <h3 className="font-bold text-slate-200">Danh sách Stakeholders</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-medium text-slate-300">
                            <thead className="bg-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                              <tr>
                                <th className="p-4 font-semibold w-1/5">Tên</th>
                                <th className="p-4 font-semibold w-1/5">Chức danh</th>
                                <th className="p-4 font-semibold">Phòng ban</th>
                                <th className="p-4 font-semibold text-center w-24">Ảnh hưởng</th>
                                <th className="p-4 font-semibold">Quan hệ</th>
                                <th className="p-4 font-semibold w-1/3">Ghi chú (Bấm để sửa)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                              {[...orgNodes].sort((a,b) => (b.influence_score||0) - (a.influence_score||0)).map(node => (
                                <tr key={node.id} className="hover:bg-slate-800/50">
                                  <td className="p-4 cursor-pointer text-indigo-400 hover:underline" onClick={() => { setEditingNode(node); setIsModalOpen(true); }}>
                                    {node.name}
                                  </td>
                                  <td className="p-4 text-slate-400">{node.title}</td>
                                  <td className="p-4"><span className={`px-2 py-1 text-xs rounded border ${getDeptColor(node.department)}`}>{node.department}</span></td>
                                  <td className="p-4 text-center">{node.influence_score || 1}/10</td>
                                  <td className="p-4 text-sm">{getRelLabel(node.relationship_status)}</td>
                                  <td className="p-4 relative group">
                                     <textarea 
                                        className="w-full bg-transparent border-0 resize-none hover:bg-slate-800 focus:bg-slate-800 focus:ring-1 focus:ring-indigo-500 rounded p-1 text-sm text-slate-400 transition-colors"
                                        defaultValue={node.notes || ''}
                                        rows={2}
                                        onBlur={(e) => {
                                          if(e.target.value !== node.notes) {
                                            updateOrgNode(node.id, { notes: e.target.value });
                                            showToast('Đã lưu ghi chú');
                                          }
                                        }}
                                     />
                                  </td>
                                </tr>
                              ))}
                              {orgNodes.length === 0 && (
                                <tr>
                                  <td colSpan="6" className="p-8 text-center text-slate-500">
                                    Chưa có stakeholder nào. Hãy thêm vào org chart để phân tích.
                                  </td>
                                </tr>
                              )}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold">{editingNode ? 'Sửa thông tin: ' + editingNode.name : 'Thêm Node Mới'}</h2>
              <button className="text-slate-400 hover:text-white" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveNode} className="p-6 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Họ và tên *</label>
                   <input required type="text" name="name" className="input w-full" defaultValue={editingNode?.name || ''} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Chức danh</label>
                   <input type="text" name="title" className="input w-full" defaultValue={editingNode?.title || ''} />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Phòng ban</label>
                   <select name="department" className="input w-full" defaultValue={editingNode?.department || 'Khác'}>
                     {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Cấp bậc</label>
                   <select name="level" className="input w-full" defaultValue={editingNode?.level || 4}>
                     {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Báo cáo cho (Reports To)</label>
                   <select name="reports_to" className="input w-full" defaultValue={editingNode?.reports_to || ''}>
                     <option value="">-- Không có (Root) --</option>
                     {orgNodes.filter(n => n.id !== editingNode?.id).map(n => (
                       <option key={n.id} value={n.id}>{n.name} ({n.title})</option>
                     ))}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Link với Contact (Tuỳ chọn)</label>
                   <select name="contact_id" className="input w-full" defaultValue={editingNode?.contact_id || ''}>
                     <option value="">-- Không --</option>
                     {contacts.map(c => (
                       <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                     ))}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                     <label>Điểm ảnh hưởng (1 Mờ nhạt - 10 Ra quyết định)</label>
                   </div>
                   <input type="range" name="influence_score" min="1" max="10" defaultValue={editingNode?.influence_score || 5} className="w-full mt-2" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-300">Mối quan hệ</label>
                   <select name="relationship_status" className="input w-full" defaultValue={editingNode?.relationship_status || 'neutral'}>
                     {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                   </select>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-sm font-medium text-slate-300">Ghi chú</label>
                 <textarea name="notes" className="input w-full h-24 resize-y" defaultValue={editingNode?.notes || ''} />
               </div>

               <div className="pt-4 flex justify-between items-center border-t border-slate-700">
                 {editingNode ? (
                   <button type="button" onClick={handleDeleteNode} className="p-2 text-red-400 hover:bg-red-400/10 rounded">Xoá người này</button>
                 ) : (<span></span>)}
                 <div className="flex gap-3">
                   <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                   <button type="submit" className="btn-primary">Lưu</button>
                 </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
