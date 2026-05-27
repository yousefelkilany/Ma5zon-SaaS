import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  name: string
  email: string
}

type TabId = 'account' | 'security' | 'activity'

const tabs: { id: TabId; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'activity', label: 'Activity Logs' },
]

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordUpdateError, setPasswordUpdateError] = useState('')
  const [passwordPolicy, setPasswordPolicy] = useState({
    length: false,
    uppercase: false,
    numeric: false,
    special: false,
    match: false,
  })
  const [isNewPasswordDirty, setIsNewPasswordDirty] = useState(false)
  const [isConfirmPasswordDirty, setIsConfirmPasswordDirty] = useState(false)

  useEffect(() => {
    if (open && user) {
      setFormData({
        name: user.name,
        email: 'user@example.com',
      })
    }
  }, [open, user])

  useEffect(() => {
    if (!open) {
      setActiveTab('account')
      setIsSaving(false)
      setSaveSuccess(false)
      // Also reset password form when modal closes
      setPasswordForm({ current: '', new: '', confirm: '' })
      setPasswordErrors({ current: '', new: '', confirm: '' })
      setPasswordUpdateError('')
      setPasswordPolicy({
        length: false,
        uppercase: false,
        numeric: false,
        special: false,
        match: false,
      })
      setIsNewPasswordDirty(false)
      setIsConfirmPasswordDirty(false)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (e.key === 'ArrowRight') {
      const nextTab = tabs[(currentIndex + 1) % tabs.length]
      if (nextTab) setActiveTab(nextTab.id)
    } else if (e.key === 'ArrowLeft') {
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      if (prevTab) setActiveTab(prevTab.id)
    }
  }

  const validatePassword = (): boolean => {
    const errors = { current: '', new: '', confirm: '' }
    let valid = true

    if (!passwordForm.current) {
      errors.current = 'Current password is required'
      valid = false
    }

    if (!passwordForm.new) {
      errors.new = 'New password is required'
      valid = false
    } else if (passwordForm.new.length < 8) {
      errors.new = 'Password must be at least 8 characters'
      valid = false
    } else if (!/[A-Z]/.test(passwordForm.new)) {
      errors.new = 'Password must contain at least one uppercase letter'
      valid = false
    } else if (!/[0-9]/.test(passwordForm.new)) {
      errors.new = 'Password must contain at least one numeric digit'
      valid = false
    } else if (!/[!@#$]/.test(passwordForm.new)) {
      errors.new =
        'Password must contain at least one special character (!, @, #, $)'
      valid = false
    }

    if (passwordForm.new !== passwordForm.confirm) {
      errors.confirm = 'Passwords do not match'
      valid = false
    }

    setPasswordErrors(errors)
    return valid
  }

  const evaluatePasswordPolicy = (password: string) => {
    setPasswordPolicy(prev => ({
      ...prev,
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      numeric: /[0-9]/.test(password),
      special: /[!@#$]/.test(password),
    }))
  }

  const evaluatePasswordMatch = (newPwd: string, confirmPwd: string) => {
    setPasswordPolicy(prev => ({
      ...prev,
      match: confirmPwd.length > 0 && newPwd === confirmPwd,
    }))
  }

  const handlePasswordUpdate = async () => {
    if (!user) return
    if (!validatePassword()) return

    setIsUpdatingPassword(true)
    setPasswordUpdateError('')

    const result = await commands.updatePassword(
      user.id,
      passwordForm.current,
      passwordForm.new
    )

    setIsUpdatingPassword(false)

    if (result.status === 'error') {
      setPasswordUpdateError(result.error || 'Failed to update password')
      return
    }

    // Success - clear form
    setPasswordForm({ current: '', new: '', confirm: '' })
    setPasswordPolicy({
      length: false,
      uppercase: false,
      numeric: false,
      special: false,
      match: false,
    })
    setIsNewPasswordDirty(false)
    setIsConfirmPasswordDirty(false)
    setActiveTab('account')
  }

  const handleCancelPassword = () => {
    setPasswordForm({ current: '', new: '', confirm: '' })
    setPasswordErrors({ current: '', new: '', confirm: '' })
    setPasswordUpdateError('')
    setPasswordPolicy({
      length: false,
      uppercase: false,
      numeric: false,
      special: false,
      match: false,
    })
    setIsNewPasswordDirty(false)
    setIsConfirmPasswordDirty(false)
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setSaveSuccess(false)

    const result = await commands.updateUser(
      user.id,
      formData.name,
      formData.email,
      user.avatar_url
    )

    if (result.status === 'error') {
      setIsSaving(false)
      return
    }

    // Update the query cache directly with the returned user data
    queryClient.setQueryData(['user', user.id], result.data)

    // Also update localStorage for persistence
    if (result.data) {
      localStorage.setItem(`user_${user.id}`, JSON.stringify(result.data))
    }

    setIsSaving(false)
    setSaveSuccess(true)

    setTimeout(() => {
      setSaveSuccess(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-surface-container border-outline-variant rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          maxWidth: '48rem',
          width: 'calc(100% - 2rem)',
          maxHeight: '85vh',
          overflow: 'auto',
          zIndex: 51,
        }}
        title="Profile"
        aria-description="Profile Dialog"
      >
        <div className="flex flex-col h-full">
          <header className="px-cozy-padding pt-cozy-padding pb-gutter bg-surface-container-high">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              User Profile & Security
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Manage your enterprise account settings and security preferences.
            </p>
          </header>

          <div
            className="flex px-cozy-padding bg-surface-container-high border-b border-outline-variant"
            role="tablist"
            onKeyDown={handleKeyDown}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`font-label-caps text-label-caps py-compact-padding px-gutter border-b-2 cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'account' && (
              <div
                id="account-panel"
                role="tabpanel"
                aria-labelledby="account-tab"
                className="p-cozy-padding bg-surface-container grid grid-cols-1 md:grid-cols-12 gap-cozy-gap"
              >
                <aside className="md:col-span-4 flex flex-col items-center justify-start space-y-gutter border-r border-outline-variant/30 pr-cozy-padding">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-outline-variant bg-surface-container-highest">
                      {user?.avatar_url ? (
                        <img
                          alt="User profile"
                          className="w-full h-full object-cover"
                          src={user.avatar_url}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
                          <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                            person
                          </span>
                        </div>
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-secondary text-on-secondary rounded-full shadow-lg hover:bg-secondary-fixed transition-transform active:scale-95 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {user?.name || 'User'}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {user?.role || 'Loading...'}
                    </p>
                  </div>
                </aside>

                <section className="md:col-span-8 flex flex-col space-y-gutter">
                  <div className="space-y-compact-gap">
                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="fullName"
                      >
                        Full Name
                      </label>
                      <input
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface font-body-md text-body-md px-gutter py-compact-padding focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
                        id="fullName"
                        type="text"
                        value={formData.name}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <input
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface font-body-md text-body-md px-gutter py-compact-padding focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="role"
                      >
                        Enterprise Role
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                          disabled
                          id="role"
                          type="text"
                          value={user?.role || ''}
                        />
                        <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                          lock
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant italic mt-1">
                        Roles can only be modified by the System Administrator.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-gutter pt-gutter">
                      <div className="flex flex-col space-y-1">
                        <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                          Department
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                            disabled
                            type="text"
                            value="Department"
                          />
                          <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                            lock
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                          Location
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                            disabled
                            type="text"
                            value="Location"
                          />
                          <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                            lock
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-cozy-padding flex items-center justify-end space-x-gutter">
                    <button
                      className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface px-gutter py-compact-padding transition-colors"
                      type="button"
                      onClick={() => onOpenChange(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      className={`font-label-caps text-label-caps px-cozy-padding py-compact-padding transition-all active:scale-95 flex items-center space-x-2 ${
                        saveSuccess
                          ? 'bg-secondary-container text-on-secondary-container cursor-default'
                          : 'bg-secondary text-on-secondary hover:bg-secondary-fixed'
                      } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || saveSuccess}
                    >
                      {isSaving ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">
                            sync
                          </span>
                          <span>Processing...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                          <span>Saved Successfully</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">
                            save
                          </span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'security' && (
              <div
                id="security-panel"
                role="tabpanel"
                aria-labelledby="security-tab"
                className="p-cozy-padding bg-surface-container grid grid-cols-1 md:grid-cols-12 gap-cozy-gap"
              >
                {/* Left Panel - Password Policy & Security Status */}
                <aside className="md:col-span-4 space-y-cozy-gap">
                  <div className="p-cozy-padding bg-surface-container-low rounded-lg border border-outline-variant">
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-cozy-gap">
                      Password Policy
                    </h3>
                    <ul className="space-y-3 font-body-sm text-body-sm text-on-surface-variant">
                      <li className="flex items-start gap-2">
                        {isNewPasswordDirty ? (
                          <span
                            className={`material-symbols-outlined text-[18px] ${passwordPolicy.length ? 'text-secondary' : 'text-error'}`}
                          >
                            {passwordPolicy.length ? 'check_circle' : 'cancel'}
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-outline-variant">
                            circle
                          </span>
                        )}
                        Minimum 8 characters
                      </li>
                      <li className="flex items-start gap-2">
                        {isNewPasswordDirty ? (
                          <span
                            className={`material-symbols-outlined text-[18px] ${passwordPolicy.uppercase ? 'text-secondary' : 'text-error'}`}
                          >
                            {passwordPolicy.uppercase
                              ? 'check_circle'
                              : 'cancel'}
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-outline-variant">
                            circle
                          </span>
                        )}
                        One uppercase letter
                      </li>
                      <li className="flex items-start gap-2">
                        {isNewPasswordDirty ? (
                          <span
                            className={`material-symbols-outlined text-[18px] ${passwordPolicy.numeric ? 'text-secondary' : 'text-error'}`}
                          >
                            {passwordPolicy.numeric ? 'check_circle' : 'cancel'}
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-outline-variant">
                            circle
                          </span>
                        )}
                        One numeric digit
                      </li>
                      <li className="flex items-start gap-2">
                        {isNewPasswordDirty ? (
                          <span
                            className={`material-symbols-outlined text-[18px] ${passwordPolicy.special ? 'text-secondary' : 'text-error'}`}
                          >
                            {passwordPolicy.special ? 'check_circle' : 'cancel'}
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-outline-variant">
                            circle
                          </span>
                        )}
                        One special character (!, @, #, $)
                      </li>
                      <li className="flex items-start gap-2">
                        {isNewPasswordDirty || isConfirmPasswordDirty ? (
                          <span
                            className={`material-symbols-outlined text-[18px] ${passwordPolicy.match ? 'text-secondary' : 'text-error'}`}
                          >
                            {passwordPolicy.match ? 'check_circle' : 'cancel'}
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-outline-variant">
                            circle
                          </span>
                        )}
                        Passwords match
                      </li>
                    </ul>
                  </div>
                </aside>

                {/* Right Panel - Password Update Form */}
                <section className="md:col-span-8 p-cozy-padding bg-surface-container-low rounded-lg border border-outline-variant">
                  <div className="mb-gutter">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                      Update Password
                    </h2>
                  </div>
                  <form
                    className="space-y-gutter"
                    onSubmit={e => {
                      e.preventDefault()
                      handlePasswordUpdate()
                    }}
                  >
                    {/* Current Password */}
                    <div className="space-y-2">
                      <label
                        className="block font-label-caps text-label-caps text-on-surface-variant"
                        htmlFor="current-password"
                      >
                        Current Password
                      </label>
                      <div className="relative group">
                        <input
                          className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-cozy-padding py-3 text-on-surface font-body-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none pr-12"
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.current}
                          onChange={e =>
                            setPasswordForm(prev => ({
                              ...prev,
                              current: e.target.value,
                            }))
                          }
                          disabled={isUpdatingPassword}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          <span className="material-symbols-outlined">
                            {showCurrentPassword
                              ? 'visibility_off'
                              : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {passwordErrors.current && (
                        <p className="font-body-sm text-error">
                          {passwordErrors.current}
                        </p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <label
                        className="block font-label-caps text-label-caps text-on-surface-variant"
                        htmlFor="new-password"
                      >
                        New Password
                      </label>
                      <div className="relative group">
                        <input
                          className={`w-full bg-surface-container-high border rounded-lg px-cozy-padding py-3 text-on-surface font-body-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none pr-12 ${passwordErrors.new ? 'border-error' : 'border-outline-variant'}`}
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.new}
                          onChange={e => {
                            setIsNewPasswordDirty(true)
                            setPasswordForm(prev => ({
                              ...prev,
                              new: e.target.value,
                            }))
                            evaluatePasswordPolicy(e.target.value)
                            evaluatePasswordMatch(
                              e.target.value,
                              passwordForm.confirm
                            )
                          }}
                          disabled={isUpdatingPassword}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          <span className="material-symbols-outlined">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {passwordErrors.new && (
                        <p className="font-body-sm text-error">
                          {passwordErrors.new}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label
                        className="block font-label-caps text-label-caps text-on-surface-variant"
                        htmlFor="confirm-password"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative group">
                        <input
                          className={`w-full bg-surface-container-high border rounded-lg px-cozy-padding py-3 text-on-surface font-body-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none pr-12 ${passwordErrors.confirm ? 'border-error' : 'border-outline-variant'}`}
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirm}
                          onChange={e => {
                            setIsConfirmPasswordDirty(true)
                            setPasswordForm(prev => ({
                              ...prev,
                              confirm: e.target.value,
                            }))
                            evaluatePasswordMatch(
                              passwordForm.new,
                              e.target.value
                            )
                          }}
                          disabled={isUpdatingPassword}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <span className="material-symbols-outlined">
                            {showConfirmPassword
                              ? 'visibility_off'
                              : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {passwordErrors.confirm && (
                        <p className="font-body-sm text-error">
                          {passwordErrors.confirm}
                        </p>
                      )}
                    </div>

                    {passwordUpdateError && (
                      <div className="p-compact-padding bg-error-container rounded-lg border border-error">
                        <p className="font-body-sm text-on-error-container">
                          {passwordUpdateError}
                        </p>
                      </div>
                    )}

                    <div className="pt-cozy-padding flex flex-col sm:flex-row items-center gap-gutter border-t border-outline-variant">
                      <button
                        className="w-full sm:w-auto px-10 py-3 bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:bg-primary-fixed-dim active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={isUpdatingPassword}
                      >
                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        className="w-full sm:w-auto text-on-surface-variant font-label-caps text-label-caps hover:text-on-surface transition-colors disabled:opacity-50"
                        type="button"
                        onClick={handleCancelPassword}
                        disabled={isUpdatingPassword}
                      >
                        Cancel Changes
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {activeTab === 'activity' && (
              <div
                id="activity-panel"
                role="tabpanel"
                aria-labelledby="activity-tab"
                className="p-cozy-padding"
              >
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
