# AgriMap Pro — Local Server Deployment & Operation Guide

## 1. Introduction
The AgriMap Pro Local Server Node provides an on-premises runtime environment for agricultural installations. It allows an entire farm or cooperative to run with high availability and speed, even if cellular and internet links fail.

## 2. Requirements & Setup
- **Hardware:** Standard mini-PC, Raspberry Pi 4/5, or farm office desktop (Linux / Windows / macOS).
- **Runtime:** Node.js v18+ or Bun.
- **Port:** Default is `8080` (can be configured via `PORT` environment variable).

## 3. Starting the Local Node
```bash
# From workspace root
node local-server-template.js
```
The server will output:
```
[AgriMap Local Node] Initializing local database...
[AgriMap Local Node] LAN Server running at http://0.0.0.0:8080
[AgriMap Local Node] God AI Knowledge Hub connected.
```

## 4. Endpoints Provided
- `GET /health`: Health and sync status.
- `GET /api/local/plantation`: Local parcel boundaries, varieties, and sectors.
- `POST /api/local/harvest/entry`: Instant offline weigh station submission.
- `GET /api/god-ai/knowledge`: Encrypted local agronomy and operational intelligence.
- `POST /api/sync/push`: Bi-directional reconciliation with cloud Firebase when internet resumes.
