import { useState, useEffect, useRef } from 'react'
import type { User } from '@/lib/bindings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { commands } from '@/lib/bindings';

const AUTH_USER_ID_KEY = 'auth_user_id';
const REQUEST_LOGIN_EVENT = 'auth:request-login';

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

export function requestLogin() {
  window.dispatchEvent(new CustomEvent(REQUEST_LOGIN_EVENT));
}

export function useAuth() {
  const queryClient = useQueryClient();
  // Use useState to make userId reactive so UI updates when it changes
  const [userId, setUserId] = useState<string | null>(() => getAuthUserId());
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Sync with localStorage on mount and when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUserId = getAuthUserId();
      if (storedUserId !== userIdRef.current) {
        setUserId(storedUserId);
      }
    };
    
    // Listen for storage events (from same tab or other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes since storage event doesn't fire in same tab
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
}, []);

  // Session validation on mount - clear stale credentials
  useEffect(() => {
    let aborted = false;
    const storedUserId = getAuthUserId();
    if (storedUserId) {
      commands.validateSession(storedUserId).then(result => {
        if (aborted) return;
        if (result.status === 'error' || result.data === false) {
          setAuthUserId(null);
          setUserId(null);
          localStorage.removeItem(`user_${storedUserId}`);
        }
      }).catch(() => {
        if (aborted) return;
        setAuthUserId(null);
        setUserId(null);
      });
    }
    return () => { aborted = true; };
  }, []);

  // Session invalidation on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentUserId = getAuthUserId();
      if (currentUserId) {
        commands.invalidateSession(currentUserId).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const result = await commands.loadUser(userId);
      if (result.status === 'error') {
        console.warn('[useAuth] loadUser failed, checking localStorage fallback');
        // Fallback: try to get user data from localStorage if backend fails
        const storedUser = localStorage.getItem(`user_${userId}`);
        if (storedUser) {
          try {
            return JSON.parse(storedUser) as User;
          } catch {
            return null;
          }
        }
        return null;
      }
      return result.data;
    },
    enabled: userId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const login = (newUserId: string, userData?: User, sessionToken?: string) => {
    console.log('[useAuth] login called with:', newUserId, userData);
    setAuthUserId(newUserId);
    setUserId(newUserId); // Update reactive state so UI updates immediately

    // Store session token if provided
    if (sessionToken) {
      localStorage.setItem('session_token', sessionToken);
    }

    // If userData is provided (e.g., from mock login), store it directly
    if (userData) {
      localStorage.setItem(`user_${newUserId}`, JSON.stringify(userData));
      // Also set the query data directly to avoid async loading issues
      queryClient.setQueryData(['user', newUserId], userData);
    }
    queryClient.invalidateQueries({ queryKey: ['user', newUserId] });
  };

  const logout = () => {
    const currentUserId = getAuthUserId();
    console.log('[useAuth] logout called, currentUserId:', currentUserId);
    
    // Clear auth ID
    setAuthUserId(null);
    setUserId(null); // Update reactive state so UI updates immediately
    
    // Clear user data from localStorage
    if (currentUserId) {
      localStorage.removeItem(`user_${currentUserId}`);
    }
    localStorage.removeItem('session_token');
    
    // Clear query cache completely
    queryClient.clear();
  };

  return {
    isLoggedIn: userId !== null,
    user: userQuery.data ?? null,
    isLoading: userQuery.isLoading,
    login,
    logout,
  };
}