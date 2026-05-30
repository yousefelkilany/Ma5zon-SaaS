# Profile Security Tab & Session Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Security tab UI for password changes and fix session lifecycle management (validate on start, invalidate on close).

**Architecture:** Two independent subsystems - React UI for Security tab, Rust backend for session management. Sessions stored in SQLite with user_id, session_token, created_at, expires_at.

**Tech Stack:** React/TypeScript (ProfileModal.tsx), Rust (user.rs), SQLite (rusqlite).

---

## Task 1: Add Sessions Table to Database

**Files:**

- Modify: `src-tauri/src/commands/user.rs:33-51`

- [ ] **Step 1: Add sessions table creation to init_db**

In `init_db()`, after users table creation, add:

```rust
conn.execute(
    "CREATE TABLE IF NOT EXISTS sessions (
        user_id TEXT PRIMARY KEY,
        session_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT
    )",
    [],
)
.map_err(|e| format!("Failed to create sessions table: {e}"))?;
```

Run: `cd /mnt/C/Ma5zon-SaaS && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | head -50`
Expected: No errors (sessions table creation added)

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/commands/user.rs
git commit -m "feat: add sessions table to database schema"
```

---

## Task 2: Modify Authenticate to Create Session Token

**Files:**

- Modify: `src-tauri/src/commands/user.rs:94-138`

- [ ] **Step 1: Modify authenticate to return (User, sessionToken) tuple**

Replace the `authenticate` function. On successful password verification:

1. Generate a random session token (UUID)
2. Insert into sessions table with user_id and timestamp
3. Return (User, session_token) instead of just User

```rust
#[tauri::command]
#[specta::specta]
pub async fn authenticate(
    app: AppHandle,
    username: &str,
    password: &str,
) -> Result<Option<(User, String)>, String> {
    let conn = init_db(&app)?;
    seed_default_admin(&conn)?;

    let mut stmt = conn
        .prepare("SELECT id, name, role, avatar_url, password_hash FROM users WHERE name = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let user_result = stmt.query_row(params![username], |row| {
        Ok(UserWithHash {
            id: row.get(0)?,
            name: row.get(1)?,
            role: row.get(2)?,
            avatar_url: row.get(3)?,
            password_hash: row.get(4)?,
        })
    });

    match user_result {
        Ok(user) => {
            if let Some(ref hash) = user.password_hash {
                if verify_password(password, hash)? {
                    let session_token = uuid::Uuid::new_v4().to_string();
                    let created_at = chrono::Utc::now().to_rfc3339();

                    conn.execute(
                        "INSERT OR REPLACE INTO sessions (user_id, session_token, created_at) VALUES (?1, ?2, ?3)",
                        params![user.id, session_token, created_at],
                    ).map_err(|e| format!("Failed to create session: {e}"))?;

                    Ok(Some((User {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        avatar_url: user.avatar_url,
                    }, session_token)))
                } else {
                    Ok(None)
                }
            } else {
                Ok(None)
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {e}")),
    }
}
```

Run: `cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | head -50`
Expected: Compile errors if chrono/uuid not in Cargo.toml

- [ ] **Step 2: Add chrono and uuid to Cargo.toml dependencies**

Check current versions in Cargo.toml, add if missing:

```toml
chrono = "0.4"
uuid = { version = "1", features = ["v4"] }
```

Run: `cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | head -50`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/commands/user.rs
git commit -m "feat: authenticate creates session token and returns (User, token)"
```

---

## Task 3: Implement validate_session and invalidate_session

**Files:**

- Modify: `src-tauri/src/commands/user.rs:189-199`

- [ ] **Step 1: Implement validate_session to check session token**

```rust
#[tauri::command]
#[specta::specta]
pub async fn validate_session(app: AppHandle, user_id: String) -> Result<bool, String> {
    let conn = init_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT session_token, expires_at FROM sessions WHERE user_id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let session_result: Result<(String, Option<String>), _> = stmt.query_row(params![user_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    });

    match session_result {
        Ok((_token, expires_at)) => {
            if let Some(expires) = expires_at {
                let expiry = chrono::DateTime::parse_from_rfc3339(&expires)
                    .map_err(|e| format!("Invalid expiry date: {e}"))?;
                if chrono::Utc::now() > expiry {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
        Err(e) => Err(format!("Database error: {e}")),
    }
}
```

- [ ] **Step 2: Implement invalidate_session to delete session**

```rust
#[tauri::command]
#[specta::specta]
pub async fn invalidate_session(app: AppHandle, user_id: String) -> Result<(), String> {
    let conn = init_db(&app)?;
    conn.execute("DELETE FROM sessions WHERE user_id = ?1", params![user_id])
        .map_err(|e| format!("Failed to delete session: {e}"))?;
    Ok(())
}
```

Run: `cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | head -50`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/user.rs
git commit -m "feat: implement validate_session and invalidate_session"
```

---

## Task 4: Add updatePassword Rust Command

**Files:**

- Modify: `src-tauri/src/commands/user.rs`
- Add to bindings: `src-tauri/src/bindings.rs`

- [ ] **Step 1: Add update_password command**

```rust
#[tauri::command]
#[specta::specta]
pub async fn update_password(
    app: AppHandle,
    user_id: String,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    let conn = init_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT password_hash FROM users WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let password_hash: Option<String> = stmt
        .query_row(params![user_id], |row| row.get(0))
        .ok();

    match password_hash {
        Some(hash) => {
            if !verify_password(&current_password, &hash)? {
                return Err("Current password is incorrect".to_string());
            }
        }
        None => return Err("User not found".to_string()),
    }

    let new_hash = hash_password(&new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        params![new_hash, user_id],
    )
    .map_err(|e| format!("Failed to update password: {e}"))?;

    Ok(())
}
```

Run: `cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | head -50`
Expected: PASS

- [ ] **Step 2: Register in bindings.rs**

Check bindings.rs line 25 area and add `user::update_password` to the module.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/user.rs src-tauri/src/bindings.rs
git commit -m "feat: add update_password Rust command"
```

---

## Task 5: Update TypeScript Bindings for New Command Signatures

**Files:**

- Modify: `src/lib/bindings.ts`

- [ ] **Step 1: Update authenticate to return (User, sessionToken)**

Find `authenticate` in bindings.ts and update return type:

```typescript
async authenticate(username: string, password: string): Promise<Result<{ user: User; sessionToken: string } | null, string>>
```

- [ ] **Step 2: Add updatePassword command binding**

```typescript
async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<Result<null, string>> {
    try {
    return { status: "ok", data: await TAURI_INVOKE("update_password", { userId, currentPassword, newPassword }) };
} catch (e) {
    if(e instanceof Error) throw e;
    else return { status: "error", error: e as any };
}
}
```

Run: `cd /mnt/C/Ma5zon-SaaS && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors if specta types not regenerated

- [ ] **Step 3: Regenerate specta types**

```bash
cd /mnt/C/Ma5zon-SaaS && pnpm tauri-dev 2>&1 | head -20 || npm run tauri-dev 2>&1 | head -20
```

Or check package.json for specta generation command.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bindings.ts
git commit -m "feat: update bindings for new authenticate signature and updatePassword"
```

---

## Task 6: Implement Security Tab UI in ProfileModal

**Files:**

- Modify: `src/components/auth/ProfileModal.tsx:352-371`

- [ ] **Step 1: Replace skeleton security tab with actual UI**

Replace lines 352-371 (the security tab skeleton) with:

```tsx
{
  activeTab === 'security' && (
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
              <span className="material-symbols-outlined text-secondary text-[18px]">
                check_circle
              </span>
              Minimum 12 characters
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                check_circle
              </span>
              One uppercase letter
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                check_circle
              </span>
              One numeric digit
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                check_circle
              </span>
              One special character (@, #, $)
            </li>
          </ul>
        </div>
        <div className="p-cozy-padding bg-surface-container-low rounded-lg border border-outline-variant text-center">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            Last Login: Just now
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            IP: 192.168.1.1
          </p>
        </div>
      </aside>

      {/* Right Panel - Password Update Form */}
      <section className="md:col-span-8 p-cozy-padding bg-surface-container-low rounded-lg border border-outline-variant">
        <div className="mb-gutter">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
            Update Password
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Changing your password will log you out of all other active
            sessions.
          </p>
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
                bind:value={passwordForm.current}
                disabled={isUpdatingPassword}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <span className="material-symbols-outlined">
                  {showCurrentPassword ? 'visibility_off' : 'visibility'}
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
                bind:value={passwordForm.new}
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
              <p className="font-body-sm text-error">{passwordErrors.new}</p>
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
                bind:value={passwordForm.confirm}
                disabled={isUpdatingPassword}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
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
  )
}
```

- [ ] **Step 2: Add state for password form**

Add these state declarations after the existing state (after line 52):

```tsx
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
```

- [ ] **Step 3: Add password validation and update handlers**

Add these functions before the return statement (before line 94):

```tsx
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
  } else if (passwordForm.new.length < 12) {
    errors.new = 'Password must be at least 12 characters'
    valid = false
  } else if (!/[A-Z]/.test(passwordForm.new)) {
    errors.new = 'Password must contain at least one uppercase letter'
    valid = false
  } else if (!/[0-9]/.test(passwordForm.new)) {
    errors.new = 'Password must contain at least one numeric digit'
    valid = false
  } else if (!/[@#$]/.test(passwordForm.new)) {
    errors.new =
      'Password must contain at least one special character (@, #, $)'
    valid = false
  }

  if (passwordForm.new !== passwordForm.confirm) {
    errors.confirm = 'Passwords do not match'
    valid = false
  }

  setPasswordErrors(errors)
  return valid
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

  // Success - clear form and show feedback
  setPasswordForm({ current: '', new: '', confirm: '' })
  setActiveTab('account')
  // Could add toast notification here
}

const handleCancelPassword = () => {
  setPasswordForm({ current: '', new: '', confirm: '' })
  setPasswordErrors({ current: '', new: '', confirm: '' })
  setPasswordUpdateError('')
}
```

Run: `cd /mnt/C/Ma5zon-SaaS && npx tsc --noEmit 2>&1 | head -30`
Expected: TypeScript errors to fix (missing imports, etc.)

- [ ] **Step 4: Reset password form when tab changes or modal closes**

Add to the useEffect that resets state when modal closes (after line 53):

```tsx
// Also reset password form when modal closes
if (!open) {
  setPasswordForm({ current: '', new: '', confirm: '' })
  setPasswordErrors({ current: '', new: '', confirm: '' })
  setPasswordUpdateError('')
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ProfileModal.tsx
git commit -m "feat: implement security tab UI with password change form"
```

---

## Task 7: Update useAuth Login to Handle Session Token

**Files:**

- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: Update login to store session token**

Find the `login` function in useAuth.ts (around line 112). Update it to also store the session token:

```tsx
const login = (newUserId: string, userData?: User, sessionToken?: string) => {
  console.log('[useAuth] login called with:', newUserId, userData)
  setAuthUserId(newUserId)
  setUserId(newUserId)

  if (sessionToken) {
    localStorage.setItem('session_token', sessionToken)
  }

  if (userData) {
    localStorage.setItem(`user_${newUserId}`, JSON.stringify(userData))
    queryClient.setQueryData(['user', newUserId], userData)
  }
  queryClient.invalidateQueries({ queryKey: ['user', newUserId] })
}
```

- [ ] **Step 2: Verify session token on mount**

The existing validateSession call in useEffect (line 55-73) already handles validation. The Rust validate_session will now actually check the database.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: useAuth stores session token on login"
```

---

## Task 8: Update LoginModal to Pass Session Token

**Files:**

- Modify: `src/components/auth/LoginModal.tsx`

- [ ] **Step 1: Update handleSubmit to pass session token to login**

Find where `onLoginSuccess` is called in LoginModal. The authenticate now returns (User, sessionToken), so update the handling:

```tsx
const result = await commands.authenticate(username, password)
if (result.status === 'ok' && result.data) {
  const { user, sessionToken } = result.data
  onLoginSuccess(
    user.id,
    {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
    },
    sessionToken
  )
}
```

Run: `cd /mnt/C/Ma5zon-SaaS && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors if bindings not regenerated yet

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/LoginModal.tsx
git commit -m "feat: LoginModal passes session token to login"
```

---

## Task 9: Integration Testing

**Files:**

- Test: Manual verification steps

- [ ] **Step 1: Verify app builds**

```bash
cd /mnt/C/Ma5zon-SaaS && npm run build 2>&1 | tail -30
```

- [ ] **Step 2: Verify Tauri dev starts**

Open another terminal, run `npm run tauri-dev` and check for any Rust compilation errors.

- [ ] **Step 3: Manual test checklist**

1. Login as admin
2. Click profile in navbar → modal opens with Account tab
3. Click Security tab → password form displays
4. Try to submit empty form → validation errors appear
5. Enter invalid new password (short, no special char) → validation errors
6. Enter mismatched confirm password → validation error
7. Enter valid password → success, switch to Account tab
8. Close app, reopen → should still be logged in (session valid)
9. Invalidate session via Rust console or DB browser → reopen → logged out

---

## File Summary

| File                                   | Change                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src-tauri/src/commands/user.rs`       | Add sessions table, modify authenticate, implement validate/invalidate, add update_password |
| `src-tauri/Cargo.toml`                 | Add chrono, uuid dependencies                                                               |
| `src-tauri/src/bindings.rs`            | Register update_password                                                                    |
| `src/lib/bindings.ts`                  | Update authenticate signature, add updatePassword                                           |
| `src/components/auth/ProfileModal.tsx` | Implement Security tab UI                                                                   |
| `src/hooks/useAuth.ts`                 | Store session token on login                                                                |
| `src/components/auth/LoginModal.tsx`   | Pass session token to login                                                                 |
