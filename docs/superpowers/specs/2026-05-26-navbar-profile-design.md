# Dynamic Profile Section in Navbar

**Date**: 2026-05-26
**Status**: Draft

## Context

The navbar currently has a hardcoded profile section (user "Alex Sterling") displayed regardless of authentication state. The goal is to:

1. Display a login button when no user is logged in
2. Display user avatar, name, and role when logged in
3. User data fetched from SQLite via Rust backend
4. Auth session stored in localStorage
5. User data cached in TanStack Query

---

## 1. Rust Backend

### New Module: `commands/user.rs`

```rust
#[tauri::command]
#[specta::specta]
pub async fn load_user(user_id: &str) -> Result<Option<User>, String>;

#[tauri::command]
#[specta::specta]
pub async fn save_user(app: AppHandle, user: User) -> Result<(), String>;

#[tauri::command]
#[specta::specta]
pub async fn delete_user(app: AppHandle, user_id: &str) -> Result<(), String>;
```

### New Type: `types.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct User {
    pub id: String,
    pub name: String,
    pub role: String,
    pub avatar_url: Option<String>,
}
```

### SQLite Integration

- **Database path**: `{app_data_dir}/ma5zon.db`
- **Table**: `users`
  ```sql
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_url TEXT
  )
  ```
- Use `rusqlite` crate for SQLite access
- Table created on first app launch via `lib.rs` init

---

## 2. Frontend Auth State

### localStorage Keys

| Key            | Type             | Description               |
| -------------- | ---------------- | ------------------------- |
| `auth_user_id` | `string \| null` | Current logged-in user ID |

### TanStack Query

- **Query key**: `['user', userId]`
- **Query function**: Calls `commands.load_user(userId)`
- **staleTime**: `Infinity` (数据永久新鲜，直到显式失效)
- **gcTime**: `Infinity` (不过期)
- **enabled**: Only when `userId !== null`

---

## 3. Login Modal

### Trigger

- Clicking the **profile section** in navbar (not the logo) opens the modal

### Behavior

**Logged out state:**

- Shows login form (username + password)
- On submit: mock validation (any credentials work for MVP)
- On success: save `user_id` to localStorage, close modal
- On error: shake animation + error message

**Logged in state:**

- Shows profile info with logout button
- Logout clears localStorage and refetches user data (returns null)

### Form Fields

- Username (text input)
- Password (password input with toggle visibility)
- Remember me (checkbox)
- Forgot password link (no-op for MVP)

---

## 4. Profile Section Component

### Props Interface

```typescript
interface ProfileSectionProps {
  className?: string
}
```

### States

**Logged out:**

```tsx
<button className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-surface-container-high">
  <LoginIcon />
  <span className="text-body-sm">Login</span>
</button>
```

**Logged in:**

```tsx
<button className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 px-3 rounded-full">
  <img
    src={user.avatarUrl}
    className="w-9 h-9 rounded-full border border-secondary"
  />
  <div className="hidden lg:block">
    <p className="font-body-sm text-body-lg font-bold text-primary">
      {user.name}
    </p>
    <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">
      {user.role}
    </p>
  </div>
</button>
```

---

## 5. Navbar Changes

The profile section in `Navbar.tsx` is replaced by `ProfileSection` component.

**Before** (hardcoded):

```tsx
<div className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 px-3 rounded-full transition-colors">
  <img
    alt="User Profile"
    className="w-9 h-9 rounded-full border border-secondary"
    src="..."
  />
  <div className="hidden lg:block leading-tight">
    <p className="font-body-sm text-body-lg font-bold text-primary">
      {t('nav.userName')}
    </p>
    <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">
      {t('nav.userRole')}
    </p>
  </div>
</div>
```

**After**:

```tsx
<ProfileSection />
```

---

## 6. Translation Keys

Add to `locales/en.json`:

```json
"nav.login": "Login",
"nav.logout": "Logout",
"auth.signIn": "Sign In",
"auth.signInToMa5zon": "Sign In to Ma5zon",
"auth.enterpriseFinancial": "Enterprise Financial Management System",
"auth.username": "Username",
"auth.password": "Password",
"auth.rememberMe": "Remember me",
"auth.forgot": "Forgot?",
"auth.invalidCredentials": "Invalid credentials. Please try again.",
"auth.authenticating": "Authenticating..."
```

---

## 7. File Structure Summary

```
src/
  components/
    auth/
      LoginModal.tsx    (NEW)
      ProfileSection.tsx (NEW)
  hooks/
    useAuth.ts          (NEW)
  store/
    .gitkeep
  lib/
    bindings.ts        (regenerated)

src-tauri/src/
  commands/
    user.rs             (NEW)
    mod.rs
  types.rs              (updated)
```

---

## 8. Dependencies

**Rust (`Cargo.toml`)**:

```toml
rusqlite = { version = "0.32", features = ["bundled"] }
```

**No new frontend dependencies** — uses existing TanStack Query.
