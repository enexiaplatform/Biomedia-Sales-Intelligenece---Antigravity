import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export const DEPARTMENTS = ['QC', 'R&D', 'Procurement', 'Management', 'Production', 'Finance', 'Khác'];
export const RELATIONSHIPS = [
  { value: 'champion', label: 'Champion', icon: '★', color: 'text-green-400 border-green-400/30' },
  { value: 'supporter', label: 'Supporter', icon: '✓', color: 'text-teal-400 border-teal-400/30' },
  { value: 'neutral', label: 'Neutral', icon: '—', color: 'text-slate-400 border-slate-400/30' },
  { value: 'skeptic', label: 'Skeptic', icon: '⚠', color: 'text-orange-400 border-orange-400/30' },
  { value: 'blocker', label: 'Blocker', icon: '✕', color: 'text-red-400 border-red-400/30' },
];

export function getDeptColor(dept) {
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

export function getRelStyles(rel) {
  const r = RELATIONSHIPS.find(x => x.value === rel);
  return r ? r.color : 'text-slate-400 border-slate-400/30';
}

export function getRelLabel(rel) {
  const r = RELATIONSHIPS.find(x => x.value === rel);
  if (!r) return rel;
  return `${r.icon} ${r.label}`;
}

export function renderCircles(score) {
  const max = 5;
  const filled = Math.ceil((score || 1) / 2);
  const circles = [];
  for (let i = 1; i <= max; i++) {
    circles.push(<span key={i} className={i <= filled ? 'text-primary' : 'text-slate-700'}>●</span>);
  }
  return <span className="flex tracking-widest text-[10px]">{circles}</span>;
}

export const InfluenceMesh = ({ nodes, links, containerRef }) => {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newPos = {};
      
      nodes.forEach(node => {
        const el = document.getElementById(`node-${node.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          newPos[node.id] = {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
          };
        }
      });
      setPositions(newPos);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    const timer = setTimeout(updatePositions, 500); 
    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timer);
    };
  }, [nodes, containerRef]);

  if (!links || links.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
      <defs>
        <marker id="arrowhead-support" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#69f6b8" />
        </marker>
        <marker id="arrowhead-block" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#fb7185" />
        </marker>
      </defs>
      {links.map(link => {
        const start = positions[link.source_node_id];
        const end = positions[link.target_node_id];
        if (!start || !end) return null;

        const isBlocker = link.influence_type === 'blocker' || link.influence_type === 'antagonistic';
        const color = isBlocker ? '#fb7185' : '#69f6b8';
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;

        return (
          <path
            key={link.id}
            d={`M${start.x},${start.y} A${dr},${dr} 0 0,1 ${end.x},${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={isBlocker ? "5,5" : "0"}
            markerEnd={`url(#arrowhead-${isBlocker ? 'block' : 'support'})`}
            className="opacity-40 animate-pulse hover:opacity-100 transition-opacity"
            style={{ animationDuration: '3s' }}
          />
        );
      })}
    </svg>
  );
};

export const buildTree = (nodes, parentId = null) => {
  return nodes
    .filter(n => n.reports_to === parentId)
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }));
};

export const TreeNode = ({ node, onEdit, filterDepts }) => {
  const isHidden = filterDepts?.length > 0 && !filterDepts.includes(node.department);
  const hasChildren = node.children && node.children.length > 0;
  const filteredChildren = node.children?.filter(c => 
    filterDepts?.length === 0 || filterDepts.includes(c.department) || (c.children && c.children.length > 0)
  );

  return (
    <div id={`node-${node.id}`} className={`flex flex-col items-center transition-all duration-300 ${isHidden ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
      <div 
        onClick={() => onEdit && onEdit(node)}
        className="w-56 p-3 bg-surface-800 border border-surface-700/50 rounded-xl shadow-2xl cursor-pointer hover:border-primary hover:bg-surface-700 transition-all z-10 mx-2 glass-panel group"
      >
        <div className="flex justify-between items-start mb-1">
          <div className="font-bold text-slate-100 truncate flex-1 group-hover:text-primary transition-colors">{node.name}</div>
          {node.level === 1 && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 rounded border border-red-500/30 font-bold">C-Suite</span>}
        </div>
        <div className="text-[11px] text-slate-400 truncate mb-2">{node.title || 'Chưa rõ chức danh'}</div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`px-2 py-0.5 text-[9px] rounded border font-bold uppercase tracking-tighter ${getDeptColor(node.department)}`}>
            {node.department || 'Khác'}
          </span>
          <span className={`px-2 py-0.5 text-[9px] rounded border font-bold uppercase tracking-tighter ${getRelStyles(node.relationship_status)}`}>
            {getRelLabel(node.relationship_status)}
          </span>
        </div>
        <div className="mt-3 text-[9px] flex justify-between items-center bg-surface-900/50 p-2 rounded-lg border border-surface-700/30">
          <span className="text-slate-500 uppercase tracking-widest font-black opacity-50">Influence</span>
          <span>{renderCircles(node.influence_score)}</span>
        </div>
      </div>

      {hasChildren && filteredChildren.length > 0 && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-surface-700"></div>
          <div className="flex relative items-start justify-center">
             {filteredChildren.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === filteredChildren.length - 1;
                const onlyChild = filteredChildren.length === 1;

                return (
                  <div key={child.id} className="flex flex-col items-center relative">
                     {!onlyChild && (
                        <div 
                           className={`absolute top-0 h-px bg-surface-700`}
                           style={{ 
                              width: isFirst || isLast ? '50%' : '100%',
                              left: isFirst ? '50%' : 0,
                              right: isLast ? '50%' : 0
                           }}
                        ></div>
                     )}
                     <div className="w-px h-6 bg-surface-700 relative z-0"></div>
                     <TreeNode node={child} onEdit={onEdit} filterDepts={filterDepts} />
                  </div>
                )
             })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function OrgChartView({ nodes, links, onEditNode }) {
  const chartContainerRef = React.useRef(null);
  const treeData = React.useMemo(() => buildTree(nodes), [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-surface-700 rounded-2xl">
        <p>Chưa có dữ liệu sơ đồ tổ chức.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-900/30 border border-surface-700/30 rounded-3xl p-8 min-h-[500px] overflow-auto relative" ref={chartContainerRef}>
      <InfluenceMesh nodes={nodes} links={links} containerRef={chartContainerRef} />
      <div className="pt-4 min-w-max flex justify-center">
        <div className="flex flex-row justify-center gap-12 items-start">
          {treeData.map(rootNode => (
            <TreeNode 
              key={rootNode.id} 
              node={rootNode} 
              onEdit={onEditNode} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
