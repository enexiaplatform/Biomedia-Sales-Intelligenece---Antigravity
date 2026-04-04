export default function LoadingSpinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-4"
  };

  return (
    <div
      className={`${sizes[size]} border-gray-200 border-t-blue-600 rounded-full spinner ${className}`}
      role="status"
      aria-label="Đang tải..."
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center fixed inset-0 z-[100] bg-[#020617]">
      <div className="text-center p-8 glass-panel border border-primary/20 shadow-glow-primary">
        <LoadingSpinner size="lg" className="mx-auto mb-6" />
        <h2 className="text-xl font-black text-slate-100 uppercase tracking-[0.3em] mb-2">Biomedia SI</h2>
        <p className="text-xs text-primary font-bold uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}
