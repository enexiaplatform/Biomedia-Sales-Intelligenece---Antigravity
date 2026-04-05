export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;

  let colorClass = "text-slate-400 bg-slate-400/10 border-slate-400/20";
  if (score >= 7) colorClass = "text-[#2EA043] bg-[#2EA043]/10 border-[#2EA043]/20";
  else if (score >= 4) colorClass = "text-[#D29922] bg-[#D29922]/10 border-[#D29922]/20";
  else colorClass = "text-[#8B0000] bg-[#8B0000]/10 border-[#8B0000]/20";

  return (
    <span className={`badge ${colorClass}`}>
      {score}/10
    </span>
  );
}
