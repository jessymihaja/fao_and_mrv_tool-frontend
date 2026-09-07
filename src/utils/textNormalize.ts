// src/utils/textNormalize.ts
//
// Normalisation de texte pour comparaison "floue" (insensible à la casse
// et aux accents), utilisée par toute recherche côté public afin de
// garantir que "Forêt", "Foret" et "FORÊT" soient considérés équivalents.
//
// Utilise l'API standard String.normalize('NFD') (supportée par tous les
// navigateurs modernes) pour décomposer les caractères accentués en
// caractère de base + diacritique, puis retire les diacritiques via une
// regex sur la plage Unicode dédiée (U+0300–U+036f).

/** Normalise une chaîne : minuscules, accents retirés, espaces superflus supprimés. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Vrai si `haystack` contient `needle`, comparaison normalisée (casse + accents). */
export function fuzzyIncludes(haystack: string | null | undefined, needle: string): boolean {
  if (!needle.trim()) return true;
  return normalizeText(haystack).includes(normalizeText(needle));
}
