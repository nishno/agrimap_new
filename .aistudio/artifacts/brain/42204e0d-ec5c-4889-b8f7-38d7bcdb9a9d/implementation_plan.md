# AgriMap Pro: Full Application Modernization & Translation Plan (sonik G2.0.1.4)

---

## 1. Deep Branch Analysis: `main` vs `demo-preview`

Based on our analysis of your GitHub repository (`https://github.com/nishno/arimap-pro`), here is how the branches relate:

| Dimension | `main` Branch | `demo-preview` Branch (Codex) | Combined `sonik G2.0.1.4` Target |
| :--- | :--- | :--- | :--- |
| **Architecture** | Classic comprehensive multi-panel engine | Clean modern grouped UI layer + local runtime | **Dual-Engine Unified System** |
| **Translations** | Key-based flat translation (`translations.ts`) | **15,057+ key pure dictionary** (`src/i18n/ka.json` 2MB+) with polish regex | **Unified Pure i18n Engine** across all modules |
| **Visual Style** | High-density multi-window draggable UI | Calm, minimalist card-based grouping with zero visual noise | **Live Switcher: Classic ↔ Modern** |
| **Modules Covered** | 12 full modules with complete operational tools | Modern preview frame with sample/local adapters | **Whole-Application Coverage** (All 12 modules modern-ready) |
| **Regional Mode** | Manual currency toggle (USD/GEL) | Dedicated Georgian vs Global region models (`src/billing/locale.ts`) | **Header Region Engine** (🇬🇪 GE vs 🌐 Global) |

---

## 2. Core Recommendations for the Best UI & System

### Recommendation 1: Direct Version Switcher on Logo Badge (User Screenshot Request)
* **Current Behavior**: Clicking `sonik G2.0.1.4` under the AgriMap logo in the sidebar opened the Startup/Homepage showcase.
* **New Behavior**: Clicking `sonik G2.0.1.4` directly switches the **entire application** between:
  * **sonik G2.0.1.4 Modern**: The calm, minimalist, grouped UI with sidebar navigation, clean cards, and unified modules.
  * **sonik G2.0.1.3 Classic**: The full-density, movable, resizable multi-panel layout for desktop power users.
* A clear tooltip, pulse indicator, and instant toast notification confirm the switch. Preference is persisted in `localStorage`.

### Recommendation 2: Whole-Application Modernization (Not Just a Demo Preview)
* Extend `ModernApp.tsx` so that it doesn't just preview static data, but provides **full operational access** across all 12 modules:
  1. **Overview & Dashboard**: Live KPIs, field summary, recent harvests, weather badge.
  2. **Fields & GIS Planning**: Parcel polygon inspector, seedling density, boundary drawing.
  3. **Harvesting & Scale Station**: Active weighing sessions, box barcodes, cold storage, and product returns.
  4. **Work & Tasks**: Field task dispatch, employee assignments, daily logs.
  5. **Inventory & Warehouse**: Stock levels, reorders, agrochemical batches, machinery fleet.
  6. **Weather & Devices**: Live microclimate telemetry, NVR camera streams, hardware sensors.
  7. **Agro Marketplace**: B2B listings, fresh produce bids, supplier directory.
  8. **AI Agro Analyst**: Soil N-P-K clinic, leaf disease scanner, agronomic feeding plans.
  9. **Communication & Channels**: Team chat spaces, video calls, operational broadcast.
  10. **Reports & Accounting**: Daily picker payroll, wage leaderboards, transaction ledger.
  11. **Team & HR**: Employee directory, picker consistency analysis, GPS card tracking.
  12. **Plans & Token Subscriptions**: AI credit packs, 300₾/mo Unlimited tier, card checkout.

### Recommendation 3: Global Pure Translation Unification (`src/i18n/`)
* Mount the Codex `i18n` translation runtime (`runtime.ts`, `ka.json`, `en.json`) into `LanguageContext.tsx`.
* **Zero Mixed Words**: When Georgian (`ka`) is active, all system terms, widget headers, button actions, and tooltips are resolved through `translateUi()` to eliminate mixed English words.
* Include regional formatting: Georgian Lari (`₾ GEL`), hectares (`ჰა`), and local date formats.

### Recommendation 4: Shared State & Bidirectional Synchronization
* Ensure that whether a user logs a harvest in Modern or Classic mode:
  * The record is written to the same IndexedDB / Firestore collection.
  * The local LAN server sync queue is updated.
  * AI token usage deductions apply consistently.
  * Users can switch back and forth at any time without reload or session loss.

---

## 3. Step-by-Step Implementation Roadmap

```
Step 1: Wire Sidebar Version Badge as Instant Switcher
├── Update src/components/Sidebar.tsx so clicking `sonik G2.0.1.4` toggles UI version
├── Update src/components/Header.tsx mobile logo version trigger
└── Ensure toast and persistent storage reflect the active version

Step 2: Whole-Application Modern Module Bridge
├── Connect ModernApp.tsx to live FirebaseDataContext and storageService
├── Allow every module in ModernApp navigation to render full live operational tools
└── Wire embedded action triggers (Product Return, Scale Weigh-In, Top Pickers, AI Clinic)

Step 3: Global i18n Translation Engine Integration
├── Bridge LanguageContext.tsx `t()` function to consult Codex `ka.json` and `en.json`
├── Eliminate English fallback placeholders for all common Georgian terms
└── Test Georgian purity across Dashboard, Harvesting, Stock, Agronomy, and Accounts

Step 4: Regional Mode Integration (Georgia 🇬🇪 vs Global 🌐)
├── Wire `region` state from `LanguageContext` into billing, currency, and map metrics
└── Apply Georgian agricultural defaults (Guria/Ozurgeti pilot coordinates, GEL, ha)

Step 5: Verification & Quality Assurance
├── Run `lint_applet` (tsc --noEmit)
├── Run `compile_applet` (production build verification)
└── Test live switching between Classic and Modern modes on both desktop and tablet
```

---

## 4. Next Steps

Review this plan and recommendations. Once confirmed, we will implement the sidebar version toggle, whole-application modern module bridge, and global pure translation engine!
