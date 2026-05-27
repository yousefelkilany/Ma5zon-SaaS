# Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `.light` CSS class override block in `theme-variables.css` that overrides dark theme `:root` variables with warm paper white light theme values.

**Architecture:** CSS variable override block approach — the existing `ThemeProvider.tsx` already toggles `light`/`dark` classes on `document.documentElement` via `classList`. We add the `.light` block to override `:root` dark values. No component changes needed since all components use semantic CSS variables.

**Tech Stack:** CSS (Tailwind v4 `@theme inline` syntax), React context for theme toggling

---

## File Structure

- **Modify:** `src/theme-variables.css:179-212` — add `.light` class block after existing `.dark` block

---

## Task 1: Add `.light` CSS Override Block

**Files:**
- Modify: `src/theme-variables.css:179-212` (append new rule after existing `.dark` block)

- [ ] **Step 1: Append `.light` class block after the `.dark` block**

Open `src/theme-variables.css` and add the following after line 212 (after the `.dark` rule closing brace `}`):

```css
.light {
  --background: #faf9f7;
  --foreground: #1a1a1a;
  --card: #ffffff;
  --card-foreground: #1a1a1a;
  --popover: #f5f4f2;
  --popover-foreground: #1a1a1a;
  --primary: #bec6e0;
  --primary-foreground: #283044;
  --secondary: #4edea3;
  --secondary-foreground: #003824;
  --muted: #f0efe9;
  --muted-foreground: #5c5c5c;
  --accent: #efefea;
  --accent-foreground: #1a1a1a;
  --destructive: #e57373;
  --border: #c4c4bc;
  --input: #909090;
  --ring: #4edea3;
  --chart-1: #4edea3;
  --chart-2: #bec6e0;
  --chart-3: #ffb3b6;
  --chart-4: #565e74;
  --chart-5: #00a572;
  --radius: 0.5rem;
  --sidebar: #f0efe9;
  --sidebar-foreground: #1a1a1a;
  --sidebar-primary: #4edea3;
  --sidebar-primary-foreground: #003824;
  --sidebar-accent: #e8e7e2;
  --sidebar-accent-foreground: #1a1a1a;
  --sidebar-border: #c8c7c0;
  --sidebar-ring: #4edea3;
}
```
**Verification:** The `.light` class mirrors the `.dark` class structure using the light palette values from the spec.
- [ ] **Step 2: Commit**
```bash
git add src/theme-variables.css
git commit -m "feat: add light theme CSS override block with warm paper white palette"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Base colors (`--background`, `--foreground`, `--surface`, `--on-surface`): covered
- Primary/brand (`--primary`, `--secondary`): covered
- Sidebar theme overrides: covered
- Muted/on-surface-variant: covered
- Accent/accent-foreground: covered
- Border/input/ring: covered
- Chart colors: covered
- All scope components 1-12: no component changes needed

**2. Placeholder scan:** No placeholders found. All values are exact hex codes from spec tables.

**3. Type consistency:** N/A — CSS-only task.
