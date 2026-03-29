export default function CurrencyDisplay({ value, className = "" }) {
  if (value === null || value === undefined) return <span className={className}>—</span>;
  const formatted = Number(value).toLocaleString("vi-VN");
  return <span className={className}>{formatted} ₫</span>;
}
