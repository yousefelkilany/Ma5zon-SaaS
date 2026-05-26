import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { commands } from '@/lib/bindings'
import { LoginModal } from './LoginModal'

const DEFAULT_AVATAR = new URL('@/assets/profile.svg', import.meta.url).href

interface ProfileSectionProps {
  className?: string
}

export function ProfileSection({ className }: ProfileSectionProps) {
  const { t } = useTranslation()
  const { isLoggedIn, user, login } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Remove the useEffect that causes extra saveUser calls - handled in handleLoginSuccess
  // The backend sync on login is already done in handleLoginSuccess

  const handleLoginSuccess = async (userId: string) => {
    console.log('[ProfileSection] handleLoginSuccess called with:', userId)
    // Create user object from mock login
    const userData = {
      id: userId,
      name: 'Guest User',
      role: 'User',
      avatar_url: null,
    }
    
    // Try to save to backend (may fail in dev without Tauri)
    try {
      const result = await commands.saveUser(userData)
      console.log('[ProfileSection] saveUser result:', result)
    } catch (e) {
      console.warn('[ProfileSection] saveUser failed (expected in dev):', e)
    }
    
    // Store in localStorage as fallback
    localStorage.setItem(`user_${userId}`, JSON.stringify(userData))
    
    // Call login with user data to set state immediately
    login(userId, userData)
    console.log('[ProfileSection] login called')
  }

  if (!isLoggedIn) {
    return (
      <>
        <button
          onClick={() => setLoginModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full hover:bg-surface-container-high ${className ?? ''}`}
        >
          <span className="material-symbols-outlined">login</span>
          <span className="text-body-sm">{t('nav.login')}</span>
        </button>
        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={`flex items-center gap-compact-gap ${className ?? ''}`}>
      <button
        className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-surface-container-high"
      >
        <img
          src={user.avatar_url ?? DEFAULT_AVATAR}
          alt={user.name}
          className="w-9 h-9 rounded-full border border-secondary"
        />
        <div className="hidden lg:block leading-tight">
          <p className="font-body-sm text-body-lg font-bold text-primary">{user.name}</p>
          <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">{user.role}</p>
        </div>
      </button>
    </div>
  )
}

export { LoginModal } from './LoginModal'
