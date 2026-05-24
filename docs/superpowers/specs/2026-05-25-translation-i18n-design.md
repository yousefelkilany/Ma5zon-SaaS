# Translation Infrastructure & i18n Design Spec

**Date:** 2026-05-25
**Status:** Approved
**Type:** Infrastructure

---

## 1. Overview

The application currently has hardcoded English strings throughout UI components despite having i18n infrastructure (`react-i18next`, `ar.json` locale file, RTL support). This spec establishes a systematic approach to:

1. Detect hardcoded strings in components
2. Generate consistent translation keys
3. Migrate components to use `t()` translation function
4. Enable Arabic translations alongside English

**User Goal:** Maintain both English and Arabic translations equally for all UI text, with proper RTL support.

---

## 2. Key Naming Convention

### Pattern: `Feature.section.item`

Rules:
- Use lowercase for all keys
- Use camelCase for multi-word items
- Nest keys under feature prefixes
- Group related items under same section

### Feature Prefixes

| Prefix | Usage |
|--------|-------|
| `sidebar` | Sidebar navigation |
| `dashboard` | Dashboard and NewTabContent |
| `titlebar` | Title bar controls |
| `common` | Reusable strings (buttons, labels) |
| `nav` | Navigation labels |
| `actions` | Action labels |
| `status` | Status badges/labels |
| `error` | Error messages |
| `success` | Success messages |

### Examples

```
sidebar.nav.sales
sidebar.nav.invoices
sidebar.nav.customers
sidebar.nav.purchases
sidebar.nav.bills
sidebar.nav.vendors
sidebar.nav.inventory
sidebar.nav.stock
sidebar.nav.warehouses
sidebar.nav.finance
sidebar.nav.ledgers
sidebar.nav.plReport
sidebar.nav.system
sidebar.nav.reports
sidebar.nav.settings
sidebar.actions.logout

dashboard.kpi.grossRevenue
dashboard.kpi.totalExpenses
dashboard.kpi.netProfit
dashboard.kpi.cashPosition
dashboard.workflow.salesWorkflow
dashboard.workflow.createNewInvoice
dashboard.workflow.convertDraftQuotes
dashboard.workflow.recurringBillings
dashboard.workflow.purchaseOrder
dashboard.workflow.processBatchBills
dashboard.workflow.approvePOs
dashboard.workflow.vendorManagement
dashboard.workflow.inventoryControl
dashboard.workflow.stockReconciliation
dashboard.workflow.priceAdjustmentLog
dashboard.workflow.replenishmentAudit
dashboard.workflow.treasuryOps
dashboard.workflow.reconcileBankFeed
dashboard.workflow.interAccountTransfer
dashboard.workflow.forexExposureReport
dashboard.actions.salesInvoice
dashboard.actions.salesInvoiceDesc
dashboard.actions.purchaseInvoice
dashboard.actions.purchaseInvoiceDesc
dashboard.status.awaiting
dashboard.status.overdue
dashboard.status.open
dashboard.status.upcoming
dashboard.status.outStock
dashboard.status.valuation
dashboard.status.balances
dashboard.status.lastSync
dashboard.badge.active
dashboard.badge.paused
dashboard.badge.crit
dashboard.badge.online
dashboard.chart.cashFlowTrends
dashboard.chart.downloadReport
dashboard.chart.revenueByCategory
dashboard.chart.cashInVsCashOut
dashboard.breadcrumb.finance
dashboard.breadcrumb.executiveOverview

titlebar.showLeftSidebar
titlebar.hideLeftSidebar
titlebar.showRightSidebar
titlebar.hideRightSidebar
titlebar.settings
titlebar.collapseSidebar
titlebar.expandSidebar

common.enabled
common.disabled
common.reset
common.save
common.cancel
common.close
common.back
common.next
common.currency
```

---

## 3. Translation Detection Script

### Purpose
Scan `.tsx` components for hardcoded string literals and generate translation keys.

### Location
`scripts/generate-translations.ts`

### Behavior
1. Accepts file path or directory as input
2. Parses TSX/TS files using AST parser (`tsx` or `typescript` + `@babel/parser`)
3. Extracts string literals that are:
   - JSX text content (e.g., `<span>Sales</span>`)
   - aria-label values
   - title attributes
   - placeholder attributes
4. Filters out strings that:
   - Are empty
   - Contain only whitespace
   - Are numeric values
   - Contain placeholders like `{{variable}}`
   - Are file paths or URLs
   - Match existing translation keys
5. Generates keys following naming convention
6. Outputs to `locales/generated/pending-keys.json`

### Output Format
```json
{
  "sidebar.nav.sales": "Sales",
  "sidebar.nav.invoices": "Invoices",
  ...
}
```

### Usage
```bash
npx tsx scripts/generate-translations.ts src/components/layout/LeftSideBar.tsx
```

### Key Generation Algorithm
1. Convert string to lowercase
2. Split on word boundaries
3. Map to closest feature prefix based on component location
4. Generate camelCase item name
5. Ensure uniqueness within namespace

---

## 4. Locale File Structure

### Location
```
locales/
  en.json     ← English values (primary)
  ar.json     ← Arabic translations
```

### Maintenance
- Both files must be updated together
- Keys must match exactly in both files
- Empty values are NOT allowed - must have both English and Arabic

### Existing Keys (Pre-migration)
The following keys already exist in `en.json`/`ar.json` and should be preserved:

```
app.name
menu.about
menu.checkForUpdates
menu.preferences
menu.hide
menu.hideOthers
menu.showAll
menu.quit
menu.view
menu.toggleLeftSidebar
menu.toggleRightSidebar
preferences.title
preferences.description
preferences.general
preferences.appearance
preferences.advanced
preferences.general.keyboardShortcuts
preferences.general.quickPaneShortcut
preferences.general.quickPaneShortcutDescription
preferences.general.exampleSettings
preferences.general.exampleText
preferences.general.exampleTextDescription
preferences.general.exampleTextPlaceholder
preferences.general.exampleToggle
preferences.general.exampleToggleDescription
preferences.appearance.theme
preferences.appearance.colorTheme
preferences.appearance.colorThemeDescription
preferences.appearance.theme.light
preferences.appearance.theme.dark
preferences.appearance.theme.system
preferences.appearance.selectTheme
preferences.appearance.language
preferences.appearance.languageDescription
preferences.appearance.language.system
preferences.advanced.title
preferences.advanced.toggle
preferences.advanced.toggleDescription
preferences.advanced.dropdown
preferences.advanced.dropdownDescription
preferences.advanced.option1
preferences.advanced.option2
preferences.advanced.option3
common.enabled
common.disabled
common.reset
commands.group.navigation
commands.group.settings
commands.group.window
commands.group.notification
commands.group.debug
commands.group.other
commands.showLeftSidebar.label
commands.showLeftSidebar.description
commands.hideLeftSidebar.label
commands.hideLeftSidebar.description
commands.showRightSidebar.label
commands.showRightSidebar.description
commands.hideRightSidebar.label
commands.hideRightSidebar.description
commands.openPreferences.label
commands.openPreferences.description
commands.windowClose.label
commands.windowClose.description
commands.windowMinimize.label
commands.windowMinimize.description
commands.windowToggleMaximize.label
commands.windowToggleMaximize.description
commands.windowFullscreen.label
commands.windowFullscreen.description
commands.windowExitFullscreen.label
commands.windowExitFullscreen.description
commands.testToast.label
commands.testToast.description
commandPalette.title
commandPalette.placeholder
commandPalette.noResults
titlebar.default
titlebar.showLeftSidebar
titlebar.hideLeftSidebar
titlebar.showRightSidebar
titlebar.hideRightSidebar
titlebar.settings
toast.success.preferencesSaved
toast.success.testToast
toast.success.testToastDescription
toast.error.generic
toast.error.shortcutFailed
toast.error.shortcutRestoreFailed
toast.error.shortcutRestoreDescription
toast.error.windowCloseFailed
toast.error.windowMinimizeFailed
toast.error.windowMaximizeFailed
toast.error.fullscreenEnterFailed
toast.error.fullscreenExitFailed
```

---

## 5. Component Migration Pattern

### Step 1: Add useTranslation import
```tsx
import { useTranslation } from 'react-i18next'
```

### Step 2: Call useTranslation in component
```tsx
function MyComponent() {
  const { t } = useTranslation()
  // ...
}
```

### Step 3: Replace hardcoded strings with t()
```tsx
// Before
<span>Sales</span>

// After
<span>{t('sidebar.nav.sales')}</span>
```

### Step 4: Nested string handling
```tsx
// Before
<span className="text-on-surface font-bold">Executive Overview</span>

// After
<span className="text-on-surface font-bold">{t('dashboard.breadcrumb.executiveOverview')}</span>
```

### Step 5: Dynamic values in translations
```tsx
// If string has interpolation, use t() with options
{t('toast.error.windowCloseFailed', { message: errorMessage })}
```

---

## 6. Implementation Phases

### Phase 1: Script Development
**Estimated:** 1-2 hours

1. Create `scripts/generate-translations.ts`
2. Implement AST parsing for TSX files
3. Implement string extraction logic
4. Implement key generation with naming convention
5. Test on `LeftSideBar.tsx` as pilot
6. Refine key naming based on output

### Phase 2: Component Migration
**Estimated:** 3-4 hours

1. Run script on all components in `src/components/`
2. Generate `pending-keys.json`
3. Review and approve generated keys
4. Merge keys into `en.json` and `ar.json`
5. Migrate each component to use `t()`
6. Add missing useTranslation imports
7. Test each component

### Phase 3: Arabic Translation
**Estimated:** Ongoing

1. Review all English values in locale files
2. Add Arabic translations
3. RTL testing for all components
4. Verify Arabic text doesn't overflow containers
5. Test with actual Arabic content

---

## 7. Files to Modify

### New Files
- `scripts/generate-translations.ts` - Translation key generator script

### Modified Files
- `src/components/layout/LeftSideBar.tsx`
- `src/components/tabs/NewTabContent.tsx`
- `src/components/tabs/DashboardContent.tsx`
- `src/components/titlebar/TitleBarContent.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/RightSideBar.tsx`
- `src/components/layout/MainWindow.tsx`
- `src/components/layout/MainWindowContent.tsx`
- `src/components/layout/TabBar.tsx`
- `locales/en.json` - Add new translation keys
- `locales/ar.json` - Add Arabic translations for new keys

---

## 8. Constraints

1. **No empty translations** - Every key must have both English and Arabic
2. **No nested i18n calls** - Each string is translated once
3. **Consistent naming** - All keys follow `Feature.section.item` pattern
4. **RTL compatibility** - All CSS uses logical properties, no hardcoded `left`/`right`
5. **Existing keys preserved** - Pre-existing keys in locale files must not be modified

---

## 9. Acceptance Criteria

- [ ] Script successfully extracts all hardcoded strings from pilot component
- [ ] Generated keys follow naming convention
- [ ] All LeftSideBar strings use `t()` with proper keys
- [ ] Both `en.json` and `ar.json` have matching keys
- [ ] Arabic text displays correctly with RTL direction
- [ ] No hardcoded English strings remain in migrated components
- [ ] All components maintain existing styling and behavior