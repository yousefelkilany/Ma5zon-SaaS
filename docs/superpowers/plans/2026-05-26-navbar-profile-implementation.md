# Dynamic Profile Section in Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the navbar profile section dynamic — shows login button when logged out, user avatar/name/role when logged in. User data from SQLite via Rust, session in localStorage, user fetch via TanStack Query.

**Architecture:** Rust backend manages SQLite user table via new tauri-specta commands. Frontend uses localStorage for session (userId) and TanStack Query for user data with infinite staleTime. Login modal converted from HTML mockup to React component.

**Tech Stack:** Rust (rusqlite), Tauri v2, TanStack Query v5, React 19

---

## File Structure

```
src/
  components/
    auth/
      LoginModal.tsx       (NEW - converts login-modal.html to React)
      ProfileSection.tsx    (NEW - replaces hardcoded navbar profile)
  hooks/
    useAuth.ts             (NEW - localStorage + TanStack Query logic)
  lib/
    bindings.ts            (MODIFIED - regenerated after adding user commands)
  components/layout/
    Navbar.tsx             (MODIFIED - uses ProfileSection instead of hardcoded)

src-tauri/src/
  commands/
    user.rs                (NEW - load_user, save_user, delete_user)
    mod.rs                 (MODIFIED - registers user module)
  types.rs                 (MODIFIED - adds User struct)
  bindings.rs              (MODIFIED - exports user commands)
  Cargo.toml               (MODIFIED - adds rusqlite)

locales/
  en.json                  (MODIFIED - adds auth translation keys)
```

---

## Task 1: Add rusqlite to Rust dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add rusqlite dependency**

Add after line 40 in `[dependencies]`:

```toml
rusqlite = { version = "0.32", features = ["bundled"] }
```

---

## Task 2: Add User type to Rust types.rs

**Files:**
- Modify: `src-tauri/src/types.rs`

- [ ] **Step 1: Add User struct before RecoveryError**

Add after line 66 (after the closing brace of RecoveryError impl Display):

```rust
// ============================================================================
// User
// ============================================================================

/// User data stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct User {
    pub id: String,
    pub name: String,
    pub role: String,
    pub avatar_url: Option<String>,
}
```

---

## Task 3: Create Rust user commands module

**Files:**
- Create: `src-tauri/src/commands/user.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Create user.rs**

```rust
//! User management commands using SQLite.

use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::User;

/// Gets the path to the SQLite database.
fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("ma5zon.db"))
}

/// Initializes the SQLite database and creates tables if needed.
fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            avatar_url TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create users table: {e}"))?;

    Ok(conn)
}

/// Load a user by ID from the SQLite database.
#[tauri::command]
#[specta::specta]
pub async fn load_user(user_id: &str) -> Result<Option<User>, String> {
    let app = AppHandle::new();
    let conn = init_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT id, name, role, avatar_url FROM users WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user = stmt
        .query_row(params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                name: row.get(1)?,
                role: row.get(2)?,
                avatar_url: row.get(3)?,
            })
        })
        .ok();

    Ok(user)
}

/// Save a user to the SQLite database (upsert).
#[tauri::command]
#[specta::specta]
pub async fn save_user(app: AppHandle, user: User) -> Result<(), String> {
    let conn = init_db(&app)?;

    conn.execute(
        "INSERT INTO users (id, name, role, avatar_url) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET name = ?2, role = ?3, avatar_url = ?4",
        params![user.id, user.name, user.role, user.avatar_url],
    )
    .map_err(|e| format!("Failed to save user: {e}"))?;

    Ok(())
}

/// Delete a user from the SQLite database.
#[tauri::command]
#[specta::specta]
pub async fn delete_user(app: AppHandle, user_id: &str) -> Result<(), String> {
    let conn = init_db(&app)?;

    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete user: {e}"))?;

    Ok(())
}
```

Note: `AppHandle::new()` above is a placeholder — in Tauri 2, commands receive `AppHandle` as a parameter directly. Fix in next step.

- [ ] **Step 2: Fix command signatures to use AppHandle parameter**

Rewrite the three functions to accept `app: AppHandle` as first parameter, and remove the `let app = AppHandle::new()` lines:

```rust
pub async fn load_user(app: AppHandle, user_id: &str) -> Result<Option<User>, String> {
    let conn = init_db(&app)?;
    // ... rest unchanged
}

pub async fn save_user(app: AppHandle, user: User) -> Result<(), String> {
    let conn = init_db(&app)?;
    // ... rest unchanged
}

pub async fn delete_user(app: AppHandle, user_id: &str) -> Result<(), String> {
    let conn = init_db(&app)?;
    // ... rest unchanged
}
```

- [ ] **Step 3: Update mod.rs to register user commands**

Add to `src-tauri/src/commands/mod.rs`:

```rust
pub mod user;
```

And update the builder in `bindings.rs` to include user commands.

- [ ] **Step 4: Update bindings.rs**

Modify `src-tauri/src/bindings.rs` line 4:

```rust
use crate::commands::{notifications, preferences, quick_pane, recovery, user};
```

And add to collect_commands:

```rust
user::load_user,
user::save_user,
user::delete_user,
```

- [ ] **Step 5: Run cargo build to verify compilation**

Run: `cd src-tauri && cargo build 2>&1`
Expected: Compiles without errors

---

## Task 4: Regenerate TypeScript bindings

**Files:**
- Modify: `src/lib/bindings.ts` (regenerated)

- [ ] **Step 1: Regenerate bindings**

Run: `cargo test export_bindings -- --ignored 2>&1`
Expected: "✓ TypeScript bindings exported to ../src/lib/bindings.ts"

---

## Task 5: Create useAuth hook

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Write useAuth hook**

```typescript
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
      if (result.status === 'err') return null;
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
```

---

## Task 6: Create LoginModal component

**Files:**
- Create: `src/components/auth/LoginModal.tsx`

- **Based on**: `/mnt/C/Accountant-SaaS/stitch-screens/login-modal.html`

- [ ] **Step 1: Create LoginModal.tsx**

Components to include:
- Dialog (from `@/components/ui/dialog`)
- Form with username, password fields
- Password visibility toggle
- Remember me checkbox (stores in localStorage)
- Error message area with shake animation
- Loading state on submit

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (userId: string) => void;
}

export function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate auth delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation — any credentials work for MVP
    const isValid = username.length > 0 && password.length > 0;
    setIsLoading(false);

    if (isValid) {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      // Return mock userId using username as base
      const mockUserId = `user_${username.toLowerCase().replace(/\./g, '_')}`;
      onLoginSuccess(mockUserId);
      onOpenChange(false);
    } else {
      setError(t('auth.invalidCredentials'));
      // Trigger shake animation
      const modal = document.querySelector('[data-login-modal]');
      modal?.classList.add('animate-shake');
      setTimeout(() => modal?.classList.remove('animate-shake'), 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-login-modal className="...">
        <DialogHeader>
          {/* Logo */}
          {/* Title: t('auth.signInToMa5zon') */}
          {/* Description: t('auth.enterpriseFinancial') */}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-gutter">
          {/* Username field */}
          {/* Password field with visibility toggle */}
          {/* Error message (hidden by default) */}
          {/* Remember me + Forgot link */}
          {/* Submit button with loading state */}
        </form>
        {/* Security footer */}
      </DialogContent>
    </Dialog>
  );
}
```

Apply existing design tokens from the HTML mockup (colors, spacing, typography).

---

## Task 7: Create ProfileSection component

**Files:**
- Create: `src/components/auth/ProfileSection.tsx`

- [ ] **Step 1: Write ProfileSection component**

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from './LoginModal';

export function ProfileSection() {
  const { t } = useTranslation();
  const { isLoggedIn, user, login, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const handleLoginSuccess = (userId: string) => {
    login(userId);
    // Also save user to backend for persistence demo
    commands.saveUser({
      id: userId,
      name: 'Demo User',
      role: 'Guest',
      avatarUrl: null,
    });
  };

  if (!isLoggedIn) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">login</span>
          <span className="text-body-sm text-on-surface">{t('nav.login')}</span>
        </button>
        <LoginModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-compact-gap">
      <button
        onClick={logout}
        className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 px-3 rounded-full transition-colors"
      >
        <img
          alt={user?.name}
          className="w-9 h-9 rounded-full border border-secondary"
          src={user?.avatarUrl ?? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUBAQM9pd0d2Y8CyJX6QTiPWqXNZTzy2Dvsz_OYI_RhgqqQBO7jfH7iXr3tiD5m58oLfeYLboKxEeJ6qRvPmL8wgFw2mJV51DGt9FMuZQ0dntsReqcm4VhWQPJwNU8efHXGmD-wxzLibbyzc2khT29AKRbbhOivAOxGwe6H69jXIJIHK5699KvwRPkaSdrstAeU3WY2_A9cWK1lGotJwgcZtxQwXxWXeUt-9iDBQH5Udos-CZmoHXZIZLI-cP9eXuaw6LFlHbu96k'}
        />
        <div className="hidden lg:block leading-tight">
          <p className="font-body-sm text-body-lg font-bold text-primary">
            {user?.name ?? t('nav.userName')}
          </p>
          <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">
            {user?.role ?? t('nav.userRole')}
          </p>
        </div>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Import and export from index**

Add to `src/components/auth/index.ts` (create if not exists):

```typescript
export { LoginModal } from './LoginModal';
export { ProfileSection } from './ProfileSection';
```

---

## Task 8: Update Navbar to use ProfileSection

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Replace hardcoded profile section**

Remove the hardcoded profile div (lines 49-63) and replace with:

```tsx
import { ProfileSection } from '@/components/auth';

// Inside the right section div (after the settings button):
<ProfileSection />
```

---

## Task 9: Add translation keys

**Files:**
- Modify: `locales/en.json`

- [ ] **Step 1: Add auth translation keys**

Add to `locales/en.json` after `"nav.userRole"`:

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

## Task 10: Add shake animation CSS

**Files:**
- Modify: `src/App.css` (or relevant CSS file)

- [ ] **Step 1: Add shake keyframes and class**

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
```

---

## Task 11: Quality check

- [ ] **Step 1: Run TypeScript type check**

Run: `cd frontend && pnpm run typecheck 2>&1` (or `npm run typecheck`)
Expected: No type errors

- [ ] **Step 2: Run linter**

Run: `cd frontend && pnpm run lint 2>&1`
Expected: No lint errors

- [ ] **Step 3: Run app and test manually**

Start the app with `pnpm dev` (or `npm run dev`)
Expected:
1. Navbar shows "Login" button on the right
2. Clicking "Login" opens the modal
3. Filling in credentials and submitting closes modal and shows profile picture/name/role
4. Clicking the profile section on next load shows the user in logged-in state

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task for fast iteration

**2. Inline Execution** - Execute tasks in this session with checkpoints for review

Which approach?
