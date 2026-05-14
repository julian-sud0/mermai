const KEY = "mermai.markup";

export function loadMarkup(fallback: string): string {
  try {
    return localStorage.getItem(KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveMarkup(markup: string): void {
  try {
    localStorage.setItem(KEY, markup);
  } catch {
    /* quota or disabled — ignore */
  }
}
