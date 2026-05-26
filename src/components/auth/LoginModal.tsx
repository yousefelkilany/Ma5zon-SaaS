import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: (userId: string) => void
}

// const REMEMBER_ME_KEY = 'login_remember_me'

export function LoginModal({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginModalProps) {
  const { t } = useTranslation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setUsername('')
      setPassword('')
      setError('')
      setIsLoading(false)
      setShake(false)
    }
  }, [open])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1200))

    if (!username.trim() || !password.trim()) {
      setError(t('auth.invalidCredentials'))
      triggerShake()
      setIsLoading(false)
      return
    }

    const mockUserId = `user_${username.toLowerCase().replace(/\s+/g, '_')}`
    setIsLoading(false)
    onLoginSuccess(mockUserId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className={`bg-surface-container border-outline-variant rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${shake ? 'animate-shake' : ''}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          maxWidth: '28rem',
          width: 'calc(100% - 2rem)',
          maxHeight: '85vh',
          overflow: 'auto',
          zIndex: 51,
        }}
        onEscapeKeyDown={e => {
          if (isLoading) {
            e.preventDefault()
          }
        }}
      >
        <div className="px-cozy-padding pt-cozy-padding pb-gutter text-center">
          <div className="mb-gutter flex justify-center">
            <img
              alt="Ma5zon Logo"
              className="h-16 w-16 object-contain"
              src=""
            />
          </div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">
            {t('auth.signInToMa5zon')}
          </h1>
          <p className="text-on-surface-variant text-body-sm mt-1">
            {t('auth.enterpriseFinancial')}
          </p>
        </div>

        <div className="px-cozy-padding pb-cozy-padding">
          <form className="space-y-gutter" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-label-caps font-label-caps text-on-surface-variant uppercase"
                htmlFor="username"
              >
                {t('auth.username')}
              </label>
              <div className="relative group">
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface px-4 py-3 rounded focus:ring-2 focus:ring-secondary focus:border-transparent transition-all outline-none text-body-md placeholder:text-on-surface-variant/30"
                  id="username"
                  name="username"
                  placeholder="e.g. j.smith"
                  required
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-label-caps font-label-caps text-on-surface-variant uppercase"
                htmlFor="password"
              >
                {t('auth.password')}
              </label>
              <div className="relative group">
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface px-4 py-3 pr-12 rounded focus:ring-2 focus:ring-secondary focus:border-transparent transition-all outline-none text-body-md placeholder:text-on-surface-variant/30"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-50"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 text-on-error-container bg-error-container/10 p-compact-padding rounded border border-error-container/20 ${error ? '' : 'hidden'}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                error
              </span>
              <span className="text-body-sm">{error}</span>
            </div>

            <button
              className="w-full bg-secondary text-on-secondary font-headline-sm py-3 rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    refresh
                  </span>
                  <span>{t('auth.authenticating')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_open</span>
                  <span>{t('auth.signIn')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest px-cozy-padding py-compact-padding flex items-center justify-center gap-2 border-t border-outline-variant/30">
          <span className="material-symbols-outlined text-on-surface-variant text-[14px]">
            verified_user
          </span>
          <span className="text-label-caps text-on-surface-variant uppercase">
            256-bit AES Encrypted Connection
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LoginModal
