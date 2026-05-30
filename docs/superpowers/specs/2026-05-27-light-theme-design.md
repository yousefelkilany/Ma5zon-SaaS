# Light Theme Design Specification

## Context

The application currently ships with a dark-only theme (Ma5zon Dark). Users have requested a warm paper white light theme for daytime use. This spec defines the light theme color palette and its application across all UI surfaces.

## Design Decisions

- **Palette**: Warm paper white (cream) base with subtle warm tints on all surface layers
- **Accent**: Muted green (kept from dark theme but softened at 85% saturation for white backgrounds)
- **Approach**: CSS variable override block — add a `.light` class in `theme-variables.css` that overrides the `:root` dark values. Existing dark theme remains unchanged.

---

## Color Palette

### Base

| Variable       | Value     | Purpose                        |
| -------------- | --------- | ------------------------------ |
| `--background` | `#faf9f7` | Warm paper white (base canvas) |
| `--foreground` | `#1a1a1a` | Near-black for primary text    |
| `--surface`    | `#ffffff` | Pure white for base surfaces   |
| `--on-surface` | `#1a1a1a` | Primary text on surface        |

### Surface Containers

A 6-step elevation scale from background-matched to highest-in-section:

| Variable                      | Value     | Purpose                                  |
| ----------------------------- | --------- | ---------------------------------------- |
| `--surface-container-low`     | `#faf9f7` | Same as background, matched lowest layer |
| `--surface-container-lowest`  | `#ffffff` | Pure white, modal and dialog backgrounds |
| `--surface-container`         | `#f5f4f2` | Warm cream, default container surface    |
| `--surface-container-high`    | `#efefea` | Slightly darker cream, elevated headers  |
| `--surface-container-highest` | `#e8e7e2` | Highest surface in group, active states  |
| `--surface-bright`            | `#ffffff` | Brightest white overlay (same as lowest) |
| `--surface-tint`              | `#bec6e0` | Brand tint color (unchanged from dark)   |

### On-Surface Variants

| Variable               | Value     | Purpose                             |
| ---------------------- | --------- | ----------------------------------- |
| `--surface-variant`    | `#f0efe9` | Warm light gray, subtle backgrounds |
| `--on-surface-variant` | `#5c5c5c` | Warm mid-gray, secondary text       |
| `--outline`            | `#909090` | Mid-gray for borders                |
| `--outline-variant`    | `#c4c4bc` | Warm light gray for subtle dividers |

### Primary / Brand

| Variable                 | Value     | Purpose                                            |
| ------------------------ | --------- | -------------------------------------------------- |
| `--primary`              | `#bec6e0` | Cool blue-gray (unchanged)                         |
| `--primary-foreground`   | `#283044` | Dark blue-gray for text on primary                 |
| `--secondary`            | `#4edea3` | Soft mint green (slightly muted at 85% saturation) |
| `--secondary-foreground` | `#003824` | Dark green for text on secondary                   |
| `--sidebar-primary`      | `#4edea3` | Accent green for the sidebar                       |

### Tertiary / Status

| Variable               | Value     | Purpose                              |
| ---------------------- | --------- | ------------------------------------ |
| `--tertiary`           | `#f5a0a5` | Muted coral pink                     |
| `--on-tertiary`        | `#68001a` | Deep burgundy text                   |
| `--error`              | `#e57373` | Warm red                             |
| `--on-error`           | `#ffffff` | White text on error                  |
| `--error-container`    | `#ffdad6` | Soft red for error backgrounds       |
| `--on-error-container` | `#410002` | Deep red for text on error container |

### Inverse

| Variable               | Value     | Purpose                  |
| ---------------------- | --------- | ------------------------ |
| `--inverse-surface`    | `#1a1a2e` | Deep blue for overlays   |
| `--inverse-on-surface` | `#faf9f7` | Light text on inverse    |
| `--inverse-primary`    | `#798098` | Muted for inverse states |

### Shadcn/ui Mapped Tokens

These map to the custom tokens above:

| Shadcn Token                   | Maps To                      |
| ------------------------------ | ---------------------------- |
| `--color-background`           | `--background`               |
| `--color-foreground`           | `--foreground`               |
| `--color-card`                 | `--surface-container-lowest` |
| `--color-card-foreground`      | `--on-surface`               |
| `--color-popover`              | `--surface-container`        |
| `--color-popover-foreground`   | `--on-surface`               |
| `--color-primary`              | `--primary`                  |
| `--color-primary-foreground`   | `--primary-foreground`       |
| `--color-secondary`            | `--secondary`                |
| `--color-secondary-foreground` | `--secondary-foreground`     |
| `--color-muted`                | `--surface-variant`          |
| `--color-muted-foreground`     | `--on-surface-variant`       |
| `--color-accent`               | `--surface-container-high`   |
| `--color-accent-foreground`    | `--on-surface`               |
| `--color-destructive`          | `--error`                    |
| `--color-border`               | `--outline-variant`          |
| `--color-input`                | `--outline`                  |
| `--color-ring`                 | `--secondary`                |

### Chart Colors (unchanged from dark mode)

| Variable    | Value     |
| ----------- | --------- |
| `--chart-1` | `#4edea3` |
| `--chart-2` | `#bec6e0` |
| `--chart-3` | `#ffb3b6` |
| `--chart-4` | `#565e74` |
| `--chart-5` | `#00a572` |

---

## Sidebar Theme Overrides

The sidebar in the light theme should use slightly darker warm tints to remain distinct from the main content area, avoiding the "floating card" effect that occurs when adjacent panels share identical background values.

| Variable                       | Value     |
| ------------------------------ | --------- |
| `--sidebar`                    | `#f0efe9` |
| `--sidebar-foreground`         | `#1a1a1a` |
| `--sidebar-accent`             | `#e8e7e2` |
| `--sidebar-accent-foreground`  | `#1a1a1a` |
| `--sidebar-border`             | `#c8c7c0` |
| `--sidebar-ring`               | `#4edea3` |
| `--sidebar-primary`            | `#4edea3` |
| `--sidebar-primary-foreground` | `#003824` |

---

## Scope

Applies to the following screens and components:

1. **Navbar** — `src/components/layout/Navbar.tsx`
2. **Login Modal** — `src/components/auth/LoginModal.tsx`
3. **Profile Modal** (Details + Security tabs) — `src/components/auth/ProfileModal.tsx`
4. **Settings Modal** — `src/components/layout/SettingsPopover.tsx`
5. **Sidebar** — `src/components/layout/SideBar.tsx`
6. **Tabbar** — `src/components/layout/TabBar.tsx`
7. **Dashboard screen** — `src/components/tabs/DashboardContent.tsx`
8. **New tab screen** — (same as Dashboard base container)
9. **Entity workspace screen** — `src/components/entity/EntityWorkspace.tsx`
10. **Filtering modal** — `src/components/entity/FilterDialog.tsx`
11. **Columns modal** — `src/components/entity/ColumnVisibilityDialog.tsx`
12. **Entity Detail Modal** (Details, Insights, Audits tabs) — `src/components/entity/EntityDetailModal.tsx`

---

## Implementation

1. Add a `.light` override block in `src/theme-variables.css`
2. All components use semantic CSS variables (`bg-surface-container`, `text-on-surface`, etc.) — no component changes required
3. The `ThemeProvider.tsx` already toggles `light`/`dark` classes on `document.documentElement` via `classList`
4. No changes to shadow depth or border radius — those are theme-agnostic by design
