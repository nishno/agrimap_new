# AgriMap Pro — Registration & Authority Boundaries

## 1. Dual Identity Management
AgriMap Pro supports two complementary authentication models:
1. **Local Farm Account:**
   - Instant offline onboarding directly against the local SQLite / IndexedDB store without requiring an internet connection or credit card.
   - Assigned to the active farm ID with default worker/collector permissions.
2. **Cloud Firebase Account:**
   - Secure Firebase Authentication backed by Firestore collections (`users`, `organizations`, `memberships`).
   - Enables multi-device synchronization, Google Workspace OAuth, and global marketplace trading.

---

## 2. Role-Based Access Control (RBAC) Boundaries
Permissions are strictly validated on both client components and `firestore.rules`:
- **root / system_admin:**
  - Unrestricted access to all companies and global settings.
  - Exclusive access to God AI Intelligence Console and system logs.
  - Ability to grant unlimited AI tokens to any farm or user.
- **admin / manager:**
  - Company organization owners.
  - Full CRUD on plantations, crop layers, inventory stock, machinery, and payroll.
  - Authority to purchase AI subscription plans or top up token balances.
- **agronomist:**
  - Clinical lab analyses, soil reports, disease diagnostics, and nutrition plans.
- **weigher:**
  - Operational harvest logging, crate barcode scanning, and tare balance.
- **worker:**
  - View personal assigned tasks, clock in via GPS badges, and check daily piece-rate earnings.

---

## 3. AI Token Balance & Subscription Tiers
- **Modal Component:** `src/components/AiBalanceTopUpModal.tsx`
- **Tiers:**
  - **Pay-as-you-go:** Individual token packs for small farms (card checkout).
  - **Premium Monthly:** 300 GEL / month for unlimited AI diagnostics, climate modeling, and cross-module anomaly audits.
  - **Admin Grants:** Master root bypass allowing administrators to credit custom token amounts directly to any user profile.
