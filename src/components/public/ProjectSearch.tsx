// src/components/public/ProjectSearch.tsx
//
// Champ de recherche globale réutilisable — même composant utilisé dans la
// MAP SECTION (Homepage) et dans pages/public/ProjectsPage.tsx, pour une
// UX et un comportement clavier strictement identiques sur les deux
// surfaces.

import { Search, X, Loader2 } from 'lucide-react';

export interface ProjectSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onReset: () => void;
  /** Nombre de résultats à afficher. `undefined` = ne rien afficher (ex. avant 1ère recherche). */
  resultsCount?: number;
  /** Recherche en cours (appel API) — affiche un indicateur de chargement. */
  loading?: boolean;
  placeholder?: string;
  className?: string;
  /** Force un affichage empilé (input puis boutons en dessous), utile dans une colonne étroite. */
  compact?: boolean;
}

const DEFAULT_PLACEHOLDER =
  'Rechercher un projet, une classification, une entité accréditée ou un secteur climatique...';

export default function ProjectSearch({
  value,
  onChange,
  onSubmit,
  onReset,
  resultsCount,
  loading = false,
  placeholder = DEFAULT_PLACEHOLDER,
  className = '',
  compact = false,
}: ProjectSearchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onReset();
    }
  };

  return (
    <div className={className}>
      <div className={`flex ${compact ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
        <div className="relative flex-1">
          <input
            type="text"
            role="searchbox"
            aria-label="Recherche globale de projets"
            className="form-input pl-10 pr-9 w-full"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {value && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSubmit}
            className="btn btn-primary whitespace-nowrap"
            style={{ background: 'var(--gcf-green)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rechercher
          </button>
          {value && (
            <button type="button" onClick={onReset} className="btn btn-secondary whitespace-nowrap">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Recherche en cours...
        </p>
      )}
      {!loading && resultsCount !== undefined && (
        <p className="text-xs text-gray-500 mt-2">
          {resultsCount === 0
            ? 'Aucun projet ne correspond à votre recherche.'
            : `${resultsCount} résultat${resultsCount > 1 ? 's' : ''} trouvé${resultsCount > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}