import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { commands } from '@/lib/bindings'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: (
    userId: string,
    user: {
      id: string
      name: string
      email: string
      role: string
      avatar_url: string | null
    }
    // sessionToken: string
  ) => void
}

export function LoginModal({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginModalProps) {
  const { t } = useTranslation()

  const [formState, setFormState] = useState({
    username: '',
    password: '',
    showPassword: false,
    error: '',
    isLoading: false,
  })
  const [shake, setShake] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { username, password, showPassword, error, isLoading } = formState

  useEffect(() => {
    if (!open) {
      setFormState({
        username: '',
        password: '',
        showPassword: false,
        error: '',
        isLoading: false,
      })
      setShake(false)
    }
  }, [open, t])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState(prev => ({ ...prev, error: '', isLoading: true }))

    const result = await commands.authenticate(username, password)

    if (result.status === 'error') {
      setFormState(prev => ({
        ...prev,
        error: t('auth.authenticationFailed'),
        isLoading: false,
      }))
      console.error(`[LoginModal] Auth error: ${result.error}`)
      triggerShake()
      return
    }

    if (!result.data) {
      setFormState(prev => ({
        ...prev,
        error: t('auth.invalidCredentials'),
        isLoading: false,
      }))
      console.error(`[LoginModal] Login failed - invalid credentials`)
      triggerShake()
      return
    }

    console.log(`[LoginModal] Login success for user: ${result.data.name}`)

    setFormState(prev => ({ ...prev, isLoading: false }))
    // const [user, sessionToken] = result.data
    const user = result.data
    onLoginSuccess(
      user.id,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      }
      // sessionToken
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title=""
        aria-describedby={t('auth.login.dialogDescription')}
        ref={contentRef}
        className="bg-surface-container border-outline-variant rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
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
        <div className={shake ? 'animate-shake' : ''}>
          <div className="px-cozy-padding pt-cozy-padding pb-gutter text-center">
            <div className="mb-gutter flex justify-center">
              <img
                alt="Ma5zon Logo"
                className="h-16 w-16 object-contain"
                src={new URL('@/assets/logo.svg', import.meta.url).href}
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
                    placeholder={t('auth.usernamePlaceholder')}
                    required
                    type="text"
                    value={username}
                    onChange={e =>
                      setFormState(prev => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
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
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e =>
                      setFormState(prev => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    disabled={isLoading}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-50"
                    type="button"
                    onClick={() =>
                      setFormState(prev => ({
                        ...prev,
                        showPassword: !prev.showPassword,
                      }))
                    }
                    disabled={isLoading}
                  >
                    <span className="material-symbols-outlined inset-e-0">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LoginModal
