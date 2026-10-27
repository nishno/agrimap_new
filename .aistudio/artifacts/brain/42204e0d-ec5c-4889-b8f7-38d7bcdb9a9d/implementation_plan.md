# AgriMap Pro: AI Infrastructure, Hybrid User Quota & Stripe Monetization Plan

## 1. Overview & Business Intent

This plan outlines the architecture and implementation to make AI tools fully functional, cost-controlled, and monetizable across all AgriMap Pro environments:
1. **AI Studio Dev/Preview Environment** (full-stack Node.js server container).
2. **Production Domain (`agrimap.pro`)** (Cloud Run container proxy + Firebase static CDN).
3. **Local Plantation Node** (offline-first Node.js server sink running on farm Wi-Fi).

### Selected User Configuration:
* **Access Model**: **Hybrid** — Each user receives a monthly free allowance based on their role (`Founder`, `Agronomist`, `Independent`, `Employee`, `Guest`), with pay-as-you-go credit balance top-ups once exhausted.
* **Production Proxy**: **Cloud Run / Node.js Container** linked directly to `agrimap.pro`.
* **Payment Processor**: **Stripe Checkout** with card billing and top-up packs.

---

## 2. Architecture & Domain-Specific Visual Constitution

### System Topology
```
┌────────────────────────────────────────────────────────────────────────┐
│                        AGRIMAP PRO CLIENT PWA                          │
│     (React + TypeScript + Tailwind CSS running in browser/mobile)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴───────────────────┐
               ▼                                        ▼
    [PRODUCTION / CLOUD RUN]                 [LOCAL PLANTATION NODE]
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ Cloud Run / Express Server    │        │ Local PC (node server.js)     │
│ - Reads secret GEMINI_API_KEY │        │ - Plantation Wi-Fi LAN        │
│ - Verifies user token & quota │        │ - Syncs to local disk backup  │
│ - Deducts Firestore balance   │        │ - Local autonomous core       │
└──────────────┬────────────────┘        └──────────────┬────────────────┘
               │                                        │
               └────────────────────┬───────────────────┘
                                    │
                                    ▼
                         [GOOGLE GEMINI 3.8 FLASH]
                 (with Autonomous Agri-Core Resilient Fallback)
```

### Visual Constitution & Anti-AI Slop Guidelines (per `frontend-design` & `saas_dashboard`):
* **No Generic Badges/Pill Enclosures**: AI usage metrics, quotas, and balances are displayed with clean tabular typography (`font-mono tabular-nums`) separated by subtle punctuation (`·` / `/`).
* **AI Credit Badge in Navigation**: Top header displays remaining credits (`💎 42 Credits · 8 Free Left`) with quick one-click trigger to the Top-Up Modal.
* **Top-Up Modal & Pack Cards**: High-density, professional pricing tiers (Starter 50 Credits = 10 GEL, Pro 200 Credits = 35 GEL, Plantation Enterprise 1,000 Credits = 150 GEL) with clear price-per-query breakdown.
* **Admin Quota Management**: In `AdminView.tsx` / `RootAdminView.tsx`, administrators can inspect any user's query count, override balances, grant complimentary quotas, or set custom billing rates.

---

## 3. Data Model & Firestore Schema

### User Schema Extensions (`src/types.ts` & Firestore `users/{userId}`)
```typescript
export interface UserAiQuota {
    // Balances
    aiCreditsBalance: number;            // Current purchased credit balance (e.g. 50 credits)
    monthlyFreeTierTotal: number;        // Free queries granted per calendar month (e.g. 20 for Agronomist)
    monthlyFreeTierUsed: number;         // Free queries consumed this month
    lastResetMonth: string;              // Format 'YYYY-MM' to auto-reset free tier on 1st of month
    
    // Usage Telemetry
    totalQueriesAllTime: number;         // Lifetime query count
    totalTokensUsedAllTime: number;      // Lifetime token consumption
    
    // Stripe Billing Profile
    stripeCustomerId?: string;           // Customer ID in Stripe
    hasPaymentMethodLinked?: boolean;    // Card linked for 1-click top-up
    autoRechargeThreshold?: number;      // Auto top-up when balance drops below X (optional)
    autoRechargeAmountGel?: number;      // Amount to charge on auto top-up
}

export interface AiUsageRecord {
    id: string;
    userId: string;
    timestamp: string;
    module: 'disease_diagnosis' | 'soil_analysis' | 'harvest_sheet' | 'agribusiness' | 'microclimate' | 'general_chat';
    modelUsed: string;                   // 'gemini-3.8-flash' or 'autonomous-agri-core'
    tokensEstimated: number;
    creditsDeducted: number;
    remainingBalance: number;
    status: 'success' | 'fallback';
}

export interface AiCreditPack {
    id: string;
    name: string;
    credits: number;
    priceGel: number;
    priceUsd: number;
    recommendedRole: string;
    isPopular?: boolean;
}
```

### Role-Based Free Monthly Allowances
| User Role | Monthly Free Queries | Query Deductions | Top-Up Privilege |
| :--- | :--- | :--- | :--- |
| **Founder / Co-Founder** | Unlimited (9,999) | 0 credits | Free |
| **Admin / Field Manager** | 100 free / mo | 1 credit after free | 1-Click Top-Up |
| **Agronomist** | 50 free / mo | 1 credit after free | 1-Click Top-Up |
| **Independent / Buyer** | 15 free / mo | 1 credit after free | 1-Click Top-Up |
| **Employee** | 10 free / mo | 1 credit after free | Admin Funded |
| **Guest** | 3 trial queries | Requires signup | Blocked until auth |

---

## 4. Hybrid Monetization & Usage Metering Mechanism

### Workflow:
1. **Pre-Flight Quota Check**:
   * Before sending a prompt to `/api/gemini/call`, `geminiService.ts` checks:
     * Does the user have free monthly allowance remaining (`monthlyFreeTierUsed < monthlyFreeTierTotal`)?
     * If yes: increment `monthlyFreeTierUsed` and proceed (0 balance deducted).
     * If no: does the user have `aiCreditsBalance >= 1`?
     * If yes: deduct 1 credit from `aiCreditsBalance` and proceed.
     * If no: prompt the **AI Balance Top-Up Modal** with Stripe payment options!
2. **Server-Side Enforcement**:
   * `/api/gemini/call` verifies the user's authentication token (or guest session limit), records the `AiUsageRecord` in Firestore, and updates user metrics atomically.
3. **Instant Autonomous Fallback**:
   * If Google Gemini API is temporarily offline, out of credits, or returns an error, the Autonomous Knowledge Core fulfills the request at 0 credit penalty or 50% discount.

---

## 5. Stripe Checkout Integration & Top-Up Modal

### Stripe Top-Up Packs:
* **Micro Pack**: 30 Credits for **6 GEL** (~$2.20 USD) — Ideal for occasional leaf diagnostics.
* **Standard Pack**: 100 Credits for **18 GEL** (~$6.70 USD) — Popular with independent agronomists.
* **Pro Plantation Pack**: 500 Credits for **75 GEL** (~$28.00 USD) — Suitable for daily harvest sheet extractions.

### Payment Flow:
1. User clicks **"Top Up AI Balance"** in the top bar or when reaching quota limit.
2. User selects a pack.
3. Client calls `/api/stripe/create-checkout-session` with `userId` and `packId`.
4. Stripe Checkout handles card processing securely.
5. Stripe Webhook (`/api/stripe/webhook`) credits `aiCreditsBalance` in Firestore immediately.
6. User UI updates live without needing a page refresh.

---

## 6. Production Setup for `agrimap.pro` & Cloud Run

### Deployment Guide:
1. **Containerize Server**:
   * `server.ts` is already an Express + Vite full-stack server ready for Google Cloud Run or Docker.
2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy agrimap-core \
     --source . \
     --region europe-west2 \
     --set-env-vars "NODE_ENV=production,PORT=3000" \
     --set-secrets "GEMINI_API_KEY=gemini-key-secret:latest,STRIPE_SECRET_KEY=stripe-key-secret:latest" \
     --allow-unauthenticated
   ```
3. **Map Domain in Firebase Hosting (`firebase.json`)**:
   * Route `/api/**` to Cloud Run, while static assets remain lightning-fast on the global CDN:
   ```json
   {
     "hosting": {
       "rewrites": [
         { "source": "/api/**", "run": { "serviceId": "agrimap-core", "region": "europe-west2" } },
         { "source": "**", "destination": "/index.html" }
       ]
     }
   }
   ```
4. **Local Server Node**:
   * The local computer runs `node server.js` with its own `GEMINI_API_KEY` or falls back to the autonomous offline core on local Wi-Fi.

---

## 7. Step-by-Step Implementation Tasks

### Step 1: User Profile & Firestore Quota Schema
* Update `src/types.ts` to include `UserAiQuota`, `AiUsageRecord`, and `AiCreditPack`.
* Add helper `getEffectiveUserAiQuota(user)` to calculate remaining free and paid queries.

### Step 2: Quota Metering & Pre-Flight Gate in `src/services/geminiService.ts`
* Add `checkAndDeductAiCredit(userId, queryType)` before dispatching API calls.
* Add event listener `agrimap:open_ai_topup_modal` when balance reaches zero.

### Step 3: AI Balance Badge & Top-Up Modal Component
* Create `src/components/AiBalanceTopUpModal.tsx`:
  * Tabular balance display (`Free remaining`, `Paid credits`, `Total queries`).
  * Pack selector with instant checkout simulation / real Stripe link.
  * Direct card top-up simulation for immediate testing.
* Embed AI credit status pill/counter in `src/components/Header.tsx` and `src/components/GlobalAssistantPanel.tsx`.

### Step 4: Admin Management in `AdminView.tsx`
* Provide admin controls to inspect any user's AI quota, reset monthly allowances, and add manual credits.

### Step 5: Verification & Dev Server Build
* Test client balance deductions, top-up pack additions, autonomous fallback behavior, and full build compilation.
