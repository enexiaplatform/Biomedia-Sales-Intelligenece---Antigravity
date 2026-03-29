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
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-3" />
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    </div>
  );
}
