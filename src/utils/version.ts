export const APP_VERSION_CODE = "G2.0.1.4";
export const APP_VERSION_NAME = "sonik G2.0.1.4";
export const APP_CLASSIC_VERSION_NAME = "sonik G2.0.1.3";
export const MODERN_UI_VERSION = "sonik G2.0.1.4";

export type UiVersionMode = 'classic' | 'modern';


export const getUiVersionMode = (): UiVersionMode => {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('agrimap-ui-version-mode');
      if (saved === 'classic' || saved === 'modern') return saved;
    }
  } catch {}
  return 'modern';
};

export const setUiVersionMode = (mode: UiVersionMode): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('agrimap-ui-version-mode', mode);
      window.dispatchEvent(new CustomEvent('agrimap-ui-version-changed', { detail: { mode } }));
    }
  } catch (e) {
    console.warn('Failed to save UI version mode', e);
  }
};

export interface VersionHistoryEntry {
  version: string;
  code: string;
  date: string;
  description: string;
  changes: string[];
}

export const SYSTEM_VERSION_HISTORY: VersionHistoryEntry[] = [
  {
    version: "sonik G2.0.1.4",
    code: "G2.0.1.4",
    date: "2026-10-30",
    description: "Minimalist Grouped UI, 1-Letter Universal Omni-Search, Georgia vs Global Region Mode, and Dual-Version Switching.",
    changes: [
      "Classic & Modern live version switcher without data loss (sonik G2.0.1.3 Classic ↔ sonik G2.0.1.4 Modern).",
      "Universal 1-Letter / 1-Click Omni-Search supporting both names (employees, plots, crops) and functional operations (product returns, weigh-ins, AI scans).",
      "Pure language translation engine eliminating mixed Georgian/English terms.",
      "Dedicated Region mode selector: Georgia (₾ GEL, ha, local districts) vs Global ($ USD, € EUR, international standards).",
      "Minimalist card grouping with calm visual hierarchy and anti-clutter spacing."
    ]
  },
  {
    version: "sonik G2.0.1.3",
    code: "G2.0.1.3",
    date: "2026-10-27",
    description: "High-density multi-panel power layout with resizable modular widgets.",
    changes: [
      "Movable and resizable dashboard floating panels on PC.",
      "God AI Local Server Node and offline autonomous knowledge engine.",
      "Hybrid AI balance quota and Stripe card checkout modal."
    ]
  },
  {
    version: "sonik G2.0.1.2",
    code: "G2.0.1.2",
    date: "2026-06-24",
    description: "Centralized Version Control, duplicate units support, and service worker reload fixes.",
    changes: [
      "Created centralized version.ts utility.",
      "Added direct visual display of version under AgriMap logo in Sidebar.",
      "Added support card version code display.",
      "Fixed service worker infinite refresh loop by invoking updateSW(true) on reload confirmation.",
      "Implemented 'Copy' feature for Team & Units in Group Manager to copy group with selected employees."
    ]
  },
  {
    version: "AgriMap V2.0.0",
    code: "V2.0.0",
    date: "2026-05-10",
    description: "Initial V2 system release with offline-first tracking and Georgia regional features.",
    changes: [
      "Offline sync engine using localStorage queue.",
      "Multi-tenant organization structures.",
      "Smart GIS map views."
    ]
  }
];

