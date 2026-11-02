# Architectural Decision Records (ADR) — UI Modernization

## ADR 001: Scoped Modern Visual Layer Over Full Rewrite
- **Status:** Accepted (2026-10-18)
- **Context:** The application contains deep enterprise logic across harvesting, accounting, GIS polygon drawing, and offline sync. A full code rewrite would introduce high risk of breaking data integrity in active plantations.
- **Decision:** Introduce a modern, scoped presentation layer while preserving the underlying robust state handlers, IndexedDB tables, and Leaflet safety bridges.
- **Consequences:** 
  - Zero regression in calculation formulas (OPEX, harvest net weights, payroll).
  - Faster UI iterations with consistent design tokens.

## ADR 002: Dual-Mode Device Strategy (Tablet Single-View vs PC Resizable Split)
- **Status:** Accepted (2026-10-28)
- **Context:** Tablets used in orchard fields have limited screen space (7-10 inches) and are used with gloves, whereas desktop PC operators in farm administration offices use 24-32 inch monitors with mice.
- **Decision:**
  - **PC Desktop (`lg:`, width >= 1024px):** Force simultaneous side-by-side rendering of both control panel and interactive map, connected by an interactive `ResizableDivider` with pixel indicator and localStorage memory. Hide the "მხოლოდ რუკა" (Only Map) toggle on PC.
  - **Mobile / Tablet (`< lg`, width < 1024px):** Render 100% full-screen dedicated single views, preserving the "მხოლოდ რუკა" / "პანელზე დაბრუნება" switcher button.
- **Consequences:** Eliminates UI clutter on PC while preserving high-contrast, distraction-free touch interaction in the field.

## ADR 003: Server-Side Gemini API Proxy & Zero Client Secrets
- **Status:** Accepted (2026-10-24)
- **Context:** Running Gemini API calls directly from client browsers exposed API keys and triggered browser proxy errors (`API_KEY_INVALID` / CORS issues) when deployed outside Google AI Studio.
- **Decision:** Migrate all Gemini calls to server proxy routes in `server.ts`:
  - `POST /api/gemini/generate`: Standard single-turn completions.
  - `POST /api/gemini/stream`: Server-Sent Events (SSE) streaming for real-time natural language answers.
  - `WebSocket /api/gemini/live`: Live two-way voice/multimodal sessions.
- **Consequences:** Unlocks AI assistance for all registered users, regardless of browser or network environment, with zero API key leaks.

## ADR 004: God AI Offline LAN Aggregation Engine
- **Status:** Accepted (2026-10-27)
- **Context:** Large plantations frequently lose WAN internet connectivity during harvest seasons, yet require continuous agronomic analytics and cross-module anomaly detection.
- **Decision:** Implement `GodAIKnowledgeEngine.ts` and `local-server-template.js` to collect, index, and cache agro-intelligence, laboratory diagnoses, and yield records into a local JSON store for LAN distribution.
- **Consequences:** Remote tablets can query local intelligence with sub-millisecond latency without active cloud connectivity.

## ADR 005: Hybrid Token Billing with Unlimited Monthly Tier
- **Status:** Accepted (2026-10-27)
- **Context:** Different farm sizes require flexible AI billing: small family farms need pay-as-you-go token purchases, while enterprise plantations need predictable monthly billing.
- **Decision:** Implement a hybrid token system with 300 GEL/month Unlimited AI tier, card checkout simulation, and master Root/Admin token grant overrides.
- **Consequences:** Transparent cost management for farms and complete administrative authority for system owners.
