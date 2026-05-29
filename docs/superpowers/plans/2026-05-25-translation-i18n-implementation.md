# Translation Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a translation detection script, migrate all hardcoded UI strings to use i18n `t()` function, and enable bilingual (English/Arabic) support with RTL.

**Architecture:** A Node.js script that parses TSX files using AST to extract hardcoded strings, generates translation keys following `Feature.section.item` convention, and outputs them for manual translation. Components are migrated to use `useTranslation` hook from react-i18next.

**Tech Stack:** Node.js, TypeScript, `@babel/parser`, `react-i18next`, `i18next`

---

## File Structure

```
scripts/
  generate-translations.ts   NEW - Translation detection script

locales/
  en.json                    MODIFY - Add new translation keys
  ar.json                    MODIFY - Add Arabic translations
  generated/                 NEW - Script output directory
    pending-keys.json        NEW - Generated keys for review

src/components/layout/
  LeftSideBar.tsx            MODIFY - Migrate to use t()
  Navbar.tsx                 MODIFY - Migrate to use t()
  RightSideBar.tsx           MODIFY - Migrate to use t()
  TabBar.tsx                 MODIFY - Migrate to use t()
  MainWindow.tsx             MODIFY - Migrate to use t()
  MainWindowContent.tsx      MODIFY - Migrate to use t()

src/components/tabs/
  NewTabContent.tsx          MODIFY - Migrate to use t()
  DashboardContent.tsx       MODIFY - Migrate to use t()

src/components/titlebar/
  TitleBarContent.tsx        MODIFY - Migrate to use t()
```

---

## Task 1: Create Translation Detection Script

**Files:**
- Create: `scripts/generate-translations.ts`
- Create: `locales/generated/.gitkeep`

- [ ] **Step 1: Create scripts directory and script file**

```bash
mkdir -p scripts locales/generated
touch scripts/generate-translations.ts locales/generated/.gitkeep
```

- [ ] **Step 2: Write script header and dependencies**

```typescript
#!/usr/bin/env npx tsx

import * as parser from '@babel/parser'
import * as fs from 'fs'
import * as path from 'path'

interface ExtractedString {
  value: string
  key: string
  location: string
}

const FEATURE_PREFIXES = {
  sidebar: 'sidebar',
  dashboard: 'dashboard',
  titlebar: 'titlebar',
  common: 'common',
  nav: 'nav',
  actions: 'actions',
  status: 'status',
  error: 'error',
  success: 'success',
} as const

function generateKey(str: string, feature: string): string {
  const words = str.toLowerCase().split(/[\s\-_]+/).filter(Boolean)
  const camelCase = words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('')
  return `${feature}.${camelCase}`
}

function extractStringsFromAST(code: string): ExtractedString[] {
  const strings: ExtractedString[] = []
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  function traverse(node: any) {
    if (!node) return

    if (node.type === 'JSXText' && node.value?.trim()) {
      const value = node.value.trim()
      if (!/^[\d\s\-_./:]+$/.test(value) && !value.includes('://')) {
        strings.push({ value, key: '', location: 'jsx-text' })
      }
    }

    if (node.type === 'JSXAttribute') {
      const name = node.name?.name
      if ((name === 'aria-label' || name === 'title' || name === 'placeholder') &&
          node.value?.value?.trim()) {
        strings.push({ value: node.value.value.trim(), key: '', location: name })
      }
    }

    for (const key in node) {
      if (key !== 'loc' && key !== 'start' && key !== 'end') {
        traverse(node[key])
      }
    }
  }

  traverse(ast)
  return strings
}

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/generate-translations.ts <file-or-directory>')
    process.exit(1)
  }

  const stats = fs.statSync(inputPath)
  const files = stats.isDirectory()
    ? fs.readdirSync(inputPath).filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).map(f => path.join(inputPath, f))
    : [inputPath]

  const allStrings: Record<string, string> = {}

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf-8')
    const strings = extractStringsFromAST(code)
    const feature = file.includes('sidebar') ? 'sidebar' :
                    file.includes('dashboard') ? 'dashboard' :
                    file.includes('titlebar') ? 'titlebar' : 'common'

    for (const str of strings) {
      if (!allStrings[str.value]) {
        allStrings[str.value] = generateKey(str.value, feature)
      }
    }
  }

  const outputPath = path.join('locales/generated/pending-keys.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(allStrings, null, 2))
  console.log(`Generated ${Object.keys(allStrings).length} keys to ${outputPath}`)
}

main()
```

- [ ] **Step 3: Add script to package.json**

```json
{
  "scripts": {
    "generate:translations": "npx tsx scripts/generate-translations.ts"
  }
}
```

- [ ] **Step 4: Install @babel/parser if not available**

```bash
cd /mnt/C/Ma5zon-SaaS && pnpm add -D @babel/parser @types/babel__parser
```

- [ ] **Step 5: Test script on LeftSideBar**

```bash
cd /mnt/C/Ma5zon-SaaS && npx tsx scripts/generate-translations.ts src/components/layout/LeftSideBar.tsx
```

Expected output: `Generated N keys to locales/generated/pending-keys.json`

- [ ] **Step 6: Read generated output and verify keys**

```bash
cat locales/generated/pending-keys.json
```

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-translations.ts locales/generated/.gitkeep package.json
git commit -m "feat: add translation detection script"
```

---

## Task 2: Migrate LeftSideBar Component

**Files:**
- Modify: `src/components/layout/LeftSideBar.tsx`
- Modify: `locales/en.json` - Add new keys
- Modify: `locales/ar.json` - Add Arabic translations

- [ ] **Step 1: Add useTranslation import to LeftSideBar.tsx**

```tsx
import { useTranslation } from 'react-i18next'
```

- [ ] **Step 2: Add useTranslation call inside component function**

```tsx
export function LeftSideBar({ className }: LeftSideBarProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  // ...
}
```

- [ ] **Step 3: Replace hardcoded nav section titles with t() keys**

```tsx
// Before
{title: 'Sales', items: [...]}

// After
{title: t('sidebar.nav.sales'), items: [...]}
```

Apply to all NAV_SECTIONS:
- `sidebar.nav.sales` = "Sales"
- `sidebar.nav.purchases` = "Purchases"
- `sidebar.nav.inventory` = "Inventory"
- `sidebar.nav.finance` = "Finance"
- `sidebar.nav.system` = "System"

- [ ] **Step 4: Replace hardcoded nav item labels with t() keys**

```tsx
// Before
{ icon: 'receipt', label: 'Invoices' }

// After
{ icon: 'receipt', label: t('sidebar.nav.invoices') }
```

Apply to all nav items:
- `sidebar.nav.invoices` = "Invoices"
- `sidebar.nav.customers` = "Customers"
- `sidebar.nav.bills` = "Bills"
- `sidebar.nav.vendors` = "Vendors"
- `sidebar.nav.stock` = "Stock"
- `sidebar.nav.warehouses` = "Warehouses"
- `sidebar.nav.ledgers` = "Ledgers"
- `sidebar.nav.plReport` = "P&L Report"
- `sidebar.nav.reports` = "Reports"
- `sidebar.nav.settings` = "Settings"

- [ ] **Step 5: Replace Logout label**

```tsx
// Before
<NavItem icon="logout" label="Logout" collapsed={collapsed} />

// After
<NavItem icon="logout" label={t('sidebar.actions.logout')} collapsed={collapsed} />
```

- [ ] **Step 6: Update aria-labels**

```tsx
// Before
aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}

// After
aria-label={collapsed ? t('titlebar.expandSidebar') : t('titlebar.collapseSidebar')}
```

- [ ] **Step 7: Add new keys to en.json**

```json
{
  "sidebar.nav.sales": "Sales",
  "sidebar.nav.invoices": "Invoices",
  "sidebar.nav.customers": "Customers",
  "sidebar.nav.purchases": "Purchases",
  "sidebar.nav.bills": "Bills",
  "sidebar.nav.vendors": "Vendors",
  "sidebar.nav.inventory": "Inventory",
  "sidebar.nav.stock": "Stock",
  "sidebar.nav.warehouses": "Warehouses",
  "sidebar.nav.finance": "Finance",
  "sidebar.nav.ledgers": "Ledgers",
  "sidebar.nav.plReport": "P&L Report",
  "sidebar.nav.reports": "Reports",
  "sidebar.nav.settings": "Settings",
  "sidebar.actions.logout": "Logout",
  "titlebar.expandSidebar": "Expand sidebar",
  "titlebar.collapseSidebar": "Collapse sidebar"
}
```

- [ ] **Step 8: Add corresponding keys to ar.json**

```json
{
  "sidebar.nav.sales": "المبيعات",
  "sidebar.nav.invoices": "الفواتير",
  "sidebar.nav.customers": "العملاء",
  "sidebar.nav.purchases": "المشتريات",
  "sidebar.nav.bills": "الفواتير المستحقة",
  "sidebar.nav.vendors": "الموردون",
  "sidebar.nav.inventory": "المخزون",
  "sidebar.nav.stock": "المخزون",
  "sidebar.nav.warehouses": "المستودعات",
  "sidebar.nav.finance": "المالية",
  "sidebar.nav.ledgers": "الدفاتر",
  "sidebar.nav.plReport": "تقرير الأرباح والخسائر",
  "sidebar.nav.reports": "التقارير",
  "sidebar.nav.settings": "الإعدادات",
  "sidebar.actions.logout": "تسجيل الخروج",
  "titlebar.expandSidebar": "توسيع الشريط الجانبي",
  "titlebar.collapseSidebar": "طي الشريط الجانبي"
}
```

- [ ] **Step 9: Verify build passes**

```bash
cd /mnt/C/Ma5zon-SaaS && pnpm run build
```

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/LeftSideBar.tsx locales/en.json locales/ar.json
git commit -m "feat(i18n): migrate LeftSideBar to use translations"
```

---

## Task 3: Migrate NewTabContent Component

**Files:**
- Modify: `src/components/tabs/NewTabContent.tsx`

- [ ] **Step 1: Add useTranslation to NewTabContent.tsx**

```tsx
import { useTranslation } from 'react-i18next'
```

```tsx
export function NewTabContent() {
  const { t } = useTranslation()
  // ... existing code
}
```

- [ ] **Step 2: Replace breadcrumb strings**

```tsx
// Before
<a className="hover:text-primary" href="#">Finance</a>
<span className="text-on-surface font-bold">Executive Overview</span>

// After
<a className="hover:text-primary" href="#">{t('dashboard.breadcrumb.finance')}</a>
<span className="text-on-surface font-bold">{t('dashboard.breadcrumb.executiveOverview')}</span>
```

- [ ] **Step 3: Replace KPI card labels**

```tsx
// Before
<KpiCard label="Gross Revenue (MTD)" value="$2,842,910" trend="+12.4%" trendType="positive" />

// After
<KpiCard label={t('dashboard.kpi.grossRevenue')} value="$2,842,910" trend="+12.4%" trendType="positive" />
```

Keys: `dashboard.kpi.grossRevenue`, `dashboard.kpi.totalExpenses`, `dashboard.kpi.netProfit`, `dashboard.kpi.cashPosition`

- [ ] **Step 4: Replace WorkflowPanel titles and actions**

```tsx
// Before
title="Sales Workflow"
actions={[
  { label: 'Create New Invoice' },
  { label: 'Convert Draft Quotes', badge: 12 },
  { label: 'Recurring Billings' },
]}

// After
title={t('dashboard.workflow.salesWorkflow')}
actions={[
  { label: t('dashboard.workflow.createNewInvoice') },
  { label: t('dashboard.workflow.convertDraftQuotes'), badge: 12 },
  { label: t('dashboard.workflow.recurringBillings') },
]}
```

- [ ] **Step 5: Replace ActionCard labels**

```tsx
// Before
<ActionCard
  title="Sales Invoice"
  description="Create a new sales invoice"
  icon="receipt"
  onClick={() => handleActionClick('sales-invoice', 'Sales Invoice')}
/>

// After
<ActionCard
  title={t('dashboard.actions.salesInvoice')}
  description={t('dashboard.actions.salesInvoiceDesc')}
  icon="receipt"
  onClick={() => handleActionClick('sales-invoice', t('dashboard.actions.salesInvoice'))}
/>
```

- [ ] **Step 6: Add all dashboard keys to en.json**

```json
{
  "dashboard.breadcrumb.finance": "Finance",
  "dashboard.breadcrumb.executiveOverview": "Executive Overview",
  "dashboard.kpi.grossRevenue": "Gross Revenue (MTD)",
  "dashboard.kpi.totalExpenses": "Total Expenses",
  "dashboard.kpi.netProfit": "Net Profit",
  "dashboard.kpi.cashPosition": "Cash Position",
  "dashboard.workflow.salesWorkflow": "Sales Workflow",
  "dashboard.workflow.createNewInvoice": "Create New Invoice",
  "dashboard.workflow.convertDraftQuotes": "Convert Draft Quotes",
  "dashboard.workflow.recurringBillings": "Recurring Billings",
  "dashboard.workflow.purchaseOrder": "Purchase Order",
  "dashboard.workflow.processBatchBills": "Process Batch Bills",
  "dashboard.workflow.approvePOs": "Approve POs",
  "dashboard.workflow.vendorManagement": "Vendor Management",
  "dashboard.workflow.inventoryControl": "Inventory Control",
  "dashboard.workflow.stockReconciliation": "Stock Reconciliation",
  "dashboard.workflow.priceAdjustmentLog": "Price Adjustment Log",
  "dashboard.workflow.replenishmentAudit": "Replenishment Audit",
  "dashboard.workflow.treasuryOps": "Treasury Ops",
  "dashboard.workflow.reconcileBankFeed": "Reconcile Bank Feed",
  "dashboard.workflow.interAccountTransfer": "Inter-Account Transfer",
  "dashboard.workflow.forexExposureReport": "Forex Exposure Report",
  "dashboard.actions.salesInvoice": "Sales Invoice",
  "dashboard.actions.salesInvoiceDesc": "Create a new sales invoice",
  "dashboard.actions.purchaseInvoice": "Purchase Invoice",
  "dashboard.actions.purchaseInvoiceDesc": "Create a new purchase invoice",
  "dashboard.status.awaiting": "Awaiting",
  "dashboard.status.overdue": "Overdue",
  "dashboard.status.open": "Open",
  "dashboard.status.upcoming": "Upcoming",
  "dashboard.status.outStock": "Out Stock",
  "dashboard.status.valuation": "Valuation",
  "dashboard.status.balances": "Balances",
  "dashboard.status.lastSync": "Last Sync",
  "dashboard.badge.active": "Active",
  "dashboard.badge.paused": "Paused",
  "dashboard.badge.crit": "Crit",
  "dashboard.badge.online": "Online"
}
```

- [ ] **Step 7: Add corresponding keys to ar.json with Arabic translations**

- [ ] **Step 8: Verify build**

- [ ] **Step 9: Commit**

---

## Task 4: Migrate DashboardContent Component

**Files:**
- Modify: `src/components/tabs/DashboardContent.tsx`

Similar pattern to Task 3. Replace hardcoded strings in:
- KPI card labels
- Section headings (Cash Flow Trends, Revenue by Category)
- Button labels (Download Report)
- Bar chart labels (Jan-Jun, Consulting)

---

## Task 5: Migrate Remaining Layout Components

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/layout/RightSideBar.tsx`
- Modify: `src/components/layout/TabBar.tsx`
- Modify: `src/components/layout/MainWindow.tsx`
- Modify: `src/components/layout/MainWindowContent.tsx`

Apply same pattern: add `useTranslation`, replace strings with `t()` calls, add keys to locale files.

---

## Task 6: Migrate TitleBarContent Component

**Files:**
- Modify: `src/components/titlebar/TitleBarContent.tsx`

- [ ] **Step 1: Add useTranslation**

- [ ] **Step 2: Replace aria-labels and labels**

- [ ] **Step 3: Add keys to locale files**

- [ ] **Step 4: Verify build**

- [ ] **Step 5: Commit**

---

## Task 7: Run Full Script and Generate All Keys

**Files:**
- Modify: `locales/en.json` - Merge all generated keys
- Modify: `locales/ar.json` - Merge all generated keys

- [ ] **Step 1: Run script on entire components directory**

```bash
npx tsx scripts/generate-translations.ts src/components
```

- [ ] **Step 2: Review generated pending-keys.json**

- [ ] **Step 3: Merge any missing keys into en.json and ar.json**

- [ ] **Step 4: Commit locale files**

---

## Task 8: RTL Verification Test

- [ ] **Step 1: Switch app language to Arabic in preferences**

- [ ] **Step 2: Verify RTL direction is applied**

- [ ] **Step 3: Check all migrated components render correctly in RTL**

- [ ] **Step 4: Verify no text overflow or layout issues**

- [ ] **Step 5: Fix any RTL issues found**

- [ ] **Step 6: Commit any RTL fixes**

---

## Acceptance Criteria Checklist

- [ ] Script successfully extracts all hardcoded strings from pilot component
- [ ] Generated keys follow `Feature.section.item` naming convention
- [ ] All LeftSideBar strings use `t()` with proper keys
- [ ] Both `en.json` and `ar.json` have matching keys
- [ ] Arabic text displays correctly with RTL direction
- [ ] No hardcoded English strings remain in migrated components
- [ ] All components maintain existing styling and behavior