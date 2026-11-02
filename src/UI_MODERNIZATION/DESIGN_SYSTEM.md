# AgriMap Pro — Design System & Visual Guidelines

## 1. Design Philosophy
AgriMap Pro utilizes a clean, modern, high-contrast visual design built on Tailwind CSS. It is engineered for harsh outdoor sunlight conditions (for tablet users in orchards) as well as dense information dashboards for office PC displays.

## 2. Color Palette & Semantic Tokens
- **Primary / Brand Accent:**
  - `#3b36db` (Indigo-600 / Field Command Accent): Action buttons, active badges, progress bars.
  - `#059669` / `#10b981` (Emerald-600 / Agro Accent): Successful yields, health indicators, soil vitality.
- **Surface & Backgrounds:**
  - `#ffffff`: Primary cards and content panels.
  - `#f8fafc` / `#f1f5f9` (Slate-50 / Slate-100): Outer app view backgrounds, tab rails.
  - `#0f172a` (Slate-900 / Deep Navy): Master headers, high-importance telemetry summaries, dark badges.
- **Alerts & Status Tokens:**
  - Green (`emerald`): Active harvest, normal sensor reading, verified employee.
  - Blue (`blue`): Planned tasks, in-transit fleet, Google Chat spaces.
  - Amber (`amber`): Low stock alert, weather anomaly, pending weigh-in.
  - Red (`rose`): Disease detected, overdue milestone, tamper alert.

## 3. Typography & Hierarchy
- **Font Stack:** Clean sans-serif system fonts with Georgian unicode glyph support (Noto Sans Georgian, Arial, system-ui).
- **Headings:**
  - `text-2xl font-black italic tracking-tighter uppercase`: Module titles (e.g., FIELD COMMAND, HARVESTING, PLANNER).
  - `text-sm font-black uppercase tracking-wider`: Section headers & card labels.
  - `text-[10px] font-bold text-slate-400 uppercase tracking-widest`: Meta tags, timestamps, subtitles.
- **Numbers & Telemetry:**
  - Monospace or bold tabular figures for harvest kilograms, GPS coordinates, currency amounts (e.g., `font-mono font-black`).

## 4. Layout & Responsive Breakpoints
- **Mobile & Tablet Viewport (`< 1024px`):**
  - Full-width stacked viewports.
  - Floating action buttons placed in thumb-reachable positions (bottom-right or top-right).
  - "მხოლოდ რუკა" (Only Map) and "პანელზე დაბრუნება" (Back to Panel) switcher buttons for rapid 1-tap switching.
- **Desktop PC Viewport (`>= 1024px`, Tailwind `lg:`):**
  - Multi-column side-by-side split view.
  - Left column: Dynamic resizable control panel with `minSize: 320px`, `maxSize: 850px`.
  - Center: `ResizableDivider` handle (`cursor-col-resize`, indigo hover glow, live size tooltip).
  - Right column: Interactive Leaflet map container stretching to fill remaining space (`flex-1 min-w-0`).
  - "Only Map" buttons are hidden via `lg:hidden`.

## 5. Components & Micro-interactions
- **Buttons:** Rounded-xl or 2xl, subtle shadow, active scale effect (`active:scale-95 transition-all`).
- **Modals:** Centered backdrop blur (`backdrop-blur-xs`), deep drop shadows (`shadow-2xl`), accessible Escape key and click-outside dismissal.
- **Toast Notifications:** Sonner toast manager with localized Georgian/English feedback for every network or save operation.
