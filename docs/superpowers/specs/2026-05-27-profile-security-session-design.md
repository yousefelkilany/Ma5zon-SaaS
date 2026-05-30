# Profile Security Tab & Session Cleanup Specification

**Date:** 2026-05-27
**Status:** Draft

---

## 1. Overview

Implement the Security tab in the ProfileModal with password change functionality, and fix session lifecycle management to properly invalidate sessions on app close and validate credentials on app start.

---

## 2. Security Tab Implementation

### 2.1 UI Structure

The Security tab replaces skeleton placeholders with a two-column layout matching the reference HTML:

**Left Panel (col-span-4):**

- Password Policy card with checklist of requirements (min 12 chars, uppercase, numeric, special char)
- Security status card showing last login timestamp and IP

**Right Panel (col-span-8):**

- Update Password form with three password fields:
  - Current Password
  - New Password
  - Confirm New Password
- Each field has a visibility toggle button
- Form actions: Update Password (primary), Cancel Changes (secondary)

### 2.2 Form Behavior

| Field            | Validation                                                      | Error Display                  |
| ---------------- | --------------------------------------------------------------- | ------------------------------ |
| Current Password | Required, non-empty                                             | Inline below field             |
| New Password     | Required, min 12 chars, 1 uppercase, 1 numeric, 1 special (@#$) | Inline below field, red border |
| Confirm Password | Must match New Password                                         | Inline below field             |

### 2.3 Password Visibility Toggle

- Each password field has an eye icon button on the right
- Click toggles between `password` and `text` input types
- Icon changes: `visibility` ↔ `visibility_off`

### 2.4 Submit Flow

1. User fills form and clicks "Update Password"
2. Client-side validation runs first
3. If validation fails, show errors inline and abort
4. If validation passes, call `commands.updatePassword(currentPassword, newPassword)`
5. On success: show success toast, clear form, switch to Account tab
6. On error: show error message inline

### 2.5 Cancel Behavior

- Clicking "Cancel Changes" clears all three fields and shows confirmation if form is dirty

---

## 3. Session Cleanup Implementation

### 3.1 On App Close (`beforeunload`)

**Current behavior:** `invalidate_session` is called but the Rust command is a no-op.

**Required behavior:**

1. On `beforeunload`, call `commands.invalidateSession()`
2. Rust handler must invalidate the user's session server-side (clear session token from DB)
3. Fire-and-forget: don't block the unload event

**Implementation:**

- Rust: `invalidate_session` must remove the user's session record from the database
- The session token should be stored/retrieved to identify which session to invalidate

### 3.2 On App Start (`validateSession`)

**Current behavior:** `validateSession` always returns `true`.

**Required behavior:**

1. On app start, if `auth_user_id` exists in localStorage:
   - Call `commands.validateSession(storedUserId)` to verify session is still valid
2. Rust handler must check if the user's session token in DB matches the stored token
3. If validation fails or session is expired:
   - Clear `auth_user_id` from localStorage
   - Clear `user_{userId}` from localStorage
   - Set user state to logged out (null)
4. If validation passes: load user data normally

### 3.3 Session Data Model

Sessions stored in SQLite should include:

- `user_id` (string)
- `session_token` (string, randomly generated on login)
- `created_at` (timestamp)
- `expires_at` (timestamp, optional for non-expiring)

### 3.4 Auth Flow Sequence

```
App Start:
  localStorage.getItem('auth_user_id') → userId
  commands.validateSession(userId) → { valid: bool, token?: string }
  if invalid → clear auth state, show logged out

Login:
  commands.authenticate(username, password) → { userId, sessionToken }
  localStorage.setItem('auth_user_id', userId)
  localStorage.setItem('session_token', sessionToken)

App Close:
  window.addEventListener('beforeunload')
  commands.invalidateSession(currentUserId)
  Rust: DELETE session WHERE user_id = ?
```

---

## 4. Design Tokens

All components use existing design tokens:

- `bg-surface-container`, `bg-surface-container-low`, `bg-surface-container-high`
- `border-outline-variant`, `text-on-surface`, `text-on-surface-variant`
- `font-label-caps`, `font-body-md`, `font-headline-sm`
- `px-cozy-padding`, `py-compact-padding`, `space-y-gutter`

No new tokens required.

---

## 5. File Changes

| File                                   | Change                                                       |
| -------------------------------------- | ------------------------------------------------------------ |
| `src/components/auth/ProfileModal.tsx` | Implement Security tab UI                                    |
| `src-tauri/src/commands/user.rs`       | Implement actual `invalidate_session` and `validate_session` |
| `src/hooks/useAuth.ts`                 | Ensure session validation on mount                           |

---

## 6. Testing Checklist

- [ ] Security tab renders with password policy checklist and last login info
- [ ] Password visibility toggle works on all three fields
- [ ] Client-side validation shows inline errors for invalid input
- [ ] Password update success clears form and shows confirmation
- [ ] App close triggers session invalidation (verify DB record removed)
- [ ] App start with valid session shows logged-in state
- [ ] App start with invalid/expired session shows logged-out state
