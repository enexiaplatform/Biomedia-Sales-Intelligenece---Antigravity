import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Building2, MessageSquare, Zap, Home, TrendingUp } from 'lucide-react';

export default function CommandPalette({ accounts = [], deals = [], onOpenQuickLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset state and focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Compute Results
  const results = useMemo(() => {
    if (query.trim().length < 2) {
      return [
        { id: 'action_new_deal', type: 'action', title: 'Tạo Deal mới', icon: Plus, action: () => navigate('/pipeline?new=true') },
        { id: 'action_add_account', type: 'action', title: 'Thêm Tài khoản', icon: Building2, action: () => navigate('/accounts?new=true') },
        { id: 'action_log_interaction', type: 'action', title: 'Log tương tác', icon: MessageSquare, action: onOpenQuickLog },
        { id: 'action_ai_coach', type: 'action', title: 'AI Coach', icon: Zap, action: () => navigate('/ai-coach') },
        { id: 'action_dashboard', type: 'action', title: 'Dashboard', icon: Home, action: () => navigate('/') },
        { id: 'action_pipeline', type: 'action', title: 'Pipeline', icon: TrendingUp, action: () => navigate('/pipeline') },
      ];
    }

    const lowerQuery = query.toLowerCase();
    
    const matchedAccounts = accounts
      .filter(a => a.name?.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(a => ({
        id: `account_${a.id}`,
        type: 'account',
        title: a.name,
        action: () => navigate(`/accounts/${a.id}`)
      }));

    const matchedDeals = deals
      .filter(d => d.name?.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(d => ({
        id: `deal_${d.id}`,
        type: 'deal',
        title: d.name,
        action: () => navigate(`/pipeline?dealId=${d.id}`)
      }));

    return [...matchedAccounts, ...matchedDeals];
  }, [query, accounts, deals, navigate, onOpenQuickLog]);

  // Handle selected index reset on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle arrow navigation and enter execution
  function handleInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeAction(results[selectedIndex]);
      }
    }
  }

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  function executeAction(item) {
    setIsOpen(false);
    if (item.action) {
      item.action();
    }
  }

  if (!isOpen) return null;

  const isQuickActions = query.trim().length < 2;

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
      
      {/* Palette Panel */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in mx-4">
        {/* Input area */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:outline-none text-base text-gray-800 placeholder-gray-400 w-full"
            placeholder="Tìm kiếm hoặc gõ lệnh..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        {/* Results area */}
        <div className="max-h-80 overflow-y-auto py-2" ref={listRef}>
          {isQuickActions && (
            <div className="text-xs uppercase text-gray-400 px-4 py-2 font-semibold">
              Hành động nhanh
            </div>
          )}
          
          {!isQuickActions && results.length > 0 && (
            <div className="text-xs uppercase text-gray-400 px-4 py-2 font-semibold">
              Kết quả tìm kiếm
            </div>
          )}

          {!isQuickActions && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Không tìm thấy kết quả nào cho "{query}"
            </div>
          )}

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const Icon = item.icon;
            
            return (
              <div
                key={item.id}
                onClick={() => executeAction(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`mx-2 px-4 py-2.5 rounded-lg cursor-pointer flex items-center transition-colors ${
                  isSelected 
                    ? 'bg-blue-50 border-l-2 border-blue-500' 
                    : 'hover:bg-slate-50 border-l-2 border-transparent'
                }`}
              >
                {item.type === 'action' ? (
                  Icon && <Icon className={`w-4 h-4 mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                ) : (
                  <span className={`text-[10px] uppercase font-bold tracking-wider mr-3 px-1.5 py-0.5 rounded ${
                    item.type === 'account' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {item.type === 'account' ? 'Tài khoản' : 'Deal'}
                  </span>
                )}
                
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
