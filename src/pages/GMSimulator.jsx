import { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, AlertOctagon, Briefcase, DollarSign, Activity, Zap } from 'lucide-react';
import { fetchDeals } from '../lib/supabase';
import { PageLoader } from '../components/LoadingSpinner';
import SituationRoom from '../components/SituationRoom';
import VACCCoach from '../components/VACCCoach';

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

export default function GMSimulator() {
  const [loading, setLoading] = useState(true);
  const [gmLensActive, setGmLensActive] = useState(false);
  const [situationRoomOpen, setSituationRoomOpen] = useState(false);
  const [salesData, setSalesData] = useState({ revenue: 0, pipeline: 0 });
  
  // Radar data
  const [radarData, setRadarData] = useState([
    { subject: 'Financial', A: 50, fullMark: 100 },
    { subject: 'Value Chain', A: 40, fullMark: 100 },
    { subject: 'Business', A: 60, fullMark: 100 },
    { subject: 'Leadership', A: 55, fullMark: 100 },
    { subject: 'Change Mgmt', A: 45, fullMark: 100 },
    { subject: 'Networking', A: 70, fullMark: 100 },
    { subject: 'Global Mindset', A: 50, fullMark: 100 },
    { subject: 'Market Access', A: 65, fullMark: 100 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: deals } = await fetchDeals();
    if (deals) {
      let rev = 0;
      let pipe = 0;
      deals.forEach(d => {
        if (d.stage === 'closed_won') rev += d.value || 0;
        else if (d.stage !== 'closed_lost') pipe += d.value || 0;
      });
      setSalesData({ revenue: rev, pipeline: pipe });
    }
    setLoading(false);
  }

  // Calculated P&L (Mock)
  const cogsRate = 0.55; 
  const salesMktgRate = 0.15;
  const generalAdminRate = 0.10;
  
  const grossRevenue = salesData.revenue;
  const cogs = grossRevenue * cogsRate;
  const grossMargin = grossRevenue - cogs;
  
  const opex = grossRevenue * (salesMktgRate + generalAdminRate);
  const ebitda = grossMargin - opex;

  const handleUpdateRadar = (deltas) => {
    setRadarData(prev => prev.map(item => {
      const delta = deltas[item.subject] || 0;
      return { ...item, A: Math.max(0, Math.min(100, item.A + delta)) };
    }));
  };

  if (loading) return <div className="h-full flex items-center justify-center"><PageLoader /></div>;

  return (
    <div className={`flex flex-col h-full relative overflow-x-hidden min-h-[calc(100vh-100px)] transition-colors duration-1000 ${gmLensActive ? 'bg-slate-950' : 'bg-surface-950'}`}>
      
      {/* Background Effect */}
      <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full -z-10 transition-colors duration-1000 ${gmLensActive ? 'bg-amber-500/10' : 'bg-primary/5'}`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 mt-2">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className={`p-2.5 rounded-xl border ${gmLensActive ? 'bg-amber-500/20 border-amber-500/30' : 'bg-primary/20 border-primary/30'}`}>
               <Briefcase className={gmLensActive ? 'text-amber-500' : 'text-primary'} size={24} />
             </div>
             <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">GM Simulator Hub</h1>
           </div>
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-14">Executive Training & Strategic Gym</p>
        </div>

        {/* GM Lens Toggle */}
        <div className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-500 ${gmLensActive ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-surface-900 border-surface-700'}`}>
           <div className="text-right">
             <div className={`text-[10px] uppercase font-black tracking-widest ${gmLensActive ? 'text-amber-500' : 'text-slate-400'}`}>
               {gmLensActive ? 'Executive P&L Mode' : 'Sales KPI Mode'}
             </div>
             <div className="text-xs text-slate-500 font-semibold">{gmLensActive ? 'Viewing Hidden Costs & EBITDA' : 'Viewing Revenue & Pipeline'}</div>
           </div>
           
           <button 
             onClick={() => setGmLensActive(!gmLensActive)}
             className={`w-16 h-8 rounded-full relative transition-colors duration-500 ${gmLensActive ? 'bg-amber-500' : 'bg-surface-700'}`}
           >
             <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-sm ${gmLensActive ? 'left-[36px]' : 'left-1'}`} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        
        {/* Core Metrics Viewer (Affected by Toggle) */}
        <div className="xl:col-span-2 space-y-6">
           {gmLensActive ? (
             // P&L View
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <MetricCard title="Gross Margin (Mock: COGS 55%)" value={formatVND(grossMargin)} icon={<Activity/>} color="text-blue-400" bgColor="bg-blue-500/10" borderColor="border-blue-500/20" />
               <MetricCard title="EBITDA (Mock OPEX 25%)" value={formatVND(ebitda)} icon={<DollarSign/>} color="text-amber-500" bgColor="bg-amber-500/10" borderColor="border-amber-500/30" glow="shadow-[0_0_30px_rgba(245,158,11,0.2)]" valueSize="text-4xl" />
               <div className="md:col-span-2 bg-surface-900 p-6 rounded-3xl border border-surface-700 flex flex-col justify-center">
                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">P&L Breakdown</div>
                 <div className="flex h-4 rounded-full overflow-hidden w-full opacity-80">
                   <div style={{width: '55%'}} className="bg-rose-500 hover:opacity-100 transition" title="COGS - 55%"></div>
                   <div style={{width: '15%'}} className="bg-purple-500 hover:opacity-100 transition" title="Sales & Mktg - 15%"></div>
                   <div style={{width: '10%'}} className="bg-slate-500 hover:opacity-100 transition" title="G&A - 10%"></div>
                   <div style={{width: '20%'}} className="bg-amber-500 hover:opacity-100 transition" title="EBITDA - 20%"></div>
                 </div>
                 <div className="flex justify-between mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                   <span className="text-rose-500">COGS</span>
                   <span className="text-purple-500">S&M</span>
                   <span className="text-slate-500">G&A</span>
                   <span className="text-amber-500">EBITDA</span>
                 </div>
               </div>
             </div>
           ) : (
             // Sales View
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <MetricCard title="Gross Revenue" value={formatVND(grossRevenue)} icon={<DollarSign/>} color="text-primary" bgColor="bg-primary/10" borderColor="border-primary/20" valueSize="text-4xl" />
               <MetricCard title="Active Pipeline" value={formatVND(salesData.pipeline)} icon={<TrendingUp/>} color="text-emerald-400" bgColor="bg-emerald-500/10" borderColor="border-emerald-500/20" />
             </div>
           )}

           <div className="bg-surface-900 border border-surface-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -z-10 group-hover:bg-red-500/10 transition-all duration-700" />
              <div className="flex justify-between items-center z-10 relative">
                <div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                    <AlertOctagon className="text-red-500" size={24} />
                    Situation Room
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Simulate supply chain & business crises</p>
                </div>
                <button 
                  onClick={() => setSituationRoomOpen(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-glow-sm shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  <Zap size={16} /> Báo động giả lập
                </button>
              </div>
           </div>
        </div>

        {/* Radar Chart (GM Pillars) */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-3xl p-6 shadow-2xl flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 text-center">8 GM Pillars Capability Framework</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="GM Score"
                  dataKey="A"
                  stroke={gmLensActive ? '#f59e0b' : '#10B981'}
                  fill={gmLensActive ? '#f59e0b' : '#10B981'}
                  fillOpacity={0.3}
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-xs text-slate-400 font-medium italic">
            * Điểm số sẽ tăng/giảm dựa trên quyết định của bạn trong Situation Room.
          </div>
        </div>
      </div>

      {/* Coach Box */}
      <VACCCoach />

      {/* Modals */}
      {situationRoomOpen && (
        <SituationRoom 
          onClose={() => setSituationRoomOpen(false)}
          onUpdateRadar={handleUpdateRadar}
        />
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color, bgColor, borderColor, glow = '', valueSize = 'text-3xl' }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden group ${bgColor} ${borderColor} ${glow}`}>
      <div className={`p-3 rounded-2xl border bg-black/20 backdrop-blur-sm shadow-inner inline-flex mb-6 ${borderColor} ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</div>
        <div className={`${valueSize} font-black tracking-tighter ${color}`}>{value}</div>
      </div>
    </div>
  );
}
