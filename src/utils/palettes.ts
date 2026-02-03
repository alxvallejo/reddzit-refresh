const STORAGE_KEY = 'reddzit_palettes';

export interface SavedPalette {
  name: string;
  bg: string;
  accent: string;
  baseTheme: string;
}

export function loadPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPalette[];
  } catch {
    return [];
  }
}

export function savePalette(palette: SavedPalette): SavedPalette[] {
  const palettes = loadPalettes();
  const index = palettes.findIndex((p) => p.name === palette.name);
  if (index !== -1) {
    palettes[index] = palette;
  } else {
    palettes.push(palette);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  return palettes;
}

export function deletePalette(name: string): SavedPalette[] {
  const palettes = loadPalettes().filter((p) => p.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  return palettes;
}
