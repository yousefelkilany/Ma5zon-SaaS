import { useState, useEffect, useRef } from 'react'
import type { User } from '@/lib/bindings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { commands } from '@/lib/bindings';

const AUTH_USER_ID_KEY = 'auth_user_id';
const REQUEST_LOGIN_EVENT = 'auth:request-login';

function clearSessionData(): void {
  console.log('[useAuth] Clearing session data');
  localStorage.removeItem(AUTH_USER_ID_KEY);
  localStorage.removeItem('session_token');
  // Clear any stored user data
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('user_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

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

  // Invalidate session on app start - force re-login
  const cleanupRanRef = useRef(false);
  useEffect(() => {
    if (cleanupRanRef.current) {
      console.log('[useAuth] Skipping cleanup - already ran');
      return;
    }
    cleanupRanRef.current = true;
    console.log('[useAuth] App starting - invalidating any existing session');
    clearSessionData();
    setUserId(null);
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
    console.log('[useAuth] login called with:', newUserId, 'sessionToken:', sessionToken ? 'present' : 'none');
    // Clear any existing session data first
    clearSessionData();
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
    console.log('[useAuth] login complete, userId set to:', newUserId);
  };

  const logout = () => {
    const currentUserId = getAuthUserId();
    console.log('[useAuth] logout called, currentUserId:', currentUserId);

    // Clear session data
    clearSessionData();
    setUserId(null);

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