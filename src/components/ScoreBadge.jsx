export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;

  let colorClass = "text-text-tertiary bg-[#70707015] border-[#707070]/20";
  if (score >= 7) colorClass = "text-green-400 bg-green-500/15 border-green-500/20";
  else if (score >= 4) colorClass = "text-yellow-400 bg-yellow-500/15 border-yellow-500/20";
  else colorClass = "text-red-400 bg-red-500/15 border-red-500/20";

  return (
    <span className={`badge ${colorClass}`}>
      {score}/10
    </span>
  );
}
