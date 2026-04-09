# Apartment Cost Tracker — UI Redesign Spec

## Problem

The current UI is organized around the data model (Expense Ledger, Miscellaneous, EMI sections) rather than the user's workflow. The user's actual workflow is: **open → glance at progress → add a cost → close**. The current UI makes the primary action (adding costs) require multiple clicks through a modal, buries the key progress numbers in equal-weight stat cards, and dedicates 80% of screen real estate to transaction history that is rarely viewed.

## User Profile & Use Cases

- Single user, personal internal tool
- Desktop-primary, with increasing mobile use (PWA installed)
- **Primary use case**: Quickly add a cost (especially EMI — monthly, mostly same amount)
- **Secondary use case**: Glance at overall progress (3 key numbers)
- **Rare use case**: Browse individual transactions, export to Excel

## Design Approach

**Single-page, inline everything.** No navigation, no tabs, no modals. Three vertical sections on one page:

1. Dashboard (progress at a glance)
2. Quick-add form (always visible)
3. Transaction history (collapsed by default)

Principle: **Dashboard-first, action-second, ledger-last.**

## Section 1: Dashboard

### Layout

- **Hero card (dark background, gradient)**: Full-width, dominant. Shows apartment progress.
  - Total invested: large, bold number (e.g., ₹91,60,000)
  - Target: shown next to total as lighter text (/ ₹1,00,00,000)
  - Progress bar: horizontal, fills proportionally
  - Below bar: "91.6% complete" on left, "₹8,40,000 remaining" on right
- **Bank Loan + Cash cards**: Stacked vertically to the right of the hero card on desktop.
  - Bank Loan: shows amount disbursed, remaining of ₹75L cap
  - Cash: shows total out-of-pocket amount
- **EMI + Miscellaneous**: Secondary row below, smaller cards side-by-side.
  - EMI: total paid to date
  - Miscellaneous: total extra costs

### Responsive Behavior

- Desktop: Hero card (left, 60%) + Bank Loan/Cash stacked (right, 40%). EMI + Misc row below.
- Mobile: Hero card full-width, then Bank Loan and Cash stack below, then EMI + Misc side-by-side.

### No Header

The app title "Apartment Cost Tracker" is removed from the header. The hero progress card serves as the visual anchor. No "Export to Excel" or "+ Add Expense" buttons in the header — Export moves to the history section, Add is the inline form below.

## Section 2: Quick-Add Form

### Layout

A card labeled "Add Payment" sitting directly below the dashboard.

**Row 1 — Type chips**: Horizontal row of tappable pill buttons:
- EMI (default selected)
- Bank Loan
- Cash
- Miscellaneous

One selected at a time. Selected chip gets dark fill (#1e293b), unselected chips get light background with border.

**Row 2 — Amount + Date + Save** (desktop): Single horizontal row.
- Amount input: ₹ prefix, large font, numeric input. Flex: 1.5.
- Date input: Native browser date picker (`<input type="date">`). Defaults to today. Always visible. Flex: 0.8.
- Save button: Dark fill, right-aligned.

**Row 2 — Mobile**: Amount and date side-by-side, full-width Save button below.

**Below the row**: Amount-to-words helper text (e.g., "Forty Eight Thousand Two Hundred Sixty Seven Rupees"). Existing conversion logic reused.

### Key Behaviors

- **EMI pre-fill**: When EMI chip is selected, the amount input auto-fills with the last EMI payment amount from Firestore. User can change it or just hit Save.
- **No description field**: Removed entirely. Descriptions are auto-generated based on type: "EMI Payment", "Bank Loan Payment", "Cash Payment", "Miscellaneous".
- **Date defaults to today**: Always pre-filled with current date, but user can change via native date picker for backdating.
- **Keyboard shortcut**: Cmd/Ctrl+K focuses the amount input.
- **On save**: Dashboard numbers update immediately (re-fetch from Firestore). Brief success toast notification (existing notification system reused). Form resets amount but keeps the selected type chip.
- **Validation**: Amount must be > 0. Date must be selected. Inline error display.

## Section 3: Transaction History

### Collapsed State (Default)

A single bar/card showing:
- Left: "Recent Transactions" label + entry count badge (e.g., "47 entries")
- Right: "Export" text link + expand chevron (▼)

Clicking anywhere on the bar expands the history.

### Expanded State

**Filter chips row**: All (default) | Bank Loan | Cash | EMI | Misc. One selected at a time. Filters the visible transactions.

**Transaction list**: Grouped by month (e.g., "OCTOBER 2025" header).

Each row:
- Color-coded dot: blue (#3b82f6) for bank loan, green (#10b981) for cash, amber (#f59e0b) for EMI, purple (#8b5cf6) for miscellaneous
- Type label (auto-generated: "Bank Loan", "EMI Payment", etc.)
- Date below label in smaller muted text
- Amount right-aligned, bold

**No inline Edit/Delete buttons.** Rows are clean. Tapping a row opens edit mode:
- The quick-add form (Section 2) pre-fills with the tapped transaction's data
- The form header changes from "Add Payment" to "Edit Payment"
- A "Delete" text link (red) appears next to the Save button
- A "Cancel" text link appears to exit edit mode without saving
- Saving updates the record and returns to normal add mode
- Cancelling clears the pre-filled data and returns to normal add mode
- The page scrolls up to the QuickAdd form so it's visible

**Export**: The "Export" link in the history header triggers the existing Excel export (multi-sheet workbook). Moved here from the page header.

### Sorting

Transactions ordered by date descending (newest first). Grouped by month.

## Auth Gate

No changes. The existing password authentication (`AuthGate.jsx`) with SHA-256 hashing and localStorage persistence remains as-is.

## PWA

No changes to PWA configuration. Existing Workbox service worker with NetworkFirst caching for Firestore API, auto-update check every 5 minutes, offline support all remain.

## Data Model

No changes to Firestore document structure. The `description` field becomes optional — new entries will have auto-generated descriptions but existing entries with custom descriptions will still display them in history.

```
{
  id: string,
  type: 'bankLoan' | 'cash' | 'emi' | 'miscellaneous',
  amount: number,
  description: string,    // auto-generated for new entries, kept for existing
  date: string,           // YYYY-MM-DD
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Color System

| Element | Color |
|---------|-------|
| Hero card background | linear-gradient(135deg, #1e293b, #334155) |
| Progress bar | linear-gradient(90deg, #3b82f6, #60a5fa) |
| Bank Loan dot/accent | #3b82f6 |
| Cash dot/accent | #10b981 |
| EMI dot/accent | #f59e0b |
| Miscellaneous dot/accent | #8b5cf6 |
| Selected chip / Save button | #1e293b |
| Card borders | #e2e8f0 |
| Page background | #f8fafc |
| Muted text | #94a3b8 |
| Secondary text | #64748b |
| Primary text | #1e293b |

## Component Architecture

### New Structure

```
App.jsx                    → AuthGate wrapper (unchanged)
  └─ TrackerApp.jsx        → Main app (state, Firestore CRUD)
       ├─ Dashboard.jsx    → Hero card + stat cards (redesigned)
       ├─ QuickAdd.jsx     → Type chips + amount + date + save (new)
       └─ History.jsx      → Collapsible transaction list (new, replaces ExpenseList)
```

### Removed Components
- `ExpenseForm.jsx` — replaced by inline QuickAdd
- `ExpenseList.jsx` — replaced by History

### Preserved
- `firebase.js` — all CRUD operations unchanged
- `utils/exportToExcel.js` — called from History's export link
- `AuthGate.jsx` — unchanged
- `index.css` — rewritten to match new design
- `main.jsx` — PWA registration unchanged

### State (App.jsx)

```
expenses: []              // all expenses from Firestore
loading: boolean          // initial load state
notification: {}          // toast messages
selectedType: string      // currently selected type chip (shared between QuickAdd and History filter)
editingExpense: {} | null // when editing from History, pre-fills QuickAdd
historyExpanded: boolean  // collapsed/expanded state
historyFilter: string     // 'all' | 'bankLoan' | 'cash' | 'emi' | 'miscellaneous'
```

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Focus the amount input in QuickAdd
- `Escape`: Cancel edit mode (if editing a transaction)
- `Enter` (in amount input): Submit the form

## Mobile Optimizations

- Hero card: full-width, stacks vertically with Bank Loan/Cash below
- Type chips: smaller padding, wraps to second line if needed
- Amount + Date: side-by-side, Save full-width below
- History rows: compact padding, touch targets >= 44px
- No hover states on mobile — tap interactions only

## What's NOT Changing

- Firebase/Firestore backend and all CRUD operations
- PWA configuration and service worker
- Auth gate and password hashing
- Excel export logic (multi-sheet workbook)
- Amount-to-words conversion (Indian numbering)
- Indian currency formatting (₹ with lakh/crore system)
