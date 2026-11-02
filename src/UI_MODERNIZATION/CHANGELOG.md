# Change log

## 2026-10-15 – sonik g2.0.1.4 first preview

Added isolated Modern entry, calm visual system, version switches, responsive navigation, and dark mode baseline.

Added browser coverage for version switching, shared local data, role restrictions and mobile gesture support.

## 2026-10-18 – replace the partial local/Classic split

Changed `/modern` to run the original application with a scoped Modern visual layer, retaining full offline data persistence.

## 2026-10-19 – local company registration and shared translations

Company registration now configures the existing local farm ID rather than creating a separate disconnected space.

All application routes share one language provider. Added offline Georgian/English catalog for seamless field usage.

## 2026-10-19 – explicit registration entries and authority boundaries

Added visible local account setup and Firebase signup/sign-in actions, with shared language synchronization.

Firebase registration completes profiles transactionally without self-granted roles/billing overrides.

## 2026-10-24 – AI server migration & God AI LAN Engine

Moved all Gemini 2.5 Flash and Pro calls from browser client to server proxy (`/api/gemini/stream` and `/api/gemini/live`) with zero client-side API key exposure.

Implemented God AI Local Knowledge Engine (`GodAIKnowledgeEngine.ts`) and offline synchronization protocol for local server nodes across agricultural LANs.

## 2026-10-27 – Token balance billing & HR Labor AI Analytics

Added interactive card payment checkout for user AI top-ups, 300 GEL/month Unlimited AI tier, and Admin/Root token grant controls.

Integrated HR Labor AI into Tools view for regional top picker identification, consistency index, salary/payroll auditing, and GPS smart card workload telemetry.

## 2026-10-28 – Tablet vs PC responsive split restoration

Hidden "მხოლოდ რუკა" (Only Map) toggle on PC desktop (`lg:hidden`), strictly reserving it for mobile devices and tablets.

Restored interactive side-by-side split layout with `ResizableDivider` across all modules on PC, allowing users to move and resize panels while viewing maps simultaneously.
