import { VND_TO_SGD_RATE } from "../lib/constants";

export default function CurrencyDisplay({ value, className = "", showSGD = false }) {
  if (value === null || value === undefined) return <span className={className}>—</span>;
  
  const formattedVND = Number(value).toLocaleString("vi-VN") + " ₫";
  
  if (!showSGD) return <span className={className}>{formattedVND}</span>;

  const sgdValue = value * VND_TO_SGD_RATE;
  const formattedSGD = new Intl.NumberFormat('en-SG', { 
    style: 'currency', 
    currency: 'SGD', 
    maximumFractionDigits: 0 
  }).format(sgdValue);

  return (
    <div className={`flex flex-col ${className}`}>
      <span>{formattedVND}</span>
      <span className="text-[10px] text-gray-400 font-normal leading-none mt-0.5">≈ {formattedSGD}</span>
    </div>
  );
}
