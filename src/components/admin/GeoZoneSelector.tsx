// src/components/admin/GeoZoneSelector.tsx
// Layout gauche/droite :
//   - Gauche : Vraie carte Leaflet interactive (OpenStreetMap) de Madagascar
//   - Droite  : Zone détectée automatiquement via bbox + cascade district/commune/fokontany

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geoApi } from '@/api/services';
import {
  MapPin, ChevronRight, CheckCircle2, Navigation,
  TreePine, Map, Layers, LocateFixed, ZoomIn, ZoomOut,
  RotateCcw, Crosshair, Loader2, Building2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix default Leaflet marker icons ──────────────────────────
// `_getIconUrl` est une propriété interne non exposée dans les types
// officiels de Leaflet — le contournement communautaire standard doit
// passer par `unknown` plutôt que `any` pour rester type-safe ailleurs.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// ─── Régions avec bounding boxes ──────────────────────────────
interface RegionGeo {
  id: string;
  nom: string;
  province: string;
  latitude: number;
  longitude: number;
  bbox: [number, number, number, number];
}

const REGIONS_GEO: RegionGeo[] = [
  { id: 'diana',             nom: 'Diana',               province: 'Antsiranana',  latitude: -12.35, longitude: 49.29, bbox: [-13.6, -11.9, 48.1, 50.5] },
  { id: 'sava',              nom: 'Sava',                province: 'Antsiranana',  latitude: -14.20, longitude: 50.17, bbox: [-15.5, -13.0, 49.2, 50.6] },
  { id: 'sofia',             nom: 'Sofia',               province: 'Mahajanga',    latitude: -15.50, longitude: 48.50, bbox: [-16.5, -14.0, 47.0, 50.0] },
  { id: 'analanjirofo',      nom: 'Analanjirofo',        province: 'Toamasina',    latitude: -16.80, longitude: 49.77, bbox: [-17.8, -15.5, 49.0, 50.5] },
  { id: 'boeny',             nom: 'Boeny',               province: 'Mahajanga',    latitude: -15.72, longitude: 46.32, bbox: [-17.0, -14.5, 44.5, 47.5] },
  { id: 'betsiboka',         nom: 'Betsiboka',           province: 'Mahajanga',    latitude: -16.83, longitude: 46.83, bbox: [-17.8, -15.8, 45.8, 48.5] },
  { id: 'alaotra-mangoro',   nom: 'Alaotra-Mangoro',     province: 'Toamasina',    latitude: -17.67, longitude: 48.67, bbox: [-19.0, -16.5, 47.5, 49.8] },
  { id: 'melaky',            nom: 'Melaky',              province: 'Mahajanga',    latitude: -16.50, longitude: 44.67, bbox: [-18.5, -14.8, 43.5, 46.5] },
  { id: 'bongolava',         nom: 'Bongolava',           province: 'Antananarivo', latitude: -18.50, longitude: 45.83, bbox: [-19.5, -17.5, 44.8, 47.0] },
  { id: 'analamanga',        nom: 'Analamanga',          province: 'Antananarivo', latitude: -18.91, longitude: 47.54, bbox: [-19.5, -17.8, 46.8, 48.5] },
  { id: 'atsinanana',        nom: 'Atsinanana',          province: 'Toamasina',    latitude: -18.14, longitude: 49.40, bbox: [-19.5, -16.5, 48.5, 50.5] },
  { id: 'itasy',             nom: 'Itasy',               province: 'Antananarivo', latitude: -19.50, longitude: 46.67, bbox: [-20.2, -18.8, 46.0, 47.4] },
  { id: 'vakinankaratra',    nom: 'Vakinankaratra',      province: 'Antananarivo', latitude: -20.00, longitude: 47.17, bbox: [-21.2, -19.0, 46.2, 48.2] },
  { id: 'menabe',            nom: 'Menabe',              province: 'Toliara',      latitude: -20.30, longitude: 44.32, bbox: [-22.5, -18.5, 43.2, 46.0] },
  { id: 'haute-matsiatra',   nom: 'Haute Matsiatra',     province: 'Fianarantsoa', latitude: -21.45, longitude: 47.09, bbox: [-22.5, -20.5, 46.0, 48.0] },
  { id: 'vatovavy',          nom: 'Vatovavy Fitovinany', province: 'Fianarantsoa', latitude: -21.50, longitude: 47.67, bbox: [-23.0, -20.5, 47.0, 50.0] },
  { id: 'amoroni-mania',     nom: "Amoron'i Mania",      province: 'Fianarantsoa', latitude: -20.83, longitude: 46.67, bbox: [-21.8, -20.0, 45.8, 47.5] },
  { id: 'atsimo-atsinanana', nom: 'Atsimo-Atsinanana',   province: 'Fianarantsoa', latitude: -22.90, longitude: 47.53, bbox: [-24.5, -22.0, 46.5, 48.5] },
  { id: 'ihorombe',          nom: 'Ihorombe',            province: 'Fianarantsoa', latitude: -22.42, longitude: 46.17, bbox: [-23.5, -21.0, 44.8, 47.5] },
  { id: 'atsimo-andrefana',  nom: 'Atsimo-Andrefana',    province: 'Toliara',      latitude: -23.36, longitude: 43.69, bbox: [-25.5, -21.5, 42.0, 45.5] },
  { id: 'anosy',             nom: 'Anosy',               province: 'Toliara',      latitude: -24.97, longitude: 46.83, bbox: [-26.0, -23.5, 45.5, 48.0] },
  { id: 'androy',            nom: 'Androy',              province: 'Toliara',      latitude: -25.17, longitude: 45.30, bbox: [-25.8, -23.8, 44.0, 47.0] },
];

function detectRegionByCoords(lat: number, lng: number): RegionGeo | null {
  const matches = REGIONS_GEO.filter(r => {
    const [latMin, latMax, lngMin, lngMax] = r.bbox;
    return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
  });
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return matches.reduce((best, r) => {
    const dB = Math.hypot(best.latitude - lat, best.longitude - lng);
    const dC = Math.hypot(r.latitude    - lat, r.longitude    - lng);
    return dC < dB ? r : best;
  });
}

const TILE_LAYERS = {
  street:    { label: 'Rue',       url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  satellite: { label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  topo:      { label: 'Topo',      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
};

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapControls({ onReset }: { onReset: () => void }) {
  const map = useMap();
  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
      {[
        { icon: <ZoomIn className="w-3.5 h-3.5 text-gray-600" />,    action: () => map.zoomIn(),  title: 'Zoom +' },
        { icon: <ZoomOut className="w-3.5 h-3.5 text-gray-600" />,   action: () => map.zoomOut(), title: 'Zoom -' },
        { icon: <RotateCcw className="w-3.5 h-3.5 text-gray-600" />, action: onReset,             title: 'Recentrer' },
      ].map(({ icon, action, title }) => (
        <button key={title} type="button" onClick={action} title={title}
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          {icon}
        </button>
      ))}
    </div>
  );
}

function MapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1.0 }); }, [lat, lng, zoom]);
  return null;
}

/**
 * Champs de localisation utilisés par ce composant. Volontairement plus
 * étroit que Project : toute forme possédant ces mêmes champs (Project,
 * ProjectIdea...) peut être passée telle quelle, sans adaptation — c'est
 * ce qui permet de réutiliser ce composant tel quel pour le module Idées
 * de projet (mêmes noms de colonnes, même système de sélection).
 */
export interface GeoZoneFormFields {
  latitude?: number | null;
  longitude?: number | null;
  province_id?: number | null;
  region_id?: number | null;
  district_id?: number | null;
  commune_id?: number | null;
  fokontany_id?: number | null;
  zone_description?: string | null;
  geo_address?: string | null;
  zone?: string | null;
}

interface Props {
  form: GeoZoneFormFields;
  onChange: (field: keyof GeoZoneFormFields, value: GeoZoneFormFields[keyof GeoZoneFormFields]) => void;
}

export default function GeoZoneSelector({ form, onChange }: Props) {
  const [tileLayer,      setTileLayer]      = useState<keyof typeof TILE_LAYERS>('street');
  const [showTilePicker, setShowTilePicker] = useState(false);
  const [clickedCoord,   setClickedCoord]   = useState<{ lat: number; lng: number } | null>(
    form.latitude && form.longitude ? { lat: form.latitude, lng: form.longitude } : null
  );
  const [flyTarget,      setFlyTarget]      = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<RegionGeo | null>(null);
  const [geoAddress,     setGeoAddress]     = useState<string | null>(form.geo_address || null);
  const [geoLoading,     setGeoLoading]     = useState(false);

  // Cascade locale
  const [districtId,  setDistrictId]  = useState<number | undefined>(form.district_id ?? undefined);
  const [communeId,   setCommuneId]   = useState<number | undefined>(form.commune_id ?? undefined);
  const [fokontanyId, setFokontanyId] = useState<number | undefined>(form.fokontany_id ?? undefined);

  // ─── Queries ─────────────────────────────────────────────────
  const { data: apiRegions = [] } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => geoApi.regions().then(r => r.data),
  });

  const { data: districts = [], isFetching: loadingDistricts } = useQuery({
    queryKey: ['districts', form.region_id],
    queryFn: () => geoApi.districts(form.region_id ?? undefined).then(r => r.data),
    enabled: !!form.region_id,
  });

  const { data: communes = [], isFetching: loadingCommunes } = useQuery({
    queryKey: ['communes', districtId],
    queryFn: () => geoApi.communes(districtId).then(r => r.data),
    enabled: !!districtId,
  });

  const { data: fokontanyList = [] } = useQuery({
    queryKey: ['fokontany', communeId],
    queryFn: () => geoApi.fokontany(communeId).then(r => r.data),
    enabled: !!communeId,
  });

  // ─── Reverse geocoding — optionnel, ne bloque jamais la sauvegarde ──
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeoLoading(true);
    setGeoAddress(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        const parts = [
          a.village || a.town || a.city || a.hamlet,
          a.county  || a.state_district,
        ].filter(Boolean);
        const addr = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(', ');
        setGeoAddress(addr);
        onChange('geo_address', addr);
      }
    } catch {
      // Nominatim indisponible ou bloqué — on ignore silencieusement
      // geo_address reste null, ce qui est acceptable
    } finally {
      setGeoLoading(false);
    }
  }, [onChange]);

  // ─── Sync région en mode édition ─────────────────────────────
  useEffect(() => {
    if (form.region_id && apiRegions.length > 0 && !detectedRegion) {
      const apiR = apiRegions.find(r => r.id === form.region_id);
      if (apiR) {
        const geo = REGIONS_GEO.find(r => r.nom.toLowerCase() === apiR.nom.toLowerCase());
        if (geo) setDetectedRegion(geo);
      }
    }
    if (form.district_id  && !districtId)  setDistrictId(form.district_id);
    if (form.commune_id   && !communeId)   setCommuneId(form.commune_id);
    if (form.fokontany_id && !fokontanyId) setFokontanyId(form.fokontany_id);
  }, [form.region_id, apiRegions.length]);

  // ─── Clic carte ──────────────────────────────────────────────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const sLat = parseFloat(lat.toFixed(6));
    const sLng = parseFloat(lng.toFixed(6));

    setClickedCoord({ lat: sLat, lng: sLng });
    onChange('latitude',  sLat);
    onChange('longitude', sLng);

    const region = detectRegionByCoords(lat, lng);
    if (region) {
      const wasAlreadySelected = detectedRegion?.id === region.id;
      setDetectedRegion(region);
      if (!wasAlreadySelected) {
        const apiR = apiRegions.find(
          r => r.nom.toLowerCase() === region.nom.toLowerCase()
        );
        if (apiR) {
          onChange('region_id',   apiR.id);
          onChange('province_id', apiR.province_id);
        }
        setDistrictId(undefined);
        setCommuneId(undefined);
        setFokontanyId(undefined);
        onChange('district_id',  null);
        onChange('commune_id',   null);
        onChange('fokontany_id', null);
      }
    } else {
      setDetectedRegion(null);
    }

    reverseGeocode(lat, lng);
  }, [apiRegions, detectedRegion, onChange, reverseGeocode]);

  // ─── Sélection rapide région ─────────────────────────────────
  const handleRegionShortcut = useCallback((region: RegionGeo) => {
    setDetectedRegion(region);
    setClickedCoord({ lat: region.latitude, lng: region.longitude });
    setFlyTarget({ lat: region.latitude, lng: region.longitude, zoom: 9 });
    onChange('latitude',  region.latitude);
    onChange('longitude', region.longitude);

    const apiR = apiRegions.find(r => r.nom.toLowerCase() === region.nom.toLowerCase());
    if (apiR) {
      onChange('region_id',   apiR.id);
      onChange('province_id', apiR.province_id);
    }
    setDistrictId(undefined);
    setCommuneId(undefined);
    setFokontanyId(undefined);
    onChange('district_id',  null);
    onChange('commune_id',   null);
    onChange('fokontany_id', null);
    setGeoAddress(null);
    onChange('geo_address', null);
  }, [apiRegions, onChange]);

  const apiRegionInfo = form.region_id
    ? apiRegions.find(r => r.id === form.region_id)
    : null;

  const MADAGASCAR_CENTER: [number, number] = [-18.766947, 46.869107];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '620px' }}>

      {/* ════════════════════════════
          GAUCHE — Carte Leaflet
      ════════════════════════════ */}
      <div className="relative flex flex-col border-r border-gray-200">

        {/* Header carte */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0 z-10" style={{ background: '#f8fbf8' }}>
          <Map className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-700 text-sm">Carte de Madagascar</span>
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Crosshair className="w-3 h-3" /> Cliquez pour épingler
          </span>

          {/* Tile switcher */}
          <div className="relative ml-2">
            <button type="button" onClick={() => setShowTilePicker(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              {TILE_LAYERS[tileLayer].label}
            </button>
            {showTilePicker && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-[2000] min-w-[110px]">
                {(Object.entries(TILE_LAYERS) as [keyof typeof TILE_LAYERS, { label: string }][]).map(([key, val]) => (
                  <button key={key} type="button" onClick={() => { setTileLayer(key); setShowTilePicker(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${tileLayer === key ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {tileLayer === key && <CheckCircle2 className="w-3 h-3 inline mr-1.5 text-green-600" />}
                    {val.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 relative" style={{ zIndex: 0 }}>
          <MapContainer
            center={clickedCoord ? [clickedCoord.lat, clickedCoord.lng] : MADAGASCAR_CENTER}
            zoom={clickedCoord ? 9 : 6}
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            <TileLayer key={tileLayer} url={TILE_LAYERS[tileLayer].url} />
            <ClickHandler onMapClick={handleMapClick} />
            {flyTarget && <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}
            <MapControls onReset={() => setFlyTarget({ lat: MADAGASCAR_CENTER[0], lng: MADAGASCAR_CENTER[1], zoom: 6 })} />

            {clickedCoord && (
              <Marker position={[clickedCoord.lat, clickedCoord.lng]} icon={greenIcon}>
                <Popup>
                  <div className="text-sm space-y-1 min-w-[160px]">
                    {detectedRegion && (
                      <div className="font-bold text-green-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {detectedRegion.nom}
                      </div>
                    )}
                    {geoAddress && <div className="text-xs text-gray-500 leading-snug">{geoAddress}</div>}
                    <div className="font-mono text-xs text-gray-400 pt-1 border-t border-gray-100">
                      {clickedCoord.lat.toFixed(5)}, {clickedCoord.lng.toFixed(5)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Overlay initial */}
          {!clickedCoord && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="rounded-2xl px-5 py-4 text-center"
                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <LocateFixed className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700 mb-0.5">Cliquez sur la carte</p>
                <p className="text-xs text-gray-400">La région et ses districts s'afficheront automatiquement</p>
              </div>
            </div>
          )}

          {/* Indicateur bas-gauche */}
          {clickedCoord && (
            <div className="absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2 text-xs pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
              <div className="flex items-center gap-1.5 text-green-700 font-semibold mb-0.5">
                <MapPin className="w-3 h-3" />
                {detectedRegion ? detectedRegion.nom : 'Position épinglée'}
              </div>
              <div className="font-mono text-gray-500">
                {clickedCoord.lat.toFixed(5)}° , {clickedCoord.lng.toFixed(5)}°
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════
          DROITE — Cascade
      ════════════════════════════ */}
      <div className="flex flex-col overflow-hidden" style={{ background: '#fafcfa' }}>

        {/* Header droite */}
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0" style={{ background: '#f8fbf8' }}>
          <MapPin className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-700 text-sm">Zone du projet</span>
          {detectedRegion && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Région détectée
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ── Zone (nom libre) ──────────────────────────── */}
          <div className="space-y-1.5">
            <label className="form-label flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-green-500" />
              Zone d'intervention / périmètre (nom libre)
              <span className="text-gray-400 font-normal normal-case text-xs"> (optionnel)</span>
            </label>
            <input type="text" className="form-input text-sm"
              value={form.zone || ''}
              onChange={e => onChange('zone', e.target.value)}
              placeholder="Ex : Zone côtière Nord, Périmètre irrigué d'Anosy…" />
          </div>

          {/* ── Sélection rapide ──────────────────────────── */}
          <div className="space-y-1.5">
            <label className="form-label flex items-center gap-2">
              <Map className="w-3.5 h-3.5 text-green-500" />
              Accès rapide — Région
            </label>
            <select className="form-input text-sm"
              value={detectedRegion?.nom ?? ''}
              onChange={e => {
                const r = REGIONS_GEO.find(r => r.nom === e.target.value);
                if (r) handleRegionShortcut(r);
              }}>
              <option value="">— Sélectionner ou cliquer sur la carte —</option>
              {REGIONS_GEO.map(r => (
                <option key={r.id} value={r.nom}>{r.nom} ({r.province})</option>
              ))}
            </select>
          </div>

          {/* ── Région détectée ───────────────────────────── */}
          {detectedRegion && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">{detectedRegion.nom}</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-auto">
                  {detectedRegion.province}
                </span>
              </div>
              {apiRegionInfo && (
                <p className="text-xs text-green-600 mt-0.5">
                  ID région : #{apiRegionInfo.id}
                </p>
              )}
            </div>
          )}


{/* ── Adresse locale détectée ───────────────────── */}
          {(geoAddress || geoLoading) && (
            <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm ${
              geoLoading
                ? 'bg-gray-50 border-gray-200 text-gray-400'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              {geoLoading
                ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" />
                : <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
              }
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide block mb-0.5 text-green-700">
                  Districts de la région
                </span>
                <span className="leading-snug">
                  {geoLoading ? 'Recherche de l\'adresse…' : geoAddress}
                </span>
              </div>
            </div>
          )}



          {/* ── Districts ─────────────────────────────────── */}
          {form.region_id && (
            <div className="space-y-1.5">
              <label className="form-label flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-green-500" />
                District
                <span className="text-gray-400 font-normal normal-case text-xs">(optionnel)</span>
                {loadingDistricts && <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin ml-auto" />}
              </label>
              {loadingDistricts ? (
                <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  <span className="text-sm text-gray-400">Chargement des districts…</span>
                </div>
              ) : districts.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                  {districts.map((d, idx) => (
                    <button key={d.id} type="button"
                      onClick={() => {
                        const newId = districtId === d.id ? undefined : d.id;
                        setDistrictId(newId);
                        setCommuneId(undefined);
                        setFokontanyId(undefined);
                        onChange('district_id',  newId);
                        onChange('commune_id',   undefined);
                        onChange('fokontany_id', undefined);
                      }}
                      className={`w-full text-left rounded-xl border transition-all flex items-center gap-3 px-3 py-2.5 ${
                        districtId === d.id
                          ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-100'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50 hover:shadow-sm'
                      }`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        districtId === d.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{idx + 1}</span>
                      <span className="flex-1 truncate text-sm font-medium">{d.nom}</span>
                      {districtId === d.id
                        ? <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic px-3 py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Aucun district disponible
                </div>
              )}
            </div>
          )}

          {/* ── Communes ──────────────────────────────────── */}
          {districtId && (
            <div className="space-y-1.5">
              <label className="form-label flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-green-500" />
                Commune
                <span className="text-gray-400 font-normal normal-case text-xs">(optionnel)</span>
                {loadingCommunes && <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin ml-auto" />}
              </label>
              {loadingCommunes ? (
                <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  <span className="text-sm text-gray-400">Chargement des communes…</span>
                </div>
              ) : communes.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                  {communes.map((c, idx) => (
                    <button key={c.id} type="button"
                      onClick={() => {
                        const newId = communeId === c.id ? undefined : c.id;
                        setCommuneId(newId);
                        setFokontanyId(undefined);
                        onChange('commune_id',   newId);
                        onChange('fokontany_id', undefined);
                      }}
                      className={`w-full text-left rounded-xl border transition-all flex items-center gap-3 px-3 py-2.5 ${
                        communeId === c.id
                          ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50 hover:shadow-sm'
                      }`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        communeId === c.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{idx + 1}</span>
                      <span className="flex-1 truncate text-sm font-medium">{c.nom}</span>
                      {communeId === c.id
                        ? <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic px-3 py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Aucune commune disponible
                </div>
              )}
            </div>
          )}

          {/* ── Fokontany ─────────────────────────────────── */}
          {communeId && (
            <div className="space-y-1.5">
              <label className="form-label flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-green-500" />
                Fokontany
                <span className="text-gray-400 font-normal normal-case text-xs">(optionnel)</span>
              </label>
              {fokontanyList.length > 0 ? (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-0.5">
                  {fokontanyList.map((f, idx) => (
                    <button key={f.id} type="button"
                      onClick={() => {
                        const newId = fokontanyId === f.id ? undefined : f.id;
                        setFokontanyId(newId);
                        onChange('fokontany_id', newId);
                      }}
                      className={`w-full text-left rounded-xl border transition-all flex items-center gap-3 px-3 py-2.5 ${
                        fokontanyId === f.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm'
                      }`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        fokontanyId === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{idx + 1}</span>
                      <span className="flex-1 truncate text-sm font-medium">{f.nom}</span>
                      {fokontanyId === f.id
                        ? <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      }
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic px-3 py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Aucun fokontany disponible
                </div>
              )}
            </div>
          )}

          {/* ── Coordonnées GPS ───────────────────────────── */}
          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-green-500" />
              Coordonnées GPS précises
              {clickedCoord && (
                <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full ml-auto">
                  Depuis la carte ✓
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Latitude</span>
                <input type="number" step="any" className="form-input font-mono text-sm"
                  value={form.latitude ?? ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    onChange('latitude', val);
                    if (!isNaN(val) && form.longitude) setClickedCoord({ lat: val, lng: form.longitude });
                  }}
                  placeholder="-18.913700" />
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Longitude</span>
                <input type="number" step="any" className="form-input font-mono text-sm"
                  value={form.longitude ?? ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    onChange('longitude', val);
                    if (!isNaN(val) && form.latitude) setClickedCoord({ lat: form.latitude, lng: val });
                  }}
                  placeholder="47.536100" />
              </div>
            </div>
          </div>

          {/* ── Description zone ──────────────────────────── */}
          <div className="space-y-1">
            <label className="form-label flex items-center gap-2">
              <TreePine className="w-3.5 h-3.5 text-green-500" />
              Description de la zone
            </label>
            <textarea className="form-input text-sm" rows={3}
              value={form.zone_description || ''}
              onChange={e => onChange('zone_description', e.target.value)}
              placeholder="Contexte géographique et environnemental de la zone d'intervention…" />
          </div>
        </div>
      </div>
    </div>
  );
}