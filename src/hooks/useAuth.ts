import { useQuery, useQueryClient } from '@tanstack/react-query';
import { commands } from '@/lib/bindings';

const AUTH_USER_ID_KEY = 'auth_user_id';

export function getAuthUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_USER_ID_KEY);
}

function setAuthUserId(userId: string | null): void {
  if (userId === null) {
    localStorage.removeItem(AUTH_USER_ID_KEY);
  } else {
    localStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const userId = getAuthUserId();

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const result = await commands.loadUser(userId);
      if (result.status === 'error') return null;
      return result.data;
    },
    enabled: userId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const login = (userId: string) => {
    setAuthUserId(userId);
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
  };

  const logout = () => {
    const currentUserId = getAuthUserId();
    setAuthUserId(null);
    queryClient.removeQueries({ queryKey: ['user', currentUserId] });
  };

  return {
    isLoggedIn: userId !== null,
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    login,
    logout,
  };
}