# System Review & Engineering Handover Protocol

## 1. Quality Assurance & Validation Checklist
- [x] **TypeScript Compliance:** `npm run lint` / `tsc --noEmit` must pass with 0 errors.
- [x] **Dev Build Compilation:** `compile_applet` must build production assets cleanly.
- [x] **Responsive Layout Verification:**
  - PC Desktop (`lg:`, width >= 1024px): Side-by-side resizable split views with divider drag handle. "Only Map" button must be hidden (`lg:hidden`).
  - Mobile & Tablet (`< lg`, width < 1024px): 100% full-screen single views with visible "მხოლოდ რუკა" (Only Map) toggle.
- [x] **Security & Secrets:** All AI calls routed through server-side proxy; no API keys exposed on client.
- [x] **Data Safety:** Zero destructive operations on user databases; IndexedDB delta logging intact.

## 2. Handover Contacts & Maintenance
- **Repository:** Main branch synchronized with Google AI Studio build sandbox.
- **Support & Issues:** Log via system Help Center or contact farm engineering root.
