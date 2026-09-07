// src/utils/projectSearch.ts
//
// Logique de recherche globale sur les projets, PARTAGÉE entre :
//   - la MAP SECTION de la Homepage (filtrage client, données déjà
//     entièrement chargées via GET /public/projects/map)
//   - pages/public/ProjectsPage.tsx (peut l'utiliser en filtrage client
//     d'appoint sur la page courante ; la recherche "large volume" est
//     déléguée au backend via Project::scopeSearchGlobal, le paramètre
//     `search` de GET /public/projects)
//
// Champs couverts (identiques des deux côtés, cf. cahier des charges) :
//   projet (titre + code), classification, entité accréditée,
//   secteur climatique (domaine d'intervention), statut.
//
// Une seule fonction de correspondance (`matchesProjectSearch`) est
// utilisée partout : aucune deuxième logique de recherche ne doit être
// réintroduite ailleurs dans le code.

import { normalizeText } from './textNormalize';
import type { Project, RegionMapProject, ProjectZoneMapPoint, ProjectGeographicZoneMapPoint } from '@/types';

/** Forme minimale, à plat, sur laquelle porte la recherche. */
export interface SearchableProjectFields {
  id: number;
  titre: string;
  id_projet?: string | null;
  statut?: string | null;
  classifications?: string[];
  entites_accreditees?: string[];
  domaines_intervention?: string[];
}

/** Adapte un `Project` complet (API liste/détail) vers la forme recherchable. */
export function toSearchableFields(p: Project): SearchableProjectFields {
  return {
    id: p.id,
    titre: p.titre,
    id_projet: p.id_projet,
    statut: p.statut?.designation ?? null,
    classifications: p.classifications?.map(c => c.designation) ?? [],
    entites_accreditees: p.entites_accreditees?.map(e => e.designation) ?? [],
    domaines_intervention: p.domaines_intervention?.map(d => d.designation) ?? [],
  };
}

/** Adapte un point de carte (région, zone ou zone géographique) vers la forme recherchable. */
export function fromMapProject(
  p: RegionMapProject | ProjectZoneMapPoint | ProjectGeographicZoneMapPoint
): SearchableProjectFields {
  return {
    // ProjectGeographicZoneMapPoint n'a pas de champ `id` de projet (son
    // `id` est celui de l'association projet↔zone) — on utilise
    // `project_id` dans ce cas.
    id: 'project_id' in p ? p.project_id : p.id,
    titre: p.titre,
    id_projet: p.id_projet,
    statut: p.statut,
    classifications: p.classifications ?? [],
    entites_accreditees: p.entites_accreditees ?? [],
    domaines_intervention: p.domaines_intervention ?? [],
  };
}

/**
 * Vrai si `fields` correspond à la recherche `query` — insensible à la
 * casse et aux accents, sur : titre, code projet, statut, classification(s),
 * entité(s) accréditée(s), secteur(s) climatique(s) (domaine
 * d'intervention). Une requête vide correspond toujours (aucun filtre actif).
 */
export function matchesProjectSearch(fields: SearchableProjectFields, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;

  const haystacks: (string | null | undefined)[] = [
    fields.titre,
    fields.id_projet,
    fields.statut,
    ...(fields.classifications ?? []),
    ...(fields.entites_accreditees ?? []),
    ...(fields.domaines_intervention ?? []),
  ];

  return haystacks.some(h => h && normalizeText(h).includes(q));
}

/** Filtre une liste de `Project` (page ProjectsPage en filtrage client d'appoint). */
export function filterProjects(projects: Project[], query: string): Project[] {
  if (!query.trim()) return projects;
  return projects.filter(p => matchesProjectSearch(toSearchableFields(p), query));
}

/** Filtre une liste de points de carte (région, zone ou zone géographique) selon la même règle. */
export function filterMapProjects<T extends RegionMapProject | ProjectZoneMapPoint | ProjectGeographicZoneMapPoint>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;
  return items.filter(p => matchesProjectSearch(fromMapProject(p), query));
}