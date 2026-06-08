import { useState, useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { LoginModal } from './LoginModal'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoggedIn, login } = useAuth()
  const location = useLocation()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const pendingAuthCheckRef = useRef(false)

  useEffect(() => {
    if (!isLoggedIn) {
      pendingAuthCheckRef.current = true
      setLoginModalOpen(true)
    }
  }, [location.pathname, isLoggedIn])

  useEffect(() => {
    const handleRequestLogin = () => {
      if (!isLoggedIn) {
        setLoginModalOpen(true)
      }
    }
    window.addEventListener('auth:request-login', handleRequestLogin)
    return () =>
      window.removeEventListener('auth:request-login', handleRequestLogin)
  }, [isLoggedIn])

  const handleLoginSuccess = (
    userId: string,
    _userData: {
      id: string
      name: string
      role: string
      avatar_url: string | null
    }
  ) => {
    login(userId)
    setLoginModalOpen(false)
    pendingAuthCheckRef.current = false
  }

  const handleModalOpenChange = (open: boolean) => {
    setLoginModalOpen(open)
    if (!open) {
      pendingAuthCheckRef.current = false
    }
  }

  return (
    <>
      {isLoggedIn && children}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={handleModalOpenChange}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
}
