# AgriMap Pro — Localization & Language Architecture

## 1. Dual-Language Requirement
AgriMap Pro is fully bilingual:
- **ქართული (ka):** Primary operating language for field workers, agronomists, and Georgian agricultural enterprises.
- **English (en):** Primary operating language for international partners, export buyers, and global trade corridors.

---

## 2. Shared Language Context
- **Provider:** `src/contexts/LanguageContext.tsx`
- **Hook:** `useLanguage()`
- **Stored Preference:** `localStorage.getItem('agri-app-lang')` ('ka' | 'en')
- **Language Switcher:** Located in the top system header (`GE / EN` toggle).

---

## 3. Translation Dictionary Architecture
Translations are defined in `src/translations.ts` and structured hierarchically:
- `auth.*`: Login, registration, role selection, pin codes.
- `harvest.*`: Weigh stations, pickers, boxes, gross/net weight, cold store.
- `ai.*`: Diagnostics, soil nutrients (აზოტი, ფოსფორი, კალიუმი), market intelligence.
- `tasks.*`: Field assignments, operational areas, tractor fleet.
- `market.*`: Trade corridors, pricing, buyer/seller listings.

---

## 4. Text Display Standards
- **Always provide bilingual fallbacks:**
  ```tsx
  const isKa = language === 'ka' || localStorage.getItem('agri-app-lang') === 'ka';
  <span>{isKa ? 'მხოლოდ რუკა' : 'Only Map'}</span>
  ```
- **Georgian Unicode Safeguards:**
  All exported CSV/Excel files and generated reports must include the UTF-8 Byte Order Mark (`\uFEFF`) to prevent character distortion in Microsoft Excel on Windows PC workstations.
