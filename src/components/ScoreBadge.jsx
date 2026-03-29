export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;

  let colorClass = "bg-gray-100 text-gray-600";
  if (score >= 7) colorClass = "bg-green-100 text-green-700";
  else if (score >= 4) colorClass = "bg-yellow-100 text-yellow-700";
  else colorClass = "bg-red-100 text-red-700";

  return (
    <span className={`badge ${colorClass} font-semibold`}>
      {score}/10
    </span>
  );
}
