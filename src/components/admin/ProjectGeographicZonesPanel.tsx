// src/components/admin/ProjectGeographicZonesPanel.tsx
//
// Gestion des zones géographiques MULTIPLES d'un projet (région, district,
// commune) — un projet peut couvrir plusieurs zones administratives
// distinctes, listées ici et affichées ensemble sur la carte du projet
// (voir ProjectZonePage.tsx, qui rend les marqueurs correspondants dans
// le même <MapContainer>).
//
// Ne pas confondre avec le polygone dessiné à la main (zone_points) :
// fonctionnalité séparée, gérée par ailleurs sur la même page.
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { geoApi, projectApi } from '@/api/services';
import type { GeographicZone, ZoneCandidate } from '@/types';
import { Search, Plus, X, MapPinned, Loader2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

const ZONE_TYPE_LABEL: Record<ZoneCandidate['zone_type'], string> = {
  region: 'Région',
  district: 'District',
  commune: 'Commune',
};

// Mêmes couleurs que les marqueurs sur la carte (ProjectZonePage.tsx) —
// à garder synchronisées si l'une des deux change.
export const ZONE_TYPE_COLOR: Record<ZoneCandidate['zone_type'], string> = {
  region: '#2563eb',
  district: '#9333ea',
  commune: '#ea580c',
};

function zoneKey(z: { zone_type: string; zone_id: number }): string {
  return `${z.zone_type}:${z.zone_id}`;
}

function ZoneBadge({ type }: { type: ZoneCandidate['zone_type'] }) {
  return (
    <span
      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
      style={{ color: ZONE_TYPE_COLOR[type], backgroundColor: `${ZONE_TYPE_COLOR[type]}1a` }}
    >
      {ZONE_TYPE_LABEL[type]}
    </span>
  );
}

/** Fil d'ariane contextuel sous le nom de la zone (ex: "District — Alaotra-Mangoro"). */
function zoneContext(z: ZoneCandidate): string | null {
  if (z.zone_type === 'region') return null;
  if (z.zone_type === 'district') return z.region_name ? `Région ${z.region_name}` : null;
  const parts = [z.district_name && `District ${z.district_name}`, z.region_name].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
}

interface Props {
  projectId: number;
  zones: GeographicZone[];
}

export default function ProjectGeographicZonesPanel({ projectId, zones }: Props) {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ZoneCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const associatedKeys = useMemo(() => new Set(zones.map(zoneKey)), [zones]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', String(projectId)] });

  const addOneMutation = useMutation({
    mutationFn: (candidate: ZoneCandidate) =>
      projectApi.addGeographicZone(projectId, candidate.zone_type, candidate.zone_id),
    onSuccess: (_res, candidate) => {
      toast.success(`${candidate.name} ajoutée au projet ✓`);
      invalidate();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Erreur lors de l'ajout de la zone.");
    },
  });

  const addManyMutation = useMutation({
    mutationFn: (candidates: ZoneCandidate[]) =>
      projectApi.addGeographicZones(projectId, candidates.map(c => ({ zone_type: c.zone_type, zone_id: c.zone_id }))),
    onSuccess: (res) => {
      const count = res.data.created.length;
      toast.success(count > 0 ? `${count} zone(s) ajoutée(s) au projet ✓` : 'Ces zones étaient déjà associées.');
      setSelected(new Set());
      invalidate();
    },
    onError: () => toast.error("Erreur lors de l'ajout des zones sélectionnées."),
  });

  const removeMutation = useMutation({
    mutationFn: (zone: GeographicZone) => projectApi.removeGeographicZone(projectId, zone.id),
    onSuccess: (_res, zone) => {
      toast.success(`${zone.name} retirée du projet.`);
      invalidate();
    },
    onError: () => toast.error('Erreur lors de la suppression de la zone.'),
  });

  let searchDebounce: ReturnType<typeof setTimeout>;
  const onQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(searchDebounce);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    searchDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await geoApi.searchZones(value.trim());
        setResults(res.data);
      } catch {
        toast.error('Erreur lors de la recherche de zones.');
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const toggleSelected = (candidate: ZoneCandidate) => {
    const key = zoneKey(candidate);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addSelected = () => {
    if (!results) return;
    const candidates = results.filter(r => selected.has(zoneKey(r)) && !associatedKeys.has(zoneKey(r)));
    if (candidates.length === 0) return;
    addManyMutation.mutate(candidates);
  };

  const selectableResults = (results ?? []).filter(r => !associatedKeys.has(zoneKey(r)));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <MapPinned className="w-4 h-4 text-blue-600" />
          Ajouter autres zones géographiques
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {zones.length === 0
          ? 'Aucune zone couverte pour le moment.'
          : `${zones.length} zone${zones.length > 1 ? 's' : ''} couverte${zones.length > 1 ? 's' : ''}`}
      </p>

      {/* Zones déjà associées */}
      {zones.length > 0 && (
        <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-0.5">
          {zones.map(z => (
            <div key={z.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ZoneBadge type={z.zone_type} />
                  <span className="text-sm font-medium text-gray-800 truncate">{z.name}</span>
                </div>
                {zoneContext(z) && <div className="text-[11px] text-gray-400 truncate">{zoneContext(z)}</div>}
              </div>
              <button
                onClick={() => removeMutation.mutate(z)}
                disabled={removeMutation.isPending}
                className="p-1 rounded hover:bg-red-50 flex-shrink-0"
                title="Retirer cette zone du projet"
              >
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recherche */}
      <div className="relative mb-2">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Rechercher une zone (région, district, commune)…"
          className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
        {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>

      {/* Résultats de recherche */}
      {results !== null && (
        <div className="space-y-1.5 mb-2 max-h-56 overflow-y-auto pr-0.5">
          {results.length === 0 && (
            <p className="text-xs text-gray-400 italic px-1 py-2">Aucune zone trouvée pour « {query} ».</p>
          )}
          {results.map(r => {
            const key = zoneKey(r);
            const already = associatedKeys.has(key);
            const isSelected = selected.has(key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 border ${already ? 'bg-gray-50 border-gray-100' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <button
                  type="button"
                  disabled={already}
                  onClick={() => toggleSelected(r)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                >
                  {!already && (isSelected
                    ? <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />)}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <ZoneBadge type={r.zone_type} />
                      <span className="text-sm font-medium text-gray-800 truncate">{r.name}</span>
                    </span>
                    {zoneContext(r) && <span className="block text-[11px] text-gray-400 truncate">{zoneContext(r)}</span>}
                  </span>
                </button>
                {already ? (
                  <span className="text-[11px] text-gray-400 italic flex-shrink-0 pl-2">Déjà associée</span>
                ) : (
                  <button
                    onClick={() => addOneMutation.mutate(r)}
                    disabled={addOneMutation.isPending}
                    className="p-1 rounded hover:bg-blue-50 flex-shrink-0"
                    title="Ajouter au projet"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectableResults.length > 0 && (
        <button
          onClick={addSelected}
          disabled={selected.size === 0 || addManyMutation.isPending}
          className="btn btn-secondary btn-sm w-full text-xs justify-center"
        >
          {addManyMutation.isPending ? 'Ajout…' : `+ Ajouter les zones sélectionnées (${selected.size})`}
        </button>
      )}
    </div>
  );
}
