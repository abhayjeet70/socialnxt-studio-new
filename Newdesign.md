# SocialNxt Dashboard — Design Spec
*All text, labels, numbers, and data below are unchanged from the current product. This file only specifies visual treatment: color, type, spacing, and placement.*

## 1. Content inventory (unchanged — do not alter)

**Workspace**
- Org name: `sample_agency`
- User: `abhayjeet` · role `Employee`
- Search placeholder: `Search clients, tasks, proposals...`

**Sidebar nav (in order)**
`Dashboard` · `Clients` · `Content Calendar` · `Tasks` · `Team` · `Meetings` · `Deals` · `Proposals` · `Client Issues` · `Reports` · `Settings`

**Header copy**
- `Good morning, abhayjeet`
- `Here's what's happening across your agency today.`

**Stat cards (label → number → caption)**
| Label | Number | Caption |
|---|---|---|
| Connected Accounts | 0 | Social platforms |
| Total Posts | 5 | All time |
| Scheduled | 2 | Upcoming |
| Posts Published | 2 | Live |
| Drafts | 0 | In progress |
| Pending Approvals | 0 | Needs review |

**Monthly Revenue**
- Title: `Monthly Revenue`
- Subtitle: `Last 6 months (in ₹ thousands)`
- Delta badge: `+18.2%`
- X-axis: `Feb, Mar, Apr, May, Jun, Jul`

**Platform Distribution**
| Platform | Value |
|---|---|
| LinkedIn | 40% |
| Instagram | 40% |
| Facebook | 20% |

Nothing above changes in this spec — only how it's drawn on screen.

## 2. Color

| Token | Hex | Applied to |
|---|---|---|
| `--surface` | `#FFFFFF` | Sidebar, cards |
| `--page-bg` | `#F5F6FA` | Main canvas |
| `--accent` | `#4C4DDC` | Active nav pill, avatar circle, revenue line, focus states |
| `--accent-tint` | `#E8E8FC` | Active nav background |
| `--text-primary` | `#1A1D29` | Headings, numbers, nav labels (active) |
| `--text-secondary` | `#8A8DA6` | Captions, subtitles, inactive nav |
| `--border` | `#EDEEF3` | Card/table hairlines, search bar border |
| `--success` | `#1FAA59` | Positive captions, revenue delta badge |
| `--danger` | `#E5484D` | Reserved for negative/alert states only |
| `--warning` | `#F5A623` | Scheduled card accent |

**Per-stat-card left-border accent** (identity color only, not a fill):
- Connected Accounts → `#4C4DDC`
- Total Posts → `#1FAA59`
- Scheduled → `#F5A623`
- Posts Published → `#E5484D`
- Drafts → `#8A6FE0`
- Pending Approvals → `#E5484D`

**Platform dot colors** (brand-accurate, not palette-generic):
- LinkedIn → `#0A66C2`
- Instagram → `#C1367B`
- Facebook → `#1877F2`

## 3. Typography

Font family: `Inter` (or existing product font) — weights 400 / 500 / 600 / 700 only.

| Element | Size | Weight | Color |
|---|---|---|---|
| Greeting (`Good morning, abhayjeet`) | 21px | 700 | text-primary |
| Subgreeting | 13px | 400 | text-secondary |
| Org name (sidebar) | 14px | 700 | text-primary |
| Nav label | 13px | 600 (active) / 400 (inactive) | accent (active) / text-secondary (inactive) |
| Card label (e.g. "Total Posts") | 11px | 500 | text-secondary |
| Card number | 24px | 700 | text-primary |
| Card caption (e.g. "All time") | 10.5px | 400 | success |
| Section title (e.g. "Monthly Revenue") | 14.5px | 600 | text-primary |
| Section subtitle | 11.5px | 400 | text-secondary |
| User name (header) | 12.5px | 600 | text-primary |
| User role | 10.5px | 400 | text-secondary |

## 4. Layout & placement

```
┌─────────────┬───────────────────────────────────────────────┐
│  Sidebar    │  Search bar (left) ─────── bell · avatar (right)│
│  186px      ├───────────────────────────────────────────────┤
│  white bg   │  Good morning, abhayjeet                        │
│             │  Here's what's happening across your agency...  │
│  org id     ├───────────────────────────────────────────────┤
│  nav list   │  [6 stat cards, equal width, single row]        │
│  (11 items) ├─────────────────────────────┬─────────────────┤
│             │  Monthly Revenue (1.6fr)     │ Platform Dist.  │
│             │  line chart, Feb–Jul         │ (1fr) bar list  │
└─────────────┴─────────────────────────────┴─────────────────┘
```

- Sidebar: fixed width, `18px 12px` padding, nav items stacked with `2px` gap, each item `9px 10px` padding, `10px` corner radius.
- Active nav item: full-width tinted pill (`--accent-tint` bg), icon + label in `--accent`. No icon circle, no bold fill block.
- Main content: `22px 24px` outer padding.
- Stat card row: `grid-template-columns: repeat(6, 1fr)`, `12px` gap, each card `14px 12px` padding, `12px` radius, `4px` solid left border (identity color from §2), no icon.
- Revenue + Platform row: `1.6fr / 1fr` grid, `14px` gap, both cards `18px` padding, `12px` radius.
- Platform distribution: horizontal bar rows (not a donut) — dot + label left, percentage right, `6px` track height, `3px` radius, one row per platform in the same top-to-bottom order as today (LinkedIn, Instagram, Facebook).

## 5. Component rules

- **Cards**: white surface, no shadow (or `0 1px 2px rgba(0,0,0,0.04)` max), `12px` radius, no border except the left accent.
- **Search bar**: pill shape (`999px` radius), `1px` border in `--border`, search icon + placeholder in `--text-secondary`.
- **Avatar**: `28px` circle, solid `--accent` fill, initial in white, `600` weight.
- **Delta badge** (`+18.2%`): pill shape, `--page-bg` background, `--success` text, `4px 10px` padding.
- **Nav icons**: Tabler outline set, `16px`, inherit current text color (no separate icon color system).

## 6. What NOT to change

- Do not reorder, rename, or remove any nav item, card label, caption, or data value listed in §1.
- Do not introduce new metrics, new chart series, or new platforms — restyle only.
- Do not change the underlying chart data (Feb–Jul revenue trend shape, 40/40/20 platform split).