// src/utils/sectorColors.ts
//
// Code couleur unique par secteur climatique (domaine d'intervention),
// partagé par toutes les pages publiques qui affichent des projets sur une
// carte ou dans des cartes (homepage, liste des projets, détail projet).
//
// - Palette fixe pour les 8 secteurs de référence (désignations exactes
//   telles qu'enregistrées en base, table domaine_interventions).
// - Génération d'une couleur stable pour tout secteur non répertorié
//   (ajouté ultérieurement depuis le back-office), afin de ne jamais
//   retomber sur du gris/noir par défaut.
// - Fusion (moyenne RGB) des couleurs d'un projet ayant plusieurs secteurs,
//   pour un repérage visuel rapide du nombre de thématiques couvertes.

export const SECTOR_MAP_COLORS: Record<string, string> = {
  'Gestion durable des forêts / REDD+':      '#16a34a', // vert forêt
  'Résilience des zones côtières':           '#0ea5e9', // bleu océan
  'Agriculture climato-intelligente':        '#84cc16', // vert lime
  'Énergie renouvelable':                    '#f97316', // orange
  'Gestion des ressources en eau':           '#06b6d4', // cyan
  'Protection de la biodiversité':           '#8b5cf6', // violet
  'Transport durable':                       '#6366f1', // indigo
  'Réduction des risques de catastrophes':   '#ef4444', // rouge
};
export const DEFAULT_SECTOR_MAP_COLOR = '#1a6b45';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(255 * f(0), 255 * f(8), 255 * f(4));
}

/** Couleur stable (mais arbitraire) pour un secteur non répertorié dans la palette fixe. */
export function fallbackSectorColor(designation: string): string {
  let hash = 0;
  for (let i = 0; i < designation.length; i++) {
    hash = designation.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hslToHex(Math.abs(hash) % 360, 65, 45);
}

/** Couleur d'un secteur donné (palette fixe, ou couleur générée si inconnu). */
export function sectorMapColor(designation: string): string {
  return SECTOR_MAP_COLORS[designation] ?? fallbackSectorColor(designation);
}

export function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Fusionne les couleurs de tous les secteurs climatiques d'un projet/zone
 * (moyenne RGB) : 1 secteur => sa couleur ; plusieurs => couleur mélangée,
 * bien distincte des couleurs individuelles.
 */
export function blendSectorColors(designations: string[] | undefined): { color: string; fillColor: string } {
  const unique = Array.from(new Set((designations ?? []).filter(Boolean)));
  if (unique.length === 0) {
    return { color: darkenHex(DEFAULT_SECTOR_MAP_COLOR, 0.2), fillColor: DEFAULT_SECTOR_MAP_COLOR };
  }
  const rgbs = unique.map(d => hexToRgb(sectorMapColor(d)));
  const avg = rgbs.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  const fill = rgbToHex(avg.r / rgbs.length, avg.g / rgbs.length, avg.b / rgbs.length);
  return { color: darkenHex(fill, 0.25), fillColor: fill };
}