# AgriMap Pro — Local Runtime & Offline LAN Architecture

## 1. Operating Principles
Plantations in rural areas (e.g., Guria, Samegrelo, Kakheti) regularly experience cellular outages and complete loss of internet connectivity during operations.

To guarantee zero operational downtime:
1. Every device runs a local storage cache backed by IndexedDB and `localStorage`.
2. A local edge server (`local-server-template.js`) can run on any farm PC on the local LAN.
3. Tablets connect directly to the local server over Wi-Fi, completely independent of the global internet.

---

## 2. Local Node Architecture
```
  [ Worker Tablet A ]       [ Worker Tablet B ]       [ Weigher Scale PC ]
          │                         │                          │
          └─────────────────────────┼──────────────────────────┘
                                    │ Local Wi-Fi / LAN
                                    ▼
                     [ Local Plantation Server Node ]
                     (Node.js / Express on Port 8080)
                                    │
                                    ├── SQLite / JSON Cache Engine
                                    ├── God AI Offline Knowledge Store
                                    └── Bi-directional Sync Manager
                                    │
                         (When Internet Restores)
                                    ▼
                      [ Cloud Firebase / Production ]
```

---

## 3. Running the Local Server Node
To launch the offline plantation hub on a local machine:
```bash
node local-server-template.js
```
The server will bind to `0.0.0.0:8080` (or `PORT=3000`).
The UI will display a **LOCAL NODE** status indicator in the top header bar with current cache health.

---

## 4. God AI Offline Knowledge Engine
- **Engine Source:** `src/new_engine/ai/GodAIKnowledgeEngine.ts`
- **Console Modal:** `src/new_engine/ui/GodAIIntelligenceHubModal.tsx`
- **Functionality:**
  - Consolidates agronomic diagnoses, weather anomalies, stock deductions, and task histories.
  - Generates unified snapshots (`god_ai_offline_knowledge_YYYY-MM-DD.json`).
  - Restricted to Root and System Administrator roles to safeguard trade secrets.
  - Provides instant fallback responses for field tablets when WAN connectivity is severed.

---

## 5. Offline Data Reconciliation & Conflict Resolution
- Every data modification creates an immutable sequence-stamped delta log.
- Upon reconnection with the cloud, `SyncManager.ts` compares timestamp sequences and merges deltas with zero loss of weigh-in records or task completions.
