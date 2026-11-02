# AgriMap Pro — UI Modernization & System User Manual (SOP)

## 1. Overview & Purpose
AgriMap Pro is an enterprise precision agriculture and operational farm management system tailored for commercial orchards, berry farms, and multi-region plantation networks. 

This modernization initiative establishes a unified, responsive visual and architectural layer that operates seamlessly across:
1. **Cloud Mode (AI Studio / Production Firebase):** Global multi-user collaboration, real-time sync, and Gemini 2.5 server-side intelligence.
2. **Local Plantation LAN Mode (`local-server-template.js`):** Offline edge server running inside farm headquarters with zero internet dependency, broadcasting cached farm maps and God AI agronomic knowledge to worker tablets.
3. **Hybrid Cross-Device Responsive Layout:** Distinct layouts optimized for high-resolution desktop PC workstations (interactive side-by-side resizable split views) versus field tablets / smartphones (100% full-screen dedicated single views with instant map toggling).

---

## 2. Standard Operating Procedures (SOP) by Module

### 2.1 AI Agro Analytics & Diagnostics (`AiAnalystView`)
- **Purpose:** Analyze soil composition (pH, N, P, K), historical regional climate patterns, and crop disease images using Google Gemini 2.5.
- **Desktop Workflow:**
  1. Open the **AI აგრო ანალიტიკა** module from the left sidebar.
  2. The control form appears on the left; the interactive plantation map appears on the right.
  3. Drag the center divider handle left or right to customize the panel width (from 340px to 800px).
  4. Enter soil metrics or click **Find on Map** / **Pick from Map** to load field coordinates.
  5. Click **Run Analysis** to generate instant recommendations and nutrition plans.
- **Tablet / Mobile Workflow:**
  1. Use the **მხოლოდ რუკა** (Only Map) button in the top navigation bar to inspect parcel boundaries.
  2. Tap **პანელზე დაბრუნება** (Back to Panel) to return to data input and disease diagnosis.

### 2.2 Harvest Management & Yield Audit (`HarvestDashboard`)
- **Purpose:** Track real-time picker weigh-ins, box counts, gross vs net weights, worker payouts, and cold-chain storage.
- **SOP:**
  1. Launch an active harvest session by clicking **Start New Session** or selecting an ongoing harvest.
  2. On PC, monitor live collector statistics alongside the geo-fenced plantation area.
  3. Use the **მოსავლის ყუთების QR** generator to print or scan barcodes attached to harvest crates.
  4. Perform weigh station entries with gross tare deduction and automatic worker matching.
  5. Close session to push finalized yields into inventory and archive session history to tamper-proof logs.

### 2.3 Field Command & Workforce Orchestration (`TasksAndWorksView`)
- **Purpose:** Assign agro-technical operations (spraying, pruning, weeding, fertilization, irrigation) to workers and machinery fleets.
- **SOP:**
  1. Select a target date using the calendar picker.
  2. Review universal economic summaries (salaries, equipment fuel consumption, material deductions).
  3. Map operational logs directly to polygon sectors with real-time GPS boundary verification.
  4. On PC, resize the Field Command terminal to inspect worker attendance alongside plantation zones.

### 2.4 Communication Hub & Google Workspace (`CommunicationHubPanel`)
- **Purpose:** Internal farm logistics messaging, regional marketplace discussions, and Google Workspace integrations (Google Chat spaces & Google Meet sessions).
- **SOP:**
  1. Connect Google Workspace via OAuth to sync spaces and start 1-click video calls with field agronomists.
  2. Switch between **Google Chat**, **Google Meet**, **Forum & Hub**, and **Partners Find**.
  3. On PC, enjoy side-by-side chat threads with the partner geolocation map.

### 2.5 Offline Local LAN Node & God AI Console
- **Purpose:** Autonomous field operation without active internet connection.
- **SOP:**
  1. Start the local server daemon: `node local-server-template.js` on the plantation computer (Port 8080/3000).
  2. Worker tablets on the plantation Wi-Fi automatically discover the local node.
  3. All local analyses, agronomic diagnostics, and harvest logs are consolidated into the encrypted God AI offline knowledge file (`god_ai_offline_knowledge_*.json`).
  4. System Admin / Root users can inspect system health, trigger manual sync pushes, or export local databases.

---

## 3. User Roles & Permission Hierarchy
1. **Super Admin / Root:**
   - Full master governance over all companies, system configurations, and God AI intelligence console.
   - Unrestricted capability to grant AI tokens and adjust subscription limits.
2. **Company Administrator (Manager):**
   - Manage plantation sectors, invite employees, manage stock inventory, and purchase AI top-ups.
3. **Agronomist / Field Inspector:**
   - Run AI clinical lab tests, create fertilizer nutrition recipes, and log disease treatments.
4. **Weigher / Collector:**
   - Register harvest entries, scan QR codes on boxes, and track worker piece-rate tare deductions.
5. **Worker / Picker:**
   - Clock in via GPS smart cards, log collected crates, and view individual daily earnings.

---

## 4. Maintenance & Safe Update Guidelines
- All major functional additions should be prototyped in `src/features/` or verified with `compile_applet` before merging.
- Any changes affecting Firestore security rules must be validated against `firestore.rules`.
- UI responsiveness must always maintain the `isDesktop` separation: side-by-side split panels on PC (`lg:`), dedicated full-screen single views on mobile/tablets.
