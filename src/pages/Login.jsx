import { useState } from "react";
import { Lock, User, ArrowRight } from "lucide-react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate slight delay for "premium" feel
    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        onLogin();
      } else {
        setError("Tài khoản hoặc mật khẩu không đúng");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />

      <div className="card w-full max-w-md p-8 relative z-10 border-white/10 backdrop-blur-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-900/20 border border-red-500/30 mb-4 shadow-glow-red">
            <Lock className="text-red-500" size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">BIOMEDIA SI</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Hệ thống quản trị thông minh</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-bold animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="label">Tài khoản</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                className="input pl-11"
                placeholder="Nhập tài khoản..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="password"
                className="input pl-11"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base group"
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                Đăng nhập hệ thống
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-loose">
            Bản quyền thuộc về Biomedia Group © {new Date().getFullYear()}<br />
            Hệ thống bảo mật dữ liệu cấp độ 3
          </p>
        </div>
      </div>
    </div>
  );
}
