# Global Search Design

**Status:** Approved design (pending implementation)
**Date:** 2026-06-10
**Scope:** Reachable, FTS5-backed global search in the navbar, per-user persisted search history, inline highlighting, infinite-scroll pagination of results, and graceful handling of stale rows.

## Problem

The navbar has a stubbed search input (`src/components/layout/Navbar.tsx:28-40`) that does nothing. We need a real global search that:

- Hits a single SQL backend command (FTS5-backed) and renders grouped, clickable results.
- Opens the existing entity detail modals via the existing `entity_modal` / `entity_id` URL search params (managed by `ModalManager`).
- Persists a per-user search history (read/written from SQLite, like preferences).
- Highlights matched substrings in result rows.
- Paginates results client-side with "Show more" (infinite query).
- Handles the race where a result is deleted between the search and the click, including a final defense inside the modal itself.

## Goals

- New `global_search` Tauri command (single SQL statement, single round-trip) backed by per-entity FTS5 virtual tables and a `UNION ALL` over the active views.
- New `GlobalSearch` component extracted from `Navbar`, with debounced input, dropdown anchored under the input, keyboard nav, and global `Cmd/Ctrl+K` + `/` focus shortcuts.
- Per-entity result-row components: product, variant, warehouse. Variants open the variant modal with both `entity_id` (variant) and a new `product_id` (parent) URL search param.
- Per-user `search_history` table with `record`, `list`, `delete`, `clear` commands and a `useSearchHistory` hook. Recent searches are shown in the dropdown when the input is empty; filtered as the user types below the live-search threshold.
- Infinite query (`useInfiniteQuery`) with a "Show more results" affordance when more pages exist. Pages are deduped by `(entity_type, id)`.
- Highlighting via FTS5's built-in `highlight()` function, with a tiny allowlist sanitizer on the frontend.
- Three layers of "entity missing" defense: backend drops deleted rows via `active_*` views, client re-validates with `get_by_id` on click, and the modals themselves render an `EntityMissingState` if the modal's data fetch resolves to `None` after a successful click-time check.

## Non-Goals (YAGNI)

- Searching `users`, `stock_movements`, or `stock_levels` (separate specs).
- Cross-device / cross-user history sync.
- Typo tolerance / fuzzy matching (FTS5 doesn't ship with this; can add a `trigram` tokenizer later).
- Search history autocomplete-while-typing (history is shown only when the live-search threshold isn't met).
- Replacing the per-table `LIKE` filters in `DataTable` with FTS.
- Highlighting the matched substring in the `match_title` of history rows that don't come from a live search — the prefix match in the history list is enough.

## Design

### 1. Architecture

```
┌──────────────────┐  commands.globalSearch(q, limit, offset)  ┌────────────────────────────┐
│  GlobalSearch    │ ────────────────────────────────────────► │  global_search (Rust)      │
│  (input +        │                                            │                            │
│   dropdown)      │ ◄────────── PaginatedSearchResult ───────  │  UNION ALL of:             │
│                  │                                            │   fts_products JOIN        │
│  SearchHistory   │                                            │     active_products        │
│  List (empty /   │  commands.searchHistoryList(user_id)       │   fts_product_variants JOIN│
│  pre-threshold)  │  commands.searchHistoryRecord(user_id, q)  │     active_product_variants│
└────────┬─────────┘  commands.searchHistoryDelete / Clear      │     + active_products      │
         │                                                        │   fts_warehouses JOIN     │
         │  result click → URL search params                      │     active_warehouses      │
         │  ?entity_modal=&entity_id=[&product_id=][&variant_id=] │  + per-entity triggers     │
         ▼                                                        │  + search_history table   │
   ModalManager (existing) ─── ProductModal / VariantModal /      └────────────────────────────┘
                              WarehouseModal
                                  │
                                  │  if entity data resolves to None
                                  ▼
                          EntityMissingState (close only)
```

### 2. Backend (Rust)

#### 2.1 FTS5 virtual tables and triggers

One FTS5 virtual table per indexed entity:

- `fts_products(content='products', content_rowid='id', tokenize='unicode61')` with indexed columns `name`, `category`, `company`.
- `fts_product_variants(content='product_variants', content_rowid='id', tokenize='unicode61')` with indexed columns `sku`, `variant_name`.
- `fts_warehouses(content='warehouses', content_rowid='id', tokenize='unicode61')` with indexed columns `name`, `location`.

Per-entity triggers (mirrored across all three):

```sql
-- INSERT
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO fts_products(rowid, name, category, company)
  VALUES (new.id, new.name, new.category, new.company);
END;

-- UPDATE (re-sync indexed columns)
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  INSERT INTO fts_products(fts_products, rowid, name, category, company)
  VALUES ('delete', old.id, old.name, old.category, old.company);
  INSERT INTO fts_products(rowid, name, category, company)
  VALUES (new.id, new.name, new.category, new.company);
END;

-- Soft-delete (deleted_at NULL → timestamp)
CREATE TRIGGER products_aud AFTER UPDATE OF deleted_at ON products
WHEN old.deleted_at IS NULL AND new.deleted_at IS NOT NULL
BEGIN
  INSERT INTO fts_products(fts_products, rowid, name, category, company)
  VALUES ('delete', old.id, old.name, old.category, old.company);
END;
```

Same shape for `product_variants` and `warehouses`. The `UPDATE OF deleted_at` filter plus the `WHEN` clause guarantees:

- A normal edit (no `deleted_at` change) goes through the `au` trigger and re-syncs the row.
- A soft-delete fires the `aud` trigger and removes the row from the FTS index.
- A subsequent change to `deleted_at` on an already-deleted row is a no-op (the `WHEN` clause won't match).
- An un-delete (deleted_at → NULL) currently leaves the row out of the index; that's acceptable for v1, and `refresh_search_index` repairs it on demand.

The same three triggers (`ai`, `au`, `aud`) ship for each entity, parameterised by table name and indexed columns.

#### 2.2 `search_history` table

```sql
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
  ON search_history(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE VIEW IF NOT EXISTS active_search_history AS
  SELECT * FROM search_history WHERE deleted_at IS NULL;
```

Soft-delete (project-wide convention from `2026-05-28-soft-delete-schema-design.md`).

#### 2.3 `global_search` command — single SQL, single round-trip

```sql
SELECT 'product' AS entity_type,
       p.id        AS id,
       CAST(p.id AS TEXT) AS parent_id,
       fts.matched_column,
       p.name      AS match_title,
       highlight(fts_products, 1, '<mark>', '</mark>') AS highlighted_title,
       p.company   AS subtitle,
       p.category  AS meta,
       fts.rank
FROM (
  SELECT rowid,
         CASE
           WHEN fts_products MATCH ?1 THEN 'name'
           WHEN fts_products MATCH ?1 THEN 'category'
           ELSE 'company'
         END AS matched_column,
         rank
  FROM fts_products
  WHERE fts_products MATCH ?1
) fts
JOIN active_products p ON p.id = fts.rowid

UNION ALL

SELECT 'variant',
       v.id,
       CAST(p.id AS TEXT),
       fts.matched_column,
       v.variant_name,
       highlight(fts_product_variants, 2, '<mark>', '</mark>'),
       p.name,
       v.sku,
       fts.rank
FROM (
  SELECT rowid,
         CASE
           WHEN v MATCH ?1 THEN 'sku'
           ELSE 'variant_name'
         END AS matched_column,
         rank
  FROM fts_product_variants v
  WHERE v MATCH ?1
) fts
JOIN active_product_variants v ON v.id = fts.rowid
JOIN active_products p ON p.id = v.product_id

UNION ALL

SELECT 'warehouse',
       w.id,
       NULL,
       fts.matched_column,
       w.name,
       highlight(fts_warehouses, 1, '<mark>', '</mark>'),
       w.location,
       NULL,
       fts.rank
FROM (
  SELECT rowid,
         CASE WHEN w MATCH ?1 THEN 'name' ELSE 'location' END,
         rank
  FROM fts_warehouses w
  WHERE w MATCH ?1
) fts
JOIN active_warehouses w ON w.id = fts.rowid

ORDER BY rank
LIMIT ?2 OFFSET ?3;
```

A second `SELECT COUNT(*)` is run with the same `WHERE` (without `LIMIT`/`OFFSET`) to compute `total_count`. Both queries run inside a single read transaction to keep `total_count` consistent with the page contents.

`highlight()` is computed in Rust, not in SQL. The query returns `match_title` and `matched_column` (the raw matched value), and a small helper in `src-tauri/src/commands/search.rs` builds the highlighted string by:

1. Selecting the substring of `match_title` that the FTS5 tokenizer matched, using the FTS5 `snippet()` or `offsets()` virtual-table API (the offsets are queried once per page for the matched rowids only).
2. Wrapping the substring with `<mark>...</mark>`.

This avoids hard-coding FTS5 column indices in SQL and works even when `MATCH` is a multi-token query that spans columns.

#### 2.4 Rust types and command signatures

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchHit {
    pub entity_type: String,        // "product" | "variant" | "warehouse"
    pub id: String,
    pub parent_id: Option<String>,  // product id for variants; null otherwise
    pub matched_column: String,
    pub match_title: String,        // raw, accessible name
    pub highlighted_title: String,  // <mark>-wrapped, sanitized on the frontend
    pub subtitle: String,           // product company, parent product name, warehouse location
    pub meta: Option<String>,       // product category, variant sku, null
    pub rank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PaginatedSearchResult {
    pub data: Vec<SearchHit>,
    pub total_count: i32,
    pub total_pages: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchHistoryEntry {
    pub id: String,
    pub user_id: String,
    pub query: String,
    pub created_at: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn global_search(
    app: AppHandle,
    query: String,
    limit: i32,    // default 20
    offset: i32,   // default 0
) -> Result<PaginatedSearchResult, String>;

#[tauri::command]
#[specta::specta]
pub async fn refresh_search_index(app: AppHandle) -> Result<(), String>;

#[tauri::command]
#[specta::specta]
pub async fn search_history_list(
    app: AppHandle,
    user_id: String,
    limit: i32,    // default 10
) -> Result<Vec<SearchHistoryEntry>, String>;

#[tauri::command]
#[specta::specta]
pub async fn search_history_record(
    app: AppHandle,
    user_id: String,
    query: String,
) -> Result<(), String>;

#[tauri::command]
#[specta::specta]
pub async fn search_history_delete(
    app: AppHandle,
    user_id: String,
    id: String,
) -> Result<(), String>;

#[tauri::command]
#[specta::specta]
pub async fn search_history_clear(app: AppHandle, user_id: String) -> Result<(), String>;
```

`global_search` returns a user-friendly error string when FTS5 `MATCH` rejects the input (e.g. unbalanced quotes, trailing `*`). The frontend treats this as a transient invalid-query banner and keeps the previous results.

`refresh_search_index` does `INSERT INTO fts_<entity>(fts_<entity>, rowid, ...) SELECT 'delete', rowid, ... FROM fts_<entity>;` then re-inserts from `active_<entity>s` for each entity. Used both as a manual command and on `SearchInitializer` first-run for existing DBs.

#### 2.5 Initializers

Two new initializers following the existing `DatabaseInitializable` pattern:

- `SearchInitializer` — creates the FTS5 virtual tables, the `ai` / `au` / `aud` triggers, and runs `refresh_search_index` once if any of the FTS tables is empty.
- `SearchHistoryInitializer` — creates the `search_history` table + index + view.

Both are registered in `TABLE_INITIALIZERS`.

#### 2.6 Sanitization on the frontend

FTS5's `highlight()` emits `<mark>...</mark>` around matches. The backend is trusted, but we still pass the resulting HTML through a small allowlist sanitizer in `src/lib/sanitize.ts`:

```ts
import DOMPurify from 'isomorphic-dompurify' // already a transitive dep if available, else use a 30-line hand-rolled allowlist
export function sanitizeHighlight(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] })
}
```

If `DOMPurify` is not already a dependency, ship a tiny allowlist that strips everything but `<mark>` and the text between — see `docs/developer/security.md` for the chosen approach during implementation.

### 3. Frontend

#### 3.1 Component tree

```
<GlobalSearch>
  ├─ <input />                       (search box, debounced 100ms)
  ├─ <SearchDropdown>
  │   ├─ <SearchHistoryList>         (only when query.trim().length < 3)
  │   │   ├─ history row × N
  │   │   └─ "Clear all" footer
  │   └─ <SearchResultList>          (only when query.trim().length >= 3)
  │       ├─ <ProductResultRow>      (per group)
  │       ├─ <VariantResultRow>
  │       ├─ <WarehouseResultRow>
  │       └─ "Show more results"     (when next page exists)
  └─ <EntityMissingState>            (rendered inside each modal, not here)
```

#### 3.2 `useGlobalSearch` (infinite query)

```ts
useInfiniteQuery({
  queryKey: ['globalSearch', trimmed],
  queryFn: ({ pageParam = 0 }) => commands.globalSearch(trimmed, 20, pageParam),
  enabled: trimmed.length >= 3,
  staleTime: 30_000,
  initialPageParam: 0,
  getNextPageParam: (last, _, lastPageParam) =>
    last.data.length + lastPageParam < last.total_count
      ? lastPageParam + last.data.length
      : undefined,
})
```

Consumer code dedupes by `(entity_type, id)` across pages and re-groups by `entity_type` (preserving first-seen order). Per-group cap is 5; the row after the cap is a "+N more in <Group>" footer that calls `fetchNextPage()`.

#### 3.3 Per-entity result rows

Each result row component receives the full `SearchHit` and renders:

- Product: `match_title` (highlighted), `subtitle` (company), `meta` (category chip).
- Variant: `match_title` (highlighted, e.g. "Large Red"), `subtitle` (parent product name), `meta` (sku).
- Warehouse: `match_title` (highlighted, name), `subtitle` (location).

The trailing button (placement flips on RTL via `inline-end`) is the "open in new tab" action:

```ts
useTabStore.getState().addTab({
  type: 'entity',
  entityType: hit.entity_type,
  search: { entity_modal: hit.entity_type, entity_id: hit.id, product_id: hit.parent_id },
})
```

The primary action navigates the current tab to the same search params.

#### 3.4 URL search params for variant deep-link

Extend the `entitySearchSchema` in `src/router/index.tsx`:

```ts
const entitySearchSchema = z.object({
  entity_modal: z.enum(ModalTypes).optional(),
  entity_id: z.string().optional(),
  product_id: z.string().optional(),  // new
})
```

In `src/components/modal/ModalManager.tsx`, the `case 'variant':` branch reads both `entity_id` (variant id) and `product_id` (parent) from the URL and passes them to `VariantModal` as `entityId` and `productId`.

#### 3.5 Keyboard interaction

- `/` and `Cmd/Ctrl+K` from anywhere in the app focus the search input.
- `Esc` closes the dropdown and blurs the input.
- `ArrowUp` / `ArrowDown` move the active row across the *flattened* order (history or grouped results).
- `Enter` triggers the primary action of the active row.
- `Tab` is captured only inside the dropdown; outside, it behaves normally.

The `use-keyboard-shortcuts` hook (already in the codebase) is extended with the global `/` and `Cmd/Ctrl+K` handlers. The handlers do nothing when the user is typing in another input.

#### 3.6 Stale-row race handling (click-time)

On click of a result row, the consumer calls the entity's existing `get_by_id` TanStack Query. If it returns `undefined` *after the data is no longer loading*:

1. The row is added to a local `staleHitIds: Set<string>` in the dropdown's state.
2. The row renders dimmed with an inline "This item was just deleted" message (no navigate).
3. A 2-second `setTimeout` removes the row from `results` and clears the flag.
4. The dropdown stays open and the input keeps focus.

A second row click during the 2-second window is allowed; the same flow runs for the new row.

#### 3.7 Modal-level missing state

`ProductModal`, `VariantModal`, and `WarehouseModal` already distinguish `isLoading` from `data === undefined` (the result of `useGetProduct` etc.). When the query completes and `data === undefined` *and* the modal was opened with a valid `entityId`, the modal renders `<EntityMissingState onClose={handleClose} />` instead of the normal form. The component shows:

- A material "delete" icon.
- "This item is no longer available" message.
- A single "Close" button that calls `handleClose`.

This is the third defense line: backend drops deleted rows, click-time re-validates, and if the data still vanishes between click and render, the modal shows the missing state.

#### 3.8 Search history UX

History is shown iff `query.trim().length < 3` (which includes the empty case). The list disappears once live results take over.

- Input is empty and focused → dropdown shows `SearchHistoryList` with the last 10 distinct queries for the current user (most recent first). Per-row × button removes that entry. A "Clear all" footer calls `search_history_clear`.
- Input has 1–2 chars → same `SearchHistoryList` filters client-side: `entry.query.toLowerCase().includes(typed.toLowerCase())`. Matched substring is wrapped in `<mark>`. Empty state: "No matching recent searches".
- Input has ≥3 chars → `SearchResultList` takes over; `SearchHistoryList` is hidden.
- A query is recorded (`search_history_record`) only when the user submits a search (Enter or result click) and at least one result is returned. No-result queries are not recorded.
- Per-user isolation: the hook reads the active user via the existing auth flow (the same source the navbar already uses for `ProfileSection`); each `search_history_*` call passes the active `user_id`.

### 4. Error handling summary

| Case | Defense |
|---|---|
| FTS5 rejects the query syntax | Rust returns `Result::Err` with a friendly message; dropdown shows an "invalid query" line, keeps prior results. |
| Backend / DB unreachable | Rust returns `Result::Err`; dropdown shows "Search is unavailable", no results rendered. |
| Source row is soft-deleted before query | `LEFT JOIN` against `active_*` views drops it. |
| Source row is soft-deleted between query and click | Client re-validates with `get_by_id`; row dims out, 2s timeout, dropdown stays open. |
| Source row is soft-deleted between click-time check and modal render | `EntityMissingState` inside the modal; user can close and re-search. |
| Rapid typing | TanStack Query cancels in-flight on key change; we additionally key the query by the trimmed query string and ignore stale pages. |
| Per-entity row component throws | Row is wrapped in a small `<ErrorBoundary>` that renders a fallback "Couldn't render this result" line. |
| Result count exceeds `LIMIT` | `useInfiniteQuery` + "Show more" affordance; results deduped by `(entity_type, id)` across pages. |
| Highlight HTML contains stray tags | Frontend allowlist sanitizer (`<mark>` only). |
| History contains no matches for typed prefix | "No matching recent searches" line. |

### 5. Testing

#### 5.1 Rust unit tests (`src-tauri/src/sql/search.rs`)

- Trigger coverage, run on an in-memory DB:
  - Insert into source → corresponding FTS row is present.
  - Update text → FTS row reflects new text, `MATCH` on the old text returns 0 rows.
  - Soft-delete (NULL → timestamp) → FTS row is removed; `MATCH` returns 0 rows.
  - Update `deleted_at` on an already-deleted row → no-op (count of FTS rows is unchanged).
- `global_search`:
  - Match in each entity returns one row of the right `entity_type`.
  - Non-matching query returns an empty `data` and `total_count = 0`.
  - Soft-deleted rows are excluded even if the FTS index hasn't been refreshed.
  - `LIMIT` and `OFFSET` paginate correctly and `total_count` is consistent with the page.
- `refresh_search_index`:
  - After running it on a database where the FTS tables were wiped, all active rows reappear.
- `search_history_*`:
  - Record then list returns the entry most-recent-first.
  - Delete removes one entry; clear removes all entries for a user.
  - Per-user isolation: user A's history is invisible to user B.

#### 5.2 Frontend tests

- `useGlobalSearch`:
  - Doesn't fire when `query.trim().length < 3`.
  - Calls `globalSearch` once per page with the correct `limit` / `offset`.
  - Cancels in-flight on a newer query (TanStack Query cancel semantics).
- `SearchResultList`:
  - Groups results by `entity_type` in the order each entity first appears.
  - Deduplicates by `(entity_type, id)` across pages.
  - Shows "Show more" only when `getNextPageParam` returns a value.
  - Renders the per-entity row component for each hit.
- `SearchHistoryList`:
  - Empty input → full list of recent entries (most recent first) + "Clear all".
  - 1–2 char input → filtered list, with `<mark>` on the matched substring; no "Clear all".
  - 1–2 char input with no match → "No matching recent searches".
  - ≥3 char input → list is hidden.
- `useSearchHistory`:
  - Records a query only on submit and only when at least one result was returned.
  - Per-user isolation.
- Stale-row:
  - Simulate `get_by_id` returning `undefined` on click; assert the row is dimmed with the "just deleted" message, removed after 2s, and the dropdown is still open.
- Modal `EntityMissingState`:
  - Simulate the entity query resolving to `undefined` after the modal opens with a valid `entityId`; assert the missing state renders, the close button calls `onDeleted` / dismisses the modal.
- Keyboard:
  - `/` and `Cmd/Ctrl+K` focus the input from outside the dropdown.
  - `Esc` closes the dropdown and blurs.
  - `ArrowUp` / `ArrowDown` move the active row across history (empty/short input) and across grouped results (≥3 chars).
  - `Enter` triggers the primary action of the active row.

#### 5.3 Manual verification checklist

- Create a product, variant, and warehouse → all appear in search.
- Edit a product's name → old query no longer matches, new query matches.
- Soft-delete a product → result disappears from search within the same flow.
- Trigger `refresh_search_index` via a hidden dev menu or by calling the command from the dev console → stale entries are re-inserted or removed.
- Open dropdown in RTL — verify the trailing "open in new tab" button is on the visual start side.
- Submit a query with 0 results → not recorded in history.
- Submit a query with ≥1 result → recorded in history; appears at the top of the empty dropdown.
- Type 1–2 chars that match part of a previous query → filtered history appears with `<mark>`.

### 6. Files touched

Backend:
- `src-tauri/src/sql/search.rs` *(new)* — FTS5 DDL, triggers, `search_history` DDL, the union query, `refresh_search_index`.
- `src-tauri/src/sql/mod.rs` — export `search` module.
- `src-tauri/src/commands/search.rs` *(new)* — `global_search`, `refresh_search_index`, four `search_history_*` commands, `SearchInitializer`, `SearchHistoryInitializer`.
- `src-tauri/src/commands/mod.rs` — register both initializers in `TABLE_INITIALIZERS`.
- `src-tauri/src/bindings.rs` — add the new commands to `collect_commands!`.
- `src-tauri/src/types.rs` — add `SearchHit`, `PaginatedSearchResult`, `SearchHistoryEntry`.
- `src-tauri/migrations/002_search_fts.sql` *(new, optional)* — backfill for existing DBs that don't have the FTS tables yet.

Frontend:
- `src/components/layout/GlobalSearch.tsx` *(new)* — extracted input + dropdown shell.
- `src/components/layout/search/useGlobalSearch.ts` *(new)* — infinite query hook.
- `src/components/layout/search/SearchResultList.tsx` *(new)* — groups rows, handles active index, stale state, "Show more".
- `src/components/layout/search/SearchHistoryList.tsx` *(new)* — recent searches + filtered prefix view.
- `src/components/layout/search/useSearchHistory.ts` *(new)* — list / record / delete / clear.
- `src/components/layout/search/result-rows/ProductResultRow.tsx` *(new)*.
- `src/components/layout/search/result-rows/VariantResultRow.tsx` *(new)*.
- `src/components/layout/search/result-rows/WarehouseResultRow.tsx` *(new)*.
- `src/components/entity/EntityMissingState.tsx` *(new)* — modal-level fallback.
- `src/lib/sanitize.ts` *(new)* — `sanitizeHighlight` allowlist helper.
- `src/components/layout/Navbar.tsx` — replace inline search markup with `<GlobalSearch />`.
- `src/components/modal/ModalManager.tsx` — read `product_id` param, forward to `VariantModal` in `entity_modal=variant` branch; pass through missing-state handling.
- `src/components/entity/ProductModal.tsx` — render `EntityMissingState` when data resolves to `None` after open.
- `src/components/entity/VariantModal.tsx` — same.
- `src/components/entity/WarehouseModal.tsx` — same.
- `src/router/index.tsx` — extend `entitySearchSchema` with `product_id`.
- `src/hooks/use-keyboard-shortcuts.ts` — register `/` and `Cmd/Ctrl+K` global focus handlers.

Docs:
- `docs/developer/tauri-commands.md` — add the new commands.
- `docs/developer/state-management.md` — note the two new hooks.

### 7. Open follow-ups (separate specs)

- Indexing `users` (admin-only; needs an authorization check before exposing to the search bar).
- Indexing `stock_movements` and `stock_levels` (high volume, low information density).
- Typo tolerance via FTS5's `trigram` tokenizer (or external fuzzy layer).
- Search history autocomplete-while-typing (currently we only show history below the live-search threshold).
- Keyboard shortcut customization in `AppPreferences`.
