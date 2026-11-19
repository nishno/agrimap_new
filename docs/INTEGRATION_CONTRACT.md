# AgriMap Pro — External Hardware Modules API & Data Access Contract

This document defines the Zero-Trust integration contract between **AgriMap Pro Core** and its three autonomous external hardware applications:
1. **App 1: Vision & NVR Hub** (`/vision.html` or configured standalone host)
2. **App 2: Drone 3D & Mission Control** (`/drone.html` or configured standalone host)
3. **App 3: GPS Fleet & IoT Telemetry Hub** (`/gps.html` or configured standalone host)

---

## 1. Security & Authentication Handshake (Zero-URL-Token)

Authorization tokens are **never** passed in URL query strings. Every launch uses a single-use, short-lived `launchCode` (60-second TTL) combined with an origin-verified `postMessage` handshake (or Local LAN server exchange when offline).

### 1.1 Safe Launch URL Parameters (Non-Sensitive Only)
```
?launchCode=<one_time_code>&module=<vision|drone|gps_iot>&serverMode=<CLOUD|LOCAL>&targetId=<camId|sectorId>&sectorId=<sectorId>&parentOrigin=<origin>
```

### 1.2 Handshake Protocol
1. **Embedded Iframe Mode**:
   - External app boots, reads `launchCode` & `parentOrigin` from URL.
   - External app sends `window.parent.postMessage({ type: 'AGRIMAP_BRIDGE_READY', launchCode, module }, parentOrigin)`.
   - Core verifies `event.origin` against `externalModulesConfig.ts` trusted origins, validates & consumes the single-use `launchCode`, and responds with `AGRIMAP_BRIDGE_INIT` containing `{ orgId, userId, serverMode, authToken, localSessionToken, localServerUrl, geoJsonContext, devices, cameras, workers, machinery }`.
2. **Dedicated Pop-Out Tab / Offline Local LAN Mode**:
   - External app redeems `launchCode` via `POST /api/bridge/exchange` against the configured Local Server (`192.168.x.x:3000`) or `window.opener` `postMessage` handshake.
   - Local Server validates the single-use code independently of Firebase Auth and issues an offline-capable `localSessionToken` scoped strictly to `orgId`.

### 1.3 Strict Tenant Fence
- Every Firestore query **must** include `where('organizationId', '==', orgId)`.
- External hardware apps **must never** access `accounts`, `transactions`, `payroll`, `inventoryItems`, or `purchaseOrders`.

---

## 2. Module Integration Matrix

| App | Read Permissions (Tenant-Fenced) | Write Permissions (Tenant-Fenced) | Launch Trigger |
| :--- | :--- | :--- | :--- |
| **1. Vision & NVR Hub** | `deviceRegistry` (`type == 'CAMERA'`), `plantationFeatures` (`type in ['area','boundary']`) | `deviceRegistry/{camId}` (`status`, `lastPing`), `systemNotifications` (motion/sector alerts) | Map camera marker, Camera Matrix button, Hardware Console |
| **2. Drone 3D & Mission** | `plantationFeatures` (`area`, `boundary`, `line`, `seedling`), `deviceRegistry` (`type == 'DRONE'`) | `agronomistDiagnoses` (post-flight AI findings), `plantationFeatures/{seedlingId}` (`healthStatus` / `condition`) | Dashboard Drone Mission, Map Planner Flight Path, Hardware Console |
| **3. GPS & IoT Hub** | `employees` (worker roster), `machinery` (fleet), `plantationFeatures` (`area`, `line`) | `liveTelemetry/{deviceId}` (5s GPS updates), `soilTelemetry` (pH/EC/moisture/weather) | Hardware Console GPS/Sensors/Weather tabs, Devices Map |

---

## 3. Core Passive Listeners
AgriMap Pro Core maintains passive listeners only for:
- `systemNotifications` (surfaced in the Notification Hub bell)
- `agronomistDiagnoses` (surfaced in Agronomy & Notification Hub)
- `deviceRegistry` (CRUD management in Hardware & Devices console)
