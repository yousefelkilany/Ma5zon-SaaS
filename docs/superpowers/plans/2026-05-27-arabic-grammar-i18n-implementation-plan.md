# Arabic Grammar i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Arabic grammatical support (6 plural forms + dual) for i18n while maintaining English singular/plural compatibility. Replace ~45 hardcoded strings and convert existing translations to ICU plural format.

**Architecture:** Extend i18next with ICU MessageFormat for plural handling. Arabic uses explicit `=0`, `=1`, `=2`, `few`, `many`, `other` selectors. English uses `one`/`other`. All locale files updated in sync.

**Tech Stack:** react-i18next, ICU MessageFormat, TypeScript

---

## Task 1: Update Locale Files with New Translation Keys

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/ar.json`

### Steps

- [ ] **Step 1: Add LoginModal translation keys to en.json**

Add after `auth.login.dialogDescription` (line 151):

```json
  "auth.usernamePlaceholder": "e.g. j.smith",
  "auth.passwordPlaceholder": "••••••••",
```

- [ ] **Step 2: Add LoginModal translation keys to ar.json**

Add after `auth.login.dialogDescription`:

```json
  "auth.usernamePlaceholder": "مثال: ي.سميث",
  "auth.passwordPlaceholder": "••••••••",
```

- [ ] **Step 3: Add ProfileModal Account tab keys to en.json**

Add after `auth.login.dialogDescription`:

```json
  "profile.tabs.account": "Account",
  "profile.tabs.security": "Security",
  "profile.tabs.activity": "Activity Logs",
  "profile.account.header": "User Profile & Security",
  "profile.account.description": "Manage your enterprise account settings and security preferences.",
  "profile.account.defaultUserName": "User",
  "profile.account.loading": "Loading...",
  "profile.account.fullName": "Full Name",
  "profile.account.email": "Email Address",
  "profile.account.enterpriseRole": "Enterprise Role",
  "profile.account.roleAdminNote": "Roles can only be modified by the System Administrator.",
  "profile.account.department": "Department",
  "profile.account.location": "Location",
  "profile.account.cancel": "Cancel",
  "profile.account.processing": "Processing...",
  "profile.account.savedSuccessfully": "Saved Successfully",
  "profile.account.saveChanges": "Save Changes",
```

- [ ] **Step 4: Add ProfileModal Account tab keys to ar.json**

Add after `auth.login.dialogDescription`:

```json
  "profile.tabs.account": "الحساب",
  "profile.tabs.security": "الأمان",
  "profile.tabs.activity": "سجلات النشاط",
  "profile.account.header": "الملف الشخصي والأمان",
  "profile.account.description": "إدارة إعدادات حساب المؤسسة وتفضيلات الأمان.",
  "profile.account.defaultUserName": "مستخدم",
  "profile.account.loading": "جاري التحميل...",
  "profile.account.fullName": "الاسم الكامل",
  "profile.account.email": "البريد الإلكتروني",
  "profile.account.enterpriseRole": "دور المؤسسة",
  "profile.account.roleAdminNote": "لا يمكن تعديل الأدوار إلا من قبل مسؤول النظام.",
  "profile.account.department": "القسم",
  "profile.account.location": "الموقع",
  "profile.account.cancel": "إلغاء",
  "profile.account.processing": "جاري المعالجة...",
  "profile.account.savedSuccessfully": "تم الحفظ بنجاح",
  "profile.account.saveChanges": "حفظ التغييرات",
```

- [ ] **Step 5: Add ProfileModal Security tab keys to en.json**

Add after `profile.account.saveChanges`:

```json
  "profile.security.passwordPolicy": "Password Policy",
  "profile.security.minLength": "Minimum 8 characters",
  "profile.security.uppercase": "One uppercase letter",
  "profile.security.numeric": "One numeric digit",
  "profile.security.special": "One special character (!, @, #, $)",
  "profile.security.match": "Passwords match",
  "profile.security.updatePassword": "Update Password",
  "profile.security.currentPassword": "Current Password",
  "profile.security.newPassword": "New Password",
  "profile.security.confirmPassword": "Confirm New Password",
  "profile.security.updating": "Updating...",
  "profile.security.updateButton": "Update Password",
  "profile.security.cancelChanges": "Cancel Changes",
  "profile.security.validation.currentRequired": "Current password is required",
  "profile.security.validation.newRequired": "New password is required",
  "profile.security.validation.minLength": "Password must be at least 8 characters",
  "profile.security.validation.uppercase": "Password must contain at least one uppercase letter",
  "profile.security.validation.numeric": "Password must contain at least one numeric digit",
  "profile.security.validation.special": "Password must contain at least one special character (!, @, #, $)",
  "profile.security.validation.noMatch": "Passwords do not match",
  "profile.security.validation.updateFailed": "Failed to update password",
```

- [ ] **Step 6: Add ProfileModal Security tab keys to ar.json**

Add after `profile.account.saveChanges`:

```json
  "profile.security.passwordPolicy": "سياسة كلمة المرور",
  "profile.security.minLength": "8 أحرف على الأقل",
  "profile.security.uppercase": "حرف كبير واحد",
  "profile.security.numeric": "رقم واحد",
  "profile.security.special": "رمز خاص واحد (!، @، #، $)",
  "profile.security.match": "تتطابق كلمات المرور",
  "profile.security.updatePassword": "تحديث كلمة المرور",
  "profile.security.currentPassword": "كلمة المرور الحالية",
  "profile.security.newPassword": "كلمة المرور الجديدة",
  "profile.security.confirmPassword": "تأكيد كلمة المرور الجديدة",
  "profile.security.updating": "جاري التحديث...",
  "profile.security.updateButton": "تحديث كلمة المرور",
  "profile.security.cancelChanges": "إلغاء التغييرات",
  "profile.security.validation.currentRequired": "كلمة المرور الحالية مطلوبة",
  "profile.security.validation.newRequired": "كلمة المرور الجديدة مطلوبة",
  "profile.security.validation.minLength": "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
  "profile.security.validation.uppercase": "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل",
  "profile.security.validation.numeric": "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
  "profile.security.validation.special": "يجب أن تحتوي كلمة المرور على رمز خاص واحد (!، @، #، $)",
  "profile.security.validation.noMatch": "كلمات المرور غير متطابقة",
  "profile.security.validation.updateFailed": "فشل في تحديث كلمة المرور",
```

- [ ] **Step 7: Add FilterDialog keys to en.json**

Add after `entity.workspace.selectRow`:

```json
  "entity.filter.min": "Min",
  "entity.filter.max": "Max",
  "entity.filter.statusPaid": "Paid",
  "entity.filter.statusOverdue": "Overdue",
  "entity.filter.statusDraft": "Draft",
  "entity.filter.clearAll": "Clear All",
  "entity.filter.cancel": "Cancel",
  "entity.filter.apply": "Apply Filters",
```

- [ ] **Step 8: Add FilterDialog keys to ar.json**

Add after `entity.workspace.selectRow`:

```json
  "entity.filter.min": "الحد الأدنى",
  "entity.filter.max": "الحد الأقصى",
  "entity.filter.statusPaid": "مدفوعة",
  "entity.filter.statusOverdue": "متأخرة",
  "entity.filter.statusDraft": "مسودة",
  "entity.filter.clearAll": "مسح الكل",
  "entity.filter.cancel": "إلغاء",
  "entity.filter.apply": "تطبيق الفلاتر",
```

- [ ] **Step 9: Add EntityDetailModal tab labels to en.json**

Add after `entity.filter.apply`:

```json
  "entity.detail.tabs.details": "Details",
  "entity.detail.tabs.insights": "Insights",
  "entity.detail.tabs.audits": "Audits",
```

- [ ] **Step 10: Add EntityDetailModal tab labels to ar.json**

Add after `entity.filter.apply`:

```json
  "entity.detail.tabs.details": "التفاصيل",
  "entity.detail.tabs.insights": "الرؤى",
  "entity.detail.tabs.audits": "التدقيق",
```

- [ ] **Step 11: Add SettingsPopover language keys to en.json**

Add after `entity.detail.tabs.audits`:

```json
  "settingsPopover.language.arabic": "العربية",
  "settingsPopover.language.english": "EN",
```

- [ ] **Step 12: Add SettingsPopover language keys to ar.json**

Add after `entity.detail.tabs.audits`:

```json
  "settingsPopover.language.arabic": "العربية",
  "settingsPopover.language.english": "EN",
```

- [ ] **Step 13: Commit locale updates**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat(i18n): add translation keys for ProfileModal, LoginModal, FilterDialog, EntityDetailModal, SettingsPopover"
```

---

## Task 2: Convert entity.workspace.selected to ICU Plural Format

**Files:**
- Modify: `locales/en.json`
- Modify: `locales/ar.json`
- Modify: `src/components/entity/Toolbar.tsx`

### Steps

- [ ] **Step 1: Update entity.workspace.selected in en.json**

Replace:
```json
"entity.workspace.selected": "{{count}} selected"
```

With:
```json
"entity.workspace.selected": "{count, plural, one {# selected} other {# selected}}"
```

- [ ] **Step 2: Update entity.workspace.selected in ar.json**

Replace:
```json
"entity.workspace.selected": "تم تحديد {{count}}"
```

With:
```json
"entity.workspace.selected": "{count, plural, =0 {لا توجد محددات} =1 {محدد واحد} =2 {محددان} few {# محددات} many {# محدد} other {# محدد}}"
```

- [ ] **Step 3: Commit ICU plural conversion**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat(i18n): convert entity.workspace.selected to ICU plural format for Arabic grammar support"
```

---

## Task 3: Update ProfileModal.tsx to Use Translations

**Files:**
- Modify: `src/components/auth/ProfileModal.tsx`

### Steps

- [ ] **Step 1: Add useTranslation import**

Find:
```tsx
import { useState } from 'react'
```

Replace:
```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
```

- [ ] **Step 2: Add t function to component**

Find inside component:
```tsx
const [activeTab, setActiveTab] = useState<TabId>('account')
```

Add after:
```tsx
const { t } = useTranslation()
```

- [ ] **Step 3: Update tabs array to use translations**

Find:
```tsx
const tabs: { id: TabId; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'activity', label: 'Activity Logs' },
]
```

Replace:
```tsx
const tabs: { id: TabId; label: string }[] = [
  { id: 'account', label: t('profile.tabs.account') },
  { id: 'security', label: t('profile.tabs.security') },
  { id: 'activity', label: t('profile.tabs.activity') },
]
```

- [ ] **Step 4: Replace hardcoded Account tab strings**

Replace each hardcoded string with `t('profile.account.*')`:
- `"User Profile & Security"` → `t('profile.account.header')`
- `"Manage your enterprise account settings..."` → `t('profile.account.description')`
- `"User"` → `t('profile.account.defaultUserName')`
- `"Loading..."` → `t('profile.account.loading')`
- `"Full Name"` → `t('profile.account.fullName')`
- `"Email Address"` → `t('profile.account.email')`
- `"Enterprise Role"` → `t('profile.account.enterpriseRole')`
- `"Roles can only be modified..."` → `t('profile.account.roleAdminNote')`
- `"Department"` → `t('profile.account.department')`
- `"Location"` → `t('profile.account.location')`
- `"Cancel"` → `t('profile.account.cancel')`
- `"Processing..."` → `t('profile.account.processing')`
- `"Saved Successfully"` → `t('profile.account.savedSuccessfully')`
- `"Save Changes"` → `t('profile.account.saveChanges')`

- [ ] **Step 5: Replace hardcoded Security tab strings**

Replace each hardcoded string with `t('profile.security.*')`:
- `"Password Policy"` → `t('profile.security.passwordPolicy')`
- `"Minimum 8 characters"` → `t('profile.security.minLength')`
- `"One uppercase letter"` → `t('profile.security.uppercase')`
- `"One numeric digit"` → `t('profile.security.numeric')`
- `"One special character (!, @, #, $)"` → `t('profile.security.special')`
- `"Passwords match"` → `t('profile.security.match')`
- `"Update Password"` → `t('profile.security.updatePassword')`
- `"Current Password"` → `t('profile.security.currentPassword')`
- `"New Password"` → `t('profile.security.newPassword')`
- `"Confirm New Password"` → `t('profile.security.confirmPassword')`
- `"Updating..."` → `t('profile.security.updating')`
- `"Cancel Changes"` → `t('profile.security.cancelChanges')`

- [ ] **Step 6: Replace validation error strings**

Replace with `t('profile.security.validation.*')`:
- `"Current password is required"` → `t('profile.security.validation.currentRequired')`
- `"New password is required"` → `t('profile.security.validation.newRequired')`
- `"Password must be at least 8 characters"` → `t('profile.security.validation.minLength')`
- `"Password must contain at least one uppercase letter"` → `t('profile.security.validation.uppercase')`
- `"Password must contain at least one numeric digit"` → `t('profile.security.validation.numeric')`
- `"Password must contain at least one special character (!, @, #, $)"` → `t('profile.security.validation.special')`
- `"Passwords do not match"` → `t('profile.security.validation.noMatch')`
- `"Failed to update password"` → `t('profile.security.validation.updateFailed')`

- [ ] **Step 7: Commit ProfileModal changes**

```bash
git add src/components/auth/ProfileModal.tsx
git commit -m "feat(i18n): migrate ProfileModal to use translation keys"
```

---

## Task 4: Update LoginModal.tsx to Use Translations

**Files:**
- Modify: `src/components/auth/LoginModal.tsx`

### Steps

- [ ] **Step 1: Add useTranslation import and t function**

Find the component function and add:
```tsx
const { t } = useTranslation()
```

- [ ] **Step 2: Replace placeholder strings**

Find:
```tsx
placeholder="e.g. j.smith"
```

Replace:
```tsx
placeholder={t('auth.usernamePlaceholder')}
```

Find:
```tsx
placeholder="••••••••"
```

Replace:
```tsx
placeholder={t('auth.passwordPlaceholder')}
```

- [ ] **Step 3: Commit LoginModal changes**

```bash
git add src/components/auth/LoginModal.tsx
git commit -m "feat(i18n): migrate LoginModal placeholder strings to translation keys"
```

---

## Task 5: Update FilterDialog.tsx to Use Translations

**Files:**
- Modify: `src/components/entity/FilterDialog.tsx`

### Steps

- [ ] **Step 1: Add useTranslation import and t function**

- [ ] **Step 2: Replace hardcoded strings**

- `"Min"` → `t('entity.filter.min')`
- `"Max"` → `t('entity.filter.max')`
- `"Clear All"` → `t('entity.filter.clearAll')`
- `"Cancel"` → `t('entity.filter.cancel')`
- `"Apply Filters"` → `t('entity.filter.apply')`

- [ ] **Step 3: Update status options**

Replace hardcoded status array:
```tsx
const statusOptions = ['Paid', 'Overdue', 'Draft']
```

With:
```tsx
const statusOptions = [
  { value: 'paid', label: t('entity.filter.statusPaid') },
  { value: 'overdue', label: t('entity.filter.statusOverdue') },
  { value: 'draft', label: t('entity.filter.statusDraft') },
]
```

- [ ] **Step 4: Commit FilterDialog changes**

```bash
git add src/components/entity/FilterDialog.tsx
git commit -m "feat(i18n): migrate FilterDialog to use translation keys"
```

---

## Task 6: Update EntityDetailModal.tsx to Use Translations

**Files:**
- Modify: `src/components/entity/EntityDetailModal.tsx`

### Steps

- [ ] **Step 1: Add useTranslation import and t function**

- [ ] **Step 2: Update tabs array**

Find:
```tsx
const tabs: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'insights', label: 'Insights' },
  { id: 'audits', label: 'Audits' },
]
```

Replace:
```tsx
const tabs: { id: TabId; label: string }[] = [
  { id: 'details', label: t('entity.detail.tabs.details') },
  { id: 'insights', label: t('entity.detail.tabs.insights') },
  { id: 'audits', label: t('entity.detail.tabs.audits') },
]
```

- [ ] **Step 3: Commit EntityDetailModal changes**

```bash
git add src/components/entity/EntityDetailModal.tsx
git commit -m "feat(i18n): migrate EntityDetailModal tab labels to translation keys"
```

---

## Task 7: Update SettingsPopover.tsx to Use Translations

**Files:**
- Modify: `src/components/layout/SettingsPopover.tsx`

### Steps

- [ ] **Step 1: Add useTranslation import and t function**

- [ ] **Step 2: Replace language button labels**

Find:
```tsx
<Button variant="ghost" size="sm" className="text-xs">عربي</Button>
```

Replace:
```tsx
<Button variant="ghost" size="sm" className="text-xs">{t('settingsPopover.language.arabic')}</Button>
```

Find:
```tsx
<Button variant="ghost" size="sm" className="text-xs">EN</Button>
```

Replace:
```tsx
<Button variant="ghost" size="sm" className="text-xs">{t('settingsPopover.language.english')}</Button>
```

- [ ] **Step 3: Commit SettingsPopover changes**

```bash
git add src/components/layout/SettingsPopover.tsx
git commit -m "feat(i18n): migrate SettingsPopover language labels to translation keys"
```

---

## Task 8: Verify Implementation

**Files:**
- Modify: `src/i18n/i18n.d.ts`

### Steps

- [ ] **Step 1: Run type check**

Run: `cd /mnt/C/Ma5zon-SaaS && npm run typecheck`
Expected: No TypeScript errors

- [ ] **Step 2: Run lint check**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Verify all components compile**

Run: `npm run build:src` or equivalent build command
Expected: Build completes successfully

- [ ] **Step 4: Commit final verification**

```bash
git add -A
git commit -m "feat(i18n): complete Arabic grammar support implementation"
```

---

## Summary

| Task | Files Modified | Keys Added |
|------|----------------|------------|
| 1 | locales/en.json, locales/ar.json | ~45 new translation keys |
| 2 | locales/en.json, locales/ar.json, Toolbar.tsx | 1 ICU plural conversion |
| 3 | ProfileModal.tsx | ~40 strings replaced with t() calls |
| 4 | LoginModal.tsx | 2 strings replaced with t() calls |
| 5 | FilterDialog.tsx | 6 strings replaced with t() calls |
| 6 | EntityDetailModal.tsx | 3 tab labels replaced with t() calls |
| 7 | SettingsPopover.tsx | 2 language labels replaced with t() calls |
| 8 | Verification | TypeScript and lint checks |

**Total commits:** 8

---

## Execution Options

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**