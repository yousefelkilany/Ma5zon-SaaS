import { useUIStore } from '@/store/ui-store'

export const useUserPreferences = () => {
  const userPreferences = useUIStore(state => state.userPreferences)
  const updateUserPreferences = useUIStore(state => state.updateUserPreferences)

  return { userPreferences, updateUserPreferences }
}
