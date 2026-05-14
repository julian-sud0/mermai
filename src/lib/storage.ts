const MARKUP_KEY = "mermai.markup";
const DRAWER_KEY = "mermai.drawerOpen";
const DIAGRAMS_KEY = "mermai.diagrams";
const CURRENT_KEY = "mermai.currentDiagramId";

export function loadMarkup(fallback: string): string {
  try {
    return localStorage.getItem(MARKUP_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveMarkup(markup: string): void {
  try {
    localStorage.setItem(MARKUP_KEY, markup);
  } catch {
    /* quota or disabled — ignore */
  }
}

export function loadDrawerOpen(): boolean {
  try {
    const raw = localStorage.getItem(DRAWER_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

export function saveDrawerOpen(open: boolean): void {
  try {
    localStorage.setItem(DRAWER_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export interface SavedDiagram {
  id: string;
  name: string;
  markup: string;
  updatedAt: number;
}

export type SavedDiagrams = Record<string, SavedDiagram>;

export function loadDiagrams(): SavedDiagrams {
  try {
    const raw = localStorage.getItem(DIAGRAMS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDiagrams(d: SavedDiagrams): void {
  try {
    localStorage.setItem(DIAGRAMS_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function loadCurrentDiagramId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY) || null;
  } catch {
    return null;
  }
}

export function saveCurrentDiagramId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignore */
  }
}

export function makeDiagramId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
