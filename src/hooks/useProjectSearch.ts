// src/hooks/useProjectSearch.ts
//
// Hook réutilisable centralisant l'état d'une recherche de projets :
// saisie immédiate (contrôle l'input), terme "débouncé" (déclenche le
// filtrage/la requête), et actions rechercher/réinitialiser.
//
// Utilisé à la fois par la MAP SECTION (Homepage) et par ProjectsPage —
// aucune deuxième implémentation de cet état ne doit être créée ailleurs.

import { useEffect, useState } from 'react';

export interface UseProjectSearchOptions {
  /** Délai de debounce en ms avant que `debouncedQuery` ne se mette à jour. Défaut 400ms. */
  debounceMs?: number;
  /** Valeur initiale du champ de recherche. */
  initialValue?: string;
}

export interface UseProjectSearchResult {
  /** Valeur brute du champ (mise à jour à chaque frappe). */
  query: string;
  /** Valeur débouncée, à utiliser pour filtrer/rechercher. */
  debouncedQuery: string;
  /** Recherche active (terme débouncé non vide). */
  isActive: boolean;
  /** Recherche en attente de débounce (saisie en cours, terme pas encore appliqué). */
  isPending: boolean;
  setQuery: (value: string) => void;
  /** Applique immédiatement `query` comme terme débouncé (ex. Enter / clic "Rechercher"). */
  submit: () => void;
  /** Vide le champ et le terme débouncé (ex. bouton Réinitialiser / Escape). */
  reset: () => void;
}

export function useProjectSearch(options: UseProjectSearchOptions = {}): UseProjectSearchResult {
  const { debounceMs = 400, initialValue = '' } = options;

  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(handle);
  }, [query, debounceMs]);

  const submit = () => setDebouncedQuery(query);
  const reset = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return {
    query,
    debouncedQuery,
    isActive: debouncedQuery.trim().length > 0,
    isPending: query !== debouncedQuery,
    setQuery,
    submit,
    reset,
  };
}
