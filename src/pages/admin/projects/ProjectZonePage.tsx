// src/pages/admin/projects/ProjectZonePage.tsx
//
// Cartographie de la zone d'intervention d'un projet.
//
// Au lieu d'un point unique, l'utilisateur place plusieurs marqueurs sur
// la carte (clic) ; ils sont reliés dans leur ordre de création pour
// former automatiquement le polygone représentant la zone officielle
// d'intervention du projet. Le polygone est rempli en semi-transparent
// pour être facilement identifiable. Les points peuvent être déplacés
// (glisser-déposer) ou supprimés individuellement. Un minimum de 3 points
// est requis pour former une zone valide.
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/api/services';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Edit, Navigation, Copy, Check, Trash2, RotateCcw, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ProjectGeographicZonesPanel, { ZONE_TYPE_COLOR } from '@/components/admin/ProjectGeographicZonesPanel';
import type { GeographicZone } from '@/types';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icône personnalisée affichant directement le numéro du sommet sur le
// marqueur (pas seulement dans la popup), pour que l'ordre du polygone
// soit visible d'un coup d'œil sur la carte — et pour bien signaler que
// le marqueur est déplaçable (curseur "grab" au survol).
function numberedIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: 'zone-point-marker',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: #16a34a; border: 2px solid white;
      transform: rotate(-45deg);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      cursor: grab;
    ">
      <span style="
        transform: rotate(45deg);
        color: white; font-size: 12px; font-weight: 700; font-family: sans-serif;
      ">${n}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const MIN_POINTS = 3;

interface ZonePoint { id: number; lat: number; lng: number }

let nextPointId = 1;

function CoordPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/**
 * Ajuste automatiquement le cadrage de la carte pour que tous les points
 * donnés (sommets du polygone + zones géographiques multiples) restent
 * visibles simultanément — équivalent de fitBounds() (§7 du cahier des
 * charges "zoom automatique"). Ne fait rien si moins de 1 point.
 */
function FitAllBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map(p => p.join(',')).join('|');

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 10);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copier"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
    </button>
  );
}

export default function ProjectZonePage() {
  const { id } = useParams();
  const qc = useQueryClient();

  // Points du polygone en cours d'édition (state local, non persisté tant
  // que "Enregistrer la zone" n'est pas cliqué).
  const [zonePoints, setZonePoints] = useState<ZonePoint[]>([]);
  const [dirty, setDirty] = useState(false);
  // Empêche de réécraser les points en cours d'édition à chaque refetch —
  // on ne charge les points sauvegardés qu'une seule fois par projet.
  const loadedForProjectId = useRef<number | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.show(Number(id)).then(r => r.data),
  });

  // Charger les points sauvegardés dès qu'ils sont disponibles (une seule
  // fois — pour ne pas écraser une édition en cours après une invalidation
  // de cache suite à la sauvegarde).
  useEffect(() => {
    if (!project) return;
    if (loadedForProjectId.current === project.id) return;
    loadedForProjectId.current = project.id;
    const saved = (project.zone_points || []).map(p => ({ id: nextPointId++, lat: Number(p.latitude), lng: Number(p.longitude) }));
    setZonePoints(saved);
    setDirty(false);
  }, [project]);

  const saveMutation = useMutation({
    mutationFn: (points: ZonePoint[]) =>
      projectApi.update(Number(id), {
        zone_points: points.map(p => ({ latitude: p.lat, longitude: p.lng })),
      }),
    onSuccess: () => {
      toast.success(zonePoints.length === 0 ? 'Zone effacée ✓' : 'Zone du projet enregistrée ✓');
      qc.invalidateQueries({ queryKey: ['project', id] });
      setDirty(false);
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const addPoint = (lat: number, lng: number) => {
    setZonePoints(pts => [...pts, { id: nextPointId++, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }]);
    setDirty(true);
  };

  const movePoint = (pointId: number, lat: number, lng: number) => {
    setZonePoints(pts => pts.map(p => (p.id === pointId ? { ...p, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) } : p)));
    setDirty(true);
  };

  const removePoint = (pointId: number) => {
    setZonePoints(pts => pts.filter(p => p.id !== pointId));
    setDirty(true);
  };

  const clearAll = () => {
    setZonePoints([]);
    setDirty(true);
  };

  const revertChanges = () => {
    const saved = (project?.zone_points || []).map(p => ({ id: nextPointId++, lat: Number(p.latitude), lng: Number(p.longitude) }));
    setZonePoints(saved);
    setDirty(false);
  };

  const handleSave = () => {
    if (zonePoints.length > 0 && zonePoints.length < MIN_POINTS) {
      toast.error(`Impossible de créer une zone de projet : ajoutez au moins ${MIN_POINTS} points sur la carte.`);
      return;
    }
    saveMutation.mutate(zonePoints);
  };

  // Centre initial de la carte : centroïde des points existants, sinon
  // ancien point unique (rétrocompatibilité), sinon centre de Madagascar.
  const savedLat = project?.latitude ? Number(project.latitude) : null;
  const savedLng = project?.longitude ? Number(project.longitude) : null;
  const initialCenter: [number, number] = zonePoints.length > 0
    ? [
        zonePoints.reduce((s, p) => s + p.lat, 0) / zonePoints.length,
        zonePoints.reduce((s, p) => s + p.lng, 0) / zonePoints.length,
      ]
    : [savedLat ?? -18.9137, savedLng ?? 47.5361];

  const polygonPositions: [number, number][] = zonePoints.map(p => [p.lat, p.lng]);
  const isValidZone = zonePoints.length >= MIN_POINTS;
  const needsMorePoints = zonePoints.length > 0 && zonePoints.length < MIN_POINTS;

  // ── Zones géographiques multiples (région/district/commune) ────────────
  // Fonctionnalité séparée du polygone ci-dessus, affichée sur la MÊME
  // carte (§2 du cahier des charges : "une carte interactive unique").
  const geographicZones: GeographicZone[] = project?.geographic_zones ?? [];
  const removeGeoZoneMutation = useMutation({
    mutationFn: (zone: GeographicZone) => projectApi.removeGeographicZone(Number(id), zone.id),
    onSuccess: (_res, zone) => {
      toast.success(`${zone.name} retirée du projet.`);
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: () => toast.error('Erreur lors de la suppression de la zone.'),
  });
  const geoZonePositions: [number, number][] = geographicZones
    .filter(z => z.latitude !== null && z.longitude !== null)
    .map(z => [z.latitude as number, z.longitude as number]);
  const allMapPoints: [number, number][] = [...polygonPositions, ...geoZonePositions];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/admin/projects/${id}/details`} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">Zone géographique</h1>
          <p className="text-sm text-gray-500 truncate">{project?.titre}</p>
        </div>
        <Link to={`/admin/projects/${id}/edit`} className="btn btn-secondary btn-sm">
          <Edit className="w-4 h-4" /> Modifier
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Carte */}
        <div className="lg:col-span-2 card overflow-hidden p-0" style={{ height: '520px' }}>
          <MapContainer center={initialCenter} zoom={zonePoints.length > 0 ? 10 : 8} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <CoordPicker onPick={addPoint} />

            {/* Zoom automatique pour garder visibles à la fois le polygone
                et toutes les zones géographiques multiples (§7) */}
            <FitAllBounds points={allMapPoints} />

            {/* Zones géographiques multiples (région/district/commune) —
                marqueurs distincts du polygone ci-dessous, une couleur par
                niveau administratif (§3 "visuellement distinguables") */}
            {geographicZones.filter(z => z.latitude !== null && z.longitude !== null).map(z => (
              <CircleMarker
                key={`geo-zone-${z.id}`}
                center={[z.latitude as number, z.longitude as number]}
                radius={10}
                pathOptions={{
                  color: ZONE_TYPE_COLOR[z.zone_type],
                  fillColor: ZONE_TYPE_COLOR[z.zone_type],
                  fillOpacity: 0.65,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-sm space-y-1.5 min-w-[160px]">
                    <div className="font-bold" style={{ color: ZONE_TYPE_COLOR[z.zone_type] }}>{z.name}</div>
                    <div className="text-xs text-gray-500">
                      Type : {z.zone_type === 'region' ? 'Région' : z.zone_type === 'district' ? 'District' : 'Commune'}
                    </div>
                    {z.is_approximate_location && (
                      <div className="text-[11px] text-amber-600 italic">Position approximative (centroïde régional)</div>
                    )}
                    <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                      Cette zone est déjà associée à ce projet.
                    </div>
                    <button
                      onClick={() => removeGeoZoneMutation.mutate(z)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium pt-1"
                    >
                      <Trash2 className="w-3 h-3" /> Retirer du projet
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Polygone rempli — visible dès que la zone est valide (≥3 points) */}
            {isValidZone && (
              <Polygon
                positions={polygonPositions}
                pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#22c55e', fillOpacity: 0.28 }}
              />
            )}

            {/* Tracé provisoire (pointillé) tant que la zone n'est pas encore valide */}
            {!isValidZone && zonePoints.length >= 2 && (
              <Polyline positions={polygonPositions} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 6' }} />
            )}

            {/* Un marqueur numéroté par point du polygone, déplaçable */}
            {zonePoints.map((pt, index) => (
              <Marker
                key={pt.id}
                position={[pt.lat, pt.lng]}
                icon={numberedIcon(index + 1)}
                draggable
                autoPan
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const { lat, lng } = m.getLatLng();
                    movePoint(pt.id, lat, lng);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm space-y-1.5 min-w-[150px]">
                    <div className="font-bold text-green-700">Point {index + 1}</div>
                    <div className="font-mono text-xs text-gray-500">
                      {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                    </div>
                    <button
                      onClick={() => removePoint(pt.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium pt-1"
                    >
                      <Trash2 className="w-3 h-3" /> Supprimer ce point
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Panel info */}
        <div className="space-y-4">

          {/* Instructions / statut */}
          <div className={`card p-4 border ${needsMorePoints ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
            <div className={`flex items-start gap-2 text-sm ${needsMorePoints ? 'text-amber-700' : 'text-blue-700'}`}>
              {needsMorePoints ? <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>
                {needsMorePoints
                  ? `Ajoutez au moins ${MIN_POINTS - zonePoints.length} point${MIN_POINTS - zonePoints.length > 1 ? 's' : ''} de plus pour former une zone valide (actuellement ${zonePoints.length}).`
                  : 'Cliquez sur la carte pour ajouter des points. À partir de 3 points, ils formeront automatiquement le polygone de la zone.'}
              </span>
            </div>
          </div>

          {/* Zones géographiques multiples (région/district/commune) —
              fonctionnalité séparée du polygone ci-dessus */}
          <ProjectGeographicZonesPanel projectId={Number(id)} zones={geographicZones} />

          {/* Liste des points + actions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-green-600" />
                Cartographie des zones  ({zonePoints.length})
              </h3>
              {zonePoints.length > 0 && (
                <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Tout effacer
                </button>
              )}
            </div>

            {zonePoints.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {zonePoints.map((pt, index) => (
                  <div key={pt.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-mono text-xs text-gray-600 truncate">
                        {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                      </span>
                    </div>
                    <button onClick={() => removePoint(pt.id)} className="p-1 rounded hover:bg-red-50 flex-shrink-0" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun point sélectionné. Cliquez sur la carte pour commencer.</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !dirty || needsMorePoints}
                className="btn btn-primary flex-1 text-sm"
              >
                {saveMutation.isPending ? 'Sauvegarde...' : '💾 Enregistrer la zone'}
              </button>
              {dirty && (
                <button onClick={revertChanges} className="btn btn-secondary text-sm px-3" title="Annuler les modifications">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Nom de la zone */}
          {project?.zone && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-green-500" />
                Zone
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                {project.zone}
              </p>
            </div>
          )}

          {/* Adresse locale */}
          {project?.geo_address && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                Zone d'intervention
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                {project.geo_address}
              </p>
            </div>
          )}

          {/* Coordonnées sauvegardées (référence rapide, copiables) */}
          {isValidZone && !dirty && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Zone enregistrée — {zonePoints.length} sommets
              </h4>
              <div className="space-y-2">
                {zonePoints.slice(0, 3).map((pt, index) => (
                  <div key={pt.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Point {index + 1}</div>
                      <div className="font-mono text-sm text-gray-700">{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}</div>
                    </div>
                    <CopyBtn text={`${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}`} />
                  </div>
                ))}
                {zonePoints.length > 3 && (
                  <p className="text-xs text-gray-400 italic px-1">+ {zonePoints.length - 3} autre(s) point(s)…</p>
                )}
              </div>
            </div>
          )}

          {/* Description de la zone */}
          {project?.zone_description && (
            <div className="card p-5">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Description de la zone</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{project.zone_description}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
