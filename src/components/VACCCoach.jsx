import { useState, useEffect } from 'react';
import { Target, Brain, Award, Zap } from 'lucide-react';
import { fetchDeals } from '../lib/supabase';
import { callAISalesCoach } from '../lib/ai';
import { VACC_COACH_PROMPT } from '../lib/gm_ai_prompts';
import { PageLoader } from './LoadingSpinner';

export default function VACCCoach() {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    loadInsight();
  }, []);

  async function loadInsight() {
    setLoading(true);
    try {
      // Pull latest deals to feed the AI
      const { data: deals } = await fetchDeals();
      const currentDeals = deals || [];
      const totalDeals = currentDeals.length;
      const wonDeals = currentDeals.filter(d => d.stage === 'closed_won').length;
      
      const metrics = `
- System: Biomedia Sales CRM
- Tổng số Deals trong Pipeline: ${totalDeals}
- Deal thắng gần đây: ${wonDeals}
- Tần suất tương tác: RẤT CAO (Sales Manager trực tiếp đi khách hàng thay vì để Team đi)
- Cảnh báo hệ thống: Đang có dấu hiệu "Firefighting" (ôm việc của nhân sự cấp dưới).
      `;

      const promptContext = VACC_COACH_PROMPT.replace('[METRICS_INJECTED]', metrics);
      
      const response = await callAISalesCoach("Hãy tóm tắt ngắn gọn và phân tích điểm mù của tôi tuần này theo framework VACC.", {
         history: [{ role: 'system', content: promptContext }]
      });

      setInsight(response);
    } catch (err) {
      console.error(err);
      setInsight("AI Coach hiện chưa sẵn sàng. Vui lòng kiểm tra API Key hoặc liên hệ Admin để được hỗ trợ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-900 border border-surface-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700" />
      
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <Brain className="text-primary drop-shadow-glow" size={24} />
        </div>
        <div>
           <h2 className="text-xl font-black text-slate-100 uppercase tracking-widest">VACC Capability Coach</h2>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Executive Performance Feedback</p>
        </div>
      </div>

      <div className="min-h-[200px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center opacity-50 py-8">
             <Brain className="text-primary animate-pulse mb-4" size={32} />
             <span className="text-[10px] uppercase font-black tracking-widest text-primary">Analyzing your leadership patterns...</span>
          </div>
        ) : (
          <div className="text-sm text-slate-300 leading-relaxed space-y-4 whitespace-pre-wrap">
             {insight}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
         <button onClick={loadInsight} disabled={loading} className="btn-secondary h-10 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Zap size={14} className="text-primary" /> Reload Insights
         </button>
      </div>
    </div>
  );
}
