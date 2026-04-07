import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

const Login = () => {
  const { user, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Already logged in → redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-md px-4">
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}
        >
          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-14 h-14 mb-4"
                style={{
                  background: 'var(--brand)',
                  borderRadius: '14px',
                }}
              >
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--text-1)' }}
              >
                Biomedia SI
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-2)' }}
              >
                Sales Intelligence Platform
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-5 flex items-start gap-3 p-4 rounded-lg"
                style={{
                  background: 'var(--brand-bg)',
                  border: '1px solid var(--brand-border)',
                }}
              >
                <AlertCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--brand)' }}
                />
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Đăng nhập
                  </>
                )}
              </button>
            </form>
          </div>

          <div
            className="px-8 py-4 text-center"
            style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Biomedia Group · Internal Use Only
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-3)' }}>
          Secured by Supabase Auth
        </p>
      </div>
    </div>
  )
}

export default Login
