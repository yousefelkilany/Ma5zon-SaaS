# Profile Modal & Session Security Design

**Date:** 2026-05-27
**Status:** Draft

## 1. Overview

Implement a profile settings modal accessible from the Navbar when a user is logged in, displaying user info with editable fields (name, email, profile pic). Additionally, ensure session security by invalidating sessions on app close and clearing stale credentials on app start.

## 2. Components

### ProfileModal

A Dialog-based modal with 3 tabs:

| Tab           | Content                                                                                          | State          |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------- |
| Account       | Full profile form with editable name, email, profile pic, and read-only role/department/location | Active/default |
| Security      | Skeleton placeholder                                                                             | Placeholder    |
| Activity Logs | Skeleton placeholder                                                                             | Placeholder    |

**File:** `src/components/auth/ProfileModal.tsx`

**Props:**

```typescript
interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Layout (matching `profile-settings-details-tab.html`):**

- Left column (col-span-4): Avatar with edit button, user name/role, last login badge
- Right column (col-span-8): Form fields for Full Name, Email, read-only Role, Department, Location
- Footer: System status bar with version and timezone

**Behavior:**

- Tab switching via keyboard (ArrowLeft/ArrowRight) and click
- Active tab indicated by `border-b-2 border-secondary text-secondary`
- Save button shows loading spinner → success state → resets (matching existing micro-interaction pattern)

### ProfileSection (Update)

**File:** `src/components/auth/ProfileSection.tsx`

When logged in, clicking the avatar button opens the ProfileModal instead of doing nothing.

**Changes:**

- Add state for `profileModalOpen: boolean`
- Render `<ProfileModal>` when logged in
- Clicking profile button sets `profileModalOpen(true)`

### Auth Hook (Update)

**File:** `src/hooks/useAuth.ts`

**Session Invalidation on App Close:**

- Listen for `beforeunload` event
- On window close, call `commands.invalidateSession()` to invalidate server-side session
- Clear localStorage auth data

**Stale Credential Cleanup on App Start:**

- On hook initialization, check for existing `auth_user_id` in localStorage
- If found, validate with backend via `commands.validateSession(userId)`
- If invalid or call fails, clear all auth data and treat as logged out

### App.tsx (Update)

**File:** `src/App.tsx`

- On app unmount (cleanup), trigger session invalidation

## 3. Data Flow

```
Navbar → ProfileSection (logged in) → Click Avatar → ProfileModal opens
                                                    ↓
                                              Account Tab (active)
                                              - Load user data from useAuth
                                              - Display editable fields
                                              - Save calls commands.updateUser()

ProfileModal → Save → commands.updateUser() → Success → Close modal
                                                  → Error → Show error state

App Close → beforeunload → commands.invalidateSession() → Clear localStorage
App Start → useAuth init → validateSession() → Invalid → Clear auth, show logged out
```

## 4. Commands to Add (Rust)

```rust
// src/commands/auth_commands.rs

#[tauri::command]
pub async fn invalidate_session() -> Result<(), String> {
    // Invalidate current session server-side
}

#[tauri::command]
pub async fn validate_session(user_id: String) -> Result<bool, String> {
    // Check if session/user_id is still valid
    // Returns true if valid, false if should be cleared
}

#[tauri::command]
pub async fn update_user(user_id: String, updates: UserUpdates) -> Result<User, String> {
    // Update user profile fields
}
```

## 5. State Management

- User data managed by existing `useAuth` hook
- ProfileModal reads from `user` object provided by `useAuth`
- No additional global state needed

## 6. Skeleton Implementation

Follow the pattern in `EntityDetailModal.tsx`:

**Security Tab Skeleton:**

```tsx
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-full" />
      </div>
    ))}
  </div>
  <Skeleton className="h-24 w-full rounded-lg" />
</div>
```

**Activity Logs Tab Skeleton:**

```tsx
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
```

## 7. Files to Modify/Create

| File                                     | Action                                           |
| ---------------------------------------- | ------------------------------------------------ |
| `src/components/auth/ProfileModal.tsx`   | Create                                           |
| `src/components/auth/ProfileSection.tsx` | Modify - add modal state and render              |
| `src/components/auth/index.ts`           | Modify - export ProfileModal                     |
| `src/hooks/useAuth.ts`                   | Modify - add session validation and cleanup      |
| `src/App.tsx`                            | Modify - add beforeunload handler                |
| `src/lib/bindings.ts`                    | Modify - add new commands                        |
| `src/commands/auth_commands.rs` (Rust)   | Modify - add invalidate/validate/update commands |

## 8. Success Criteria

- [ ] Profile modal opens when clicking avatar in Navbar (logged in state)
- [ ] Account tab displays user data with editable name, email, profile pic
- [ ] Role, Department, Location fields are read-only with lock icon
- [ ] Security and Activity Logs tabs show skeleton placeholders
- [ ] Tab navigation works via keyboard and click
- [ ] Save button shows processing → success micro-interaction
- [ ] Closing app invalidates session and clears localStorage
- [ ] Opening app with stale credentials clears auth state
- [ ] Design matches provided `profile-settings-details-tab.html` aesthetics
