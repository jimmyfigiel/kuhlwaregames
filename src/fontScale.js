// Global font-scale preference — stored in localStorage, applied via CSS zoom.
// Zoom scales fonts, spacing, and die sizes proportionally, which is ideal
// for a mobile game board where the player may need everything larger.

export const FONT_SCALE_KEY = "kuhlware_font_scale";

export const FONT_SCALE_OPTIONS = [
  { label: "S",  value: 0.85 },
  { label: "M",  value: 1.0  },
  { label: "L",  value: 1.15 },
  { label: "XL", value: 1.3  },
];

export function getSavedFontScale() {
  const saved = parseFloat(localStorage.getItem(FONT_SCALE_KEY));
  return Number.isFinite(saved) ? saved : 1.0;
}

export function applyFontScale(scale) {
  document.documentElement.style.zoom = String(scale);
  localStorage.setItem(FONT_SCALE_KEY, String(scale));
}
