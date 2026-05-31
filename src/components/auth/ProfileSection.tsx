import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { LoginModal } from './LoginModal'
import { ProfileModal } from './ProfileModal'

const DEFAULT_AVATAR = 'person'

interface ProfileSectionProps {
  className?: string
}

export function ProfileSection({ className }: ProfileSectionProps) {
  const { t } = useTranslation()
  const { isLoggedIn, user, login } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Remove the useEffect that causes extra saveUser calls - handled in handleLoginSuccess
  // The backend sync on login is already done in handleLoginSuccess

  const handleLoginSuccess = (
    userId: string,
    userData: {
      id: string
      name: string
      email: string
      role: string
      avatar_url: string | null
    }
  ) => {
    login(userId, userData)
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
        onClick={() => setProfileModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-surface-container-high"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-9 h-9 rounded-full border border-secondary"
          />
        ) : (
          <span
            className="material-symbols-outlined w-10 h-10 pt-1 flex items-center justify-center rounded-full border border-black"
            style={{ fontSize: '1.75em' }}
          >
            {DEFAULT_AVATAR}
          </span>
        )}
        <div className="hidden lg:block leading-tight">
          <p className="font-body-sm text-body-lg font-bold text-primary">
            {user.name}
          </p>
          <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">
            {user.role}
          </p>
        </div>
      </button>
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </div>
  )
}

export { LoginModal } from './LoginModal'
