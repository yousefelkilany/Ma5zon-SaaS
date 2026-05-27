# Arabic Grammar i18n Design Spec

**Date:** 2026-05-27
**Status:** Draft
**Type:** Infrastructure Extension
**Extends:** `2026-05-25-translation-i18n-design.md`

---

## 1. Overview

Extend the existing i18n infrastructure to support full Arabic grammatical forms (6 plural categories + dual) while maintaining compatibility with English's singular/plural system. This includes definite/indefinite article handling.

**Requirements:**
- Support Arabic's 6 plural forms: zero, one, two, few, many, other
- Support English's 2 forms: singular, plural
- Handle dual form (2) in Arabic
- Support definite/indefinite articles where contextually appropriate

---

## 2. Arabic Grammatical Forms

### Arabic Plural Rules ( jam' س/ jam')

| Form | Count | Arabic Term | Example |
|------|-------|-------------|---------|
| **zero** | 0 | صفر | لا توجد فواتير |
| **one** | 1 | مفرد | فاتورة واحدة |
| **two** | 2 | مثنى | فاتورتان |
| **few** | 3-10 | قلة | 3-10 فاتورات |
| **many** | 11-99 | كثرة | 11-99 فاتورة |
| **other** | 100+ | غير محدود | 100+ فاتورة |

### Implementation Strategy

Use ICU MessageFormat `plural` syntax with explicit `=N` overrides:

```json
{
  "invoice.count": "{count, plural, =0 {لا توجد فاتورات} =1 {فاتورة واحدة} =2 {فاتورتان} few {# فاتورات} many {# فاتورة} other {# فاتورة}}"
}
```

For English:

```json
{
  "invoice.count": "{count, plural, one {# invoice} other {# invoices}}"
}
```

---

## 3. Definite/Indefinite Handling

### When to Use

- **Indefinite:** General reference, first mention, "a/an" concept
  - Example: "Create a new invoice" → "إنشاء فاتورة جديدة"
- **Definite:** Specific item, previously mentioned, "the" concept
  - Example: "The selected invoice" → "الفاتورة المحددة"

### Implementation

Use ICU `select` argument for article type:

```json
{
  "invoice.action": "{action, select, create {إنشاء فاتورة} edit {تعديل الفاتورة} view {عرض الفاتورة} other {إجراء}}"
}
```

Combined with plural:

```json
{
  "invoice.selected.count": "{count, plural, =0 {لا توجد} =1 {الفاتورة المحددة} =2 {الفاتورتان المحددتان} few {ال # فاتورات المحددة} many {ال # فاتورة المحددة} other {ال # فاتورة المحددة}}"
}
```

---

## 4. Translation Key Naming Convention

### Plural Keys

For keys that require pluralization, append `_plural` suffix to base key:

```
entity.workspace.selected          ← singular (count = 1)
entity.workspace.selected_plural    ← plural forms (count ≠ 1)
```

### Alternative: Inline Plural

Use the count parameter directly in the key name when plural applies to multiple counts:

```
invoice.selected     ← handles all counts via ICU plural
```

**Decision:** Use inline ICU plural (second approach) as it reduces key proliferation and keeps related forms together.

---

## 5. Technical Implementation

### 5.1 i18next Configuration

Current setup uses basic i18next with React integration. ICU MessageFormat is supported via `i18next` default behavior when using `{count, plural, ...}` syntax.

### 5.2 Custom Formatter (Optional Enhancement)

For more complex Arabic morphology (case endings, solar/lunar letters), create a custom formatter:

```typescript
// src/i18n/formatters.ts
export const arabicFormatter = {
  name: 'arabic',
  type: 'plural',
  pluralRules: (lng: string, count: number): string => {
    if (lng === 'ar') {
      if (count === 0) return 'zero'
      if (count === 1) return 'one'
      if (count === 2) return 'two'
      if (count >= 3 && count <= 10) return 'few'
      if (count >= 11 && count <= 99) return 'many'
      return 'other'
    }
    // English fallback
    return count === 1 ? 'one' : 'other'
  }
}
```

### 5.3 Type-Safe Translation Function

Extend the `t` function type to support plural options:

```typescript
// src/i18n/i18n.d.ts
interface PluralOptions {
  count: number
  definite?: boolean
  gender?: 'male' | 'female'
}

interface TranslationOptions {
  plural?: PluralOptions
}
```

---

## 6. Locale File Structure

### English (en.json)

```json
{
  "invoice.selected": "{count, plural, one {# invoice selected} other {# invoices selected}}",
  "invoice.status.paid": "Paid",
  "invoice.status.overdue": "Overdue"
}
```

### Arabic (ar.json)

```json
{
  "invoice.selected": "{count, plural, =0 {لا توجد فاتورات محددة} =1 {فاتورة واحدة محددة} =2 {فاتورتان محددتان} few {# فاتورات محددة} many {# فاتورة محددة} other {# فاتورة محددة}}",
  "invoice.status.paid": "مدفوعة",
  "invoice.status.overdue": "متأخرة"
}
```

---

## 7. Comprehensive Component Analysis

All screens and components listed below must be audited for:
1. **Hardcoded strings** - Currently missing from translation files
2. **Static translations** - Present but need ICU plural format for grammatical correctness
3. **Definite/indefinite handling** - Strings where article context matters

### 7.1 Navbar

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `nav.appName` | Static string | No change |
| `nav.appTagline` | Static string | No change |
| `nav.globalSearchPlaceholder` | Static string | No change |
| `nav.userName` | Static string | No change |
| `nav.userRole` | Static string | No change |
| `nav.newTab` | Static string | No change |
| `nav.login` | Static string | No change |
| `nav.logout` | Static string | No change |

**Analysis:** Navbar uses static strings with no plural context. Current translations are sufficient.

---

### 7.2 Login Modal (LoginModal.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `auth.signIn` | Static | No change |
| `auth.signInToMa5zon` | Static | No change |
| `auth.enterpriseFinancial` | Static | No change |
| `auth.username` | Static | No change |
| `auth.usernamePlaceholder` | **Hardcoded** | Add to en.json/ar.json |
| `auth.password` | Static | No change |
| `auth.passwordPlaceholder` | **Hardcoded** | Add to en.json/ar.json |
| `auth.forgot` | Static | No change |
| `auth.invalidCredentials` | Static | No change |
| `auth.authenticating` | Static | No change |
| `auth.login.dialogTitle` | Static | No change |
| `auth.login.dialogDescription` | Static | No change |

**Status:** 2 hardcoded strings need translation keys.

---

### 7.3 Profile Modal (ProfileModal.tsx)

#### Account Tab

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `profile.tabs.account` | **Hardcoded** | Add ICU plural |
| `profile.tabs.security` | **Hardcoded** | Add ICU plural |
| `profile.tabs.activity` | **Hardcoded** | Add ICU plural |
| `profile.account.header` | **Hardcoded** | Add to locale |
| `profile.account.description` | **Hardcoded** | Add to locale |
| `profile.account.defaultUserName` | **Hardcoded** | Add to locale |
| `profile.account.loading` | **Hardcoded** | Add to locale |
| `profile.account.fullName` | **Hardcoded** | Add to locale |
| `profile.account.email` | **Hardcoded** | Add to locale |
| `profile.account.enterpriseRole` | **Hardcoded** | Add to locale |
| `profile.account.roleAdminNote` | **Hardcoded** | Add to locale |
| `profile.account.department` | **Hardcoded** | Add to locale |
| `profile.account.location` | **Hardcoded** | Add to locale |
| `profile.account.cancel` | **Hardcoded** | Add to locale |
| `profile.account.processing` | **Hardcoded** | Add to locale |
| `profile.account.savedSuccessfully` | **Hardcoded** | Add to locale |
| `profile.account.saveChanges` | **Hardcoded** | Add to locale |

**Status:** ~18 hardcoded strings in Account tab.

#### Security Tab

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `profile.security.passwordPolicy` | **Hardcoded** | Add to locale |
| `profile.security.minLength` | **Hardcoded** | Add to locale |
| `profile.security.uppercase` | **Hardcoded** | Add to locale |
| `profile.security.numeric` | **Hardcoded** | Add to locale |
| `profile.security.special` | **Hardcoded** | Add to locale |
| `profile.security.match` | **Hardcoded** | Add to locale |
| `profile.security.updatePassword` | **Hardcoded** | Add to locale |
| `profile.security.currentPassword` | **Hardcoded** | Add to locale |
| `profile.security.newPassword` | **Hardcoded** | Add to locale |
| `profile.security.confirmPassword` | **Hardcoded** | Add to locale |
| `profile.security.updating` | **Hardcoded** | Add to locale |
| `profile.security.updateButton` | **Hardcoded** | Add to locale |
| `profile.security.cancelChanges` | **Hardcoded** | Add to locale |

#### Security Validation Messages

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `profile.security.validation.currentRequired` | **Hardcoded** | Add to locale |
| `profile.security.validation.newRequired` | **Hardcoded** | Add to locale |
| `profile.security.validation.minLength` | **Hardcoded** | Add to locale |
| `profile.security.validation.uppercase` | **Hardcoded** | Add to locale |
| `profile.security.validation.numeric` | **Hardcoded** | Add to locale |
| `profile.security.validation.special` | **Hardcoded** | Add to locale |
| `profile.security.validation.noMatch` | **Hardcoded** | Add to locale |
| `profile.security.validation.updateFailed` | **Hardcoded** | Add to locale |

**Status:** ~22 hardcoded strings in Security tab.

---

### 7.4 Settings Modal (SettingsPopover.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `settingsPopover.language.arabic` | **Hardcoded** ("عربي") | Add to locale |
| `settingsPopover.language.english` | **Hardcoded** ("EN") | Add to locale |

**Status:** 2 hardcoded strings. Note: Arabic string "عربي" needs proper translation entry.

---

### 7.5 Sidebar (LeftSideBar.tsx / RightSideBar.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `sidebar.nav.sales` | Translated | No change |
| `sidebar.nav.invoices` | Translated | No change |
| `sidebar.nav.customers` | Translated | No change |
| `sidebar.nav.purchases` | Translated | No change |
| `sidebar.nav.bills` | Translated | No change |
| `sidebar.nav.vendors` | Translated | No change |
| `sidebar.nav.inventory` | Translated | No change |
| `sidebar.nav.system` | Translated | No change |
| `sidebar.nav.stock` | Translated | No change |
| `sidebar.nav.warehouses` | Translated | No change |
| `sidebar.nav.finance` | Translated | No change |
| `sidebar.nav.ledgers` | Translated | No change |
| `sidebar.nav.plReport` | Translated | No change |
| `sidebar.nav.reports` | Translated | No change |
| `sidebar.nav.settings` | Translated | No change |
| `sidebar.actions.logout` | Translated | No change |

**Singular Forms (for "a/an" context):**

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `sidebar.nav.singular.invoices` | Translated | No change |
| `sidebar.nav.singular.customers` | Translated | No change |
| `sidebar.nav.singular.bills` | Translated | No change |
| `sidebar.nav.singular.vendors` | Translated | No change |
| `sidebar.nav.singular.stock` | Translated | No change |
| `sidebar.nav.singular.warehouses` | Translated | No change |

**Status:** Fully translated, no action required.

---

### 7.6 Tabbar (TabBar.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `titlebar.expandSidebar` | Translated | No change |
| `titlebar.collapseSidebar` | Translated | No change |

**Status:** Fully translated, no action required.

---

### 7.7 Dashboard Screen (DashboardContent.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `dashboard.breadcrumb.finance` | Translated | No change |
| `dashboard.breadcrumb.executiveOverview` | Translated | No change |
| `dashboard.kpi.grossRevenue` | Translated | No change |
| `dashboard.kpi.totalExpenses` | Translated | No change |
| `dashboard.kpi.netProfit` | Translated | No change |
| `dashboard.kpi.cashPosition` | Translated | No change |
| `dashboard.workflow.*` | Translated | No change |
| `dashboard.actions.*` | Translated | No change |
| `dashboard.status.*` | Translated | No change |
| `dashboard.badge.*` | Translated | No change |
| `dashboard.chart.*` | Translated | No change |
| `common.currency` | **Hardcoded** ("USD") | Add to locale |

**Status:** 1 hardcoded string (currency symbol).

---

### 7.8 New Tab Screen (NewTabContent.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `nav.newTab` | Translated | No change |
| `dashboard.workflow.*` | Translated | No change |

**Status:** Fully translated, no action required.

---

### 7.9 Entity Workspace Screen (EntityWorkspace.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `entity.workspace.section.*` | Translated | No change |
| `entity.workspace.addNew` | Translated | No change |
| `entity.workspace.rowsPerPage` | Translated | No change |
| `entity.workspace.showing` | Translated | ICU plural format |
| `entity.workspace.toolbar.*` | Translated | No change |
| `entity.workspace.columns.*` | Translated | No change |
| `entity.workspace.edit` | Translated | No change |
| `entity.workspace.delete` | Translated | No change |
| `entity.workspace.page` | Translated | No change |
| `entity.workspace.of` | Translated | No change |
| `entity.workspace.selectAll` | Translated | No change |
| `entity.workspace.selectRow` | Translated | No change |
| `entity.workspace.selected` | **Needs ICU plural** | Convert to ICU format |

**Status:** `entity.workspace.selected` and `entity.workspace.showing` need ICU plural conversion for proper Arabic grammar.

---

### 7.10 Filtering Modal (FilterDialog.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `entity.filter.min` | **Hardcoded** | Add to locale |
| `entity.filter.max` | **Hardcoded** | Add to locale |
| `entity.filter.statusOptions` | **Hardcoded** array | Add as array to locale |
| `entity.filter.clearAll` | **Hardcoded** | Add to locale |
| `entity.filter.cancel` | **Hardcoded** | Add to locale |
| `entity.filter.apply` | **Hardcoded** | Add to locale |

**Status:** 6 hardcoded strings need locale entries.

---

### 7.11 Columns Modal (ColumnsModal.tsx)

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `entity.workspace.columns.manage` | Translated | No change |
| `entity.workspace.columns.saveChanges` | Translated | No change |
| `entity.workspace.columns.toggleVisibility` | Translated | ICU plural for `{{column}}` interpolation |

**Status:** `toggleVisibility` needs ICU plural format for count-based column references.

---

### 7.12 Entity Modal (EntityDetailModal.tsx)

#### Details Tab

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `entity.detail.tabs.details` | **Hardcoded** | Add to locale |
| `entity.detail.tabs.insights` | **Hardcoded** | Add to locale |
| `entity.detail.tabs.audits` | **Hardcoded** | Add to locale |

#### All Tabs Content

| Key Pattern | Current State | Action Required |
|-------------|--------------|-----------------|
| `entity.detail.*` | **Hardcoded** | Audit all tab content |

**Status:** 3 tab labels hardcoded. Full tab content audit required.

---

### 7.13 Summary of Required Changes

| Category | Count | Action |
|----------|-------|--------|
| Hardcoded strings requiring locale entries | ~45 | Add to en.json/ar.json |
| Existing translations needing ICU plural conversion | ~5 | Convert to ICU format |
| Static translations (no change needed) | ~100+ | Verify existing |
| **Total strings to review** | **~150** | |

---

### 7.14 Priority Order for Implementation

1. **High Priority** - Hardcoded strings affecting user-facing UI
   - ProfileModal.tsx (all tabs)
   - LoginModal.tsx
   - FilterDialog.tsx
   - EntityDetailModal.tsx (tab labels)

2. **Medium Priority** - ICU plural conversions
   - entity.workspace.selected
   - entity.workspace.showing
   - entity.workspace.columns.toggleVisibility

3. **Low Priority** - Static translations
   - Navbar, Sidebar, Tabbar, Dashboard (already translated)

---

## 8. Implementation Steps

### Step 1: Update i18n Types

Extend type definitions to support ICU plural syntax.

### Step 2: Add Formatter Helper

Create `src/i18n/formatters.ts` with Arabic plural rules.

### Step 3: Update Locale Files

For each key requiring pluralization, convert to ICU format in both en.json and ar.json.

### Step 4: Update Components

Replace `{{count}}` interpolation with ICU plural syntax.

### Step 5: Verify Build

Run `npm run check:all` to ensure no type errors.

---

## 9. Example Transformations

### Before (Current)

```json
"entity.workspace.selected": "{{count}} selected"
```

```tsx
<span>{t('entity.workspace.selected', { count: selectedCount })}</span>
```

### After (ICU Plural)

```json
"entity.workspace.selected": "{count, plural, one {# selected} other {# selected}}"
```

```tsx
<span>{t('entity.workspace.selected', { count: selectedCount })}</span>
```

### Arabic (ar.json)

```json
"entity.workspace.selected": "{count, plural, =0 {لا توجد محدد} =1 {محدد واحد} =2 {محددان} few {# محددات} many {# محدد} other {# محدد}}"
```

---

## 10. Testing Checklist

- [ ] Count = 0 shows zero form
- [ ] Count = 1 shows singular/one form
- [ ] Count = 2 shows dual form (Arabic) / plural (English)
- [ ] Count = 5 shows few form (Arabic) / plural (English)
- [ ] Count = 50 shows many form (Arabic) / plural (English)
- [ ] Count = 100+ shows other form
- [ ] Definite articles work correctly in context
- [ ] No regression in existing static translations

---

## 11. Files to Modify

### New Files
- `src/i18n/formatters.ts` - Arabic plural rule helper (optional, for morphological extensions)

### Modified Files (by priority)

#### High Priority (User-facing hardcoded strings)

| File | Changes |
|------|---------|
| `src/components/auth/ProfileModal.tsx` | Add `useTranslation`, replace ~40 hardcoded strings |
| `src/components/auth/LoginModal.tsx` | Add `useTranslation`, replace 2 hardcoded strings |
| `src/components/entity/FilterDialog.tsx` | Add `useTranslation`, replace 6 hardcoded strings |
| `src/components/entity/EntityDetailModal.tsx` | Add `useTranslation`, replace ~10 hardcoded strings |
| `src/components/layout/SettingsPopover.tsx` | Add `useTranslation`, replace 2 hardcoded strings |

#### Medium Priority (ICU plural conversions)

| File | Changes |
|------|---------|
| `src/components/entity/Toolbar.tsx` | Convert `entity.workspace.selected` to ICU format |
| `src/components/entity/ColumnsModal.tsx` | Convert `toggleVisibility` to ICU format |

#### Low Priority (Already translated, verify)

| File | Status |
|------|--------|
| `src/components/layout/Navbar.tsx` | Already uses i18n |
| `src/components/layout/LeftSideBar.tsx` | Already uses i18n |
| `src/components/layout/RightSideBar.tsx` | Already uses i18n |
| `src/components/tabs/TabBar.tsx` | Already uses i18n |
| `src/components/tabs/DashboardContent.tsx` | Already uses i18n (except `common.currency`) |
| `src/components/tabs/NewTabContent.tsx` | Already uses i18n |

#### Locale Files

| File | Changes |
|------|---------|
| `locales/en.json` | Add ~45 new translation keys, convert ~5 to ICU format |
| `locales/ar.json` | Add ~45 Arabic translations, convert ~5 to ICU format |
| `locales/generated/pending-keys.json` | Update with complete audit results |

### Type Definition Updates

| File | Changes |
|------|---------|
| `src/i18n/i18n.d.ts` | Extended types for ICU plural support |