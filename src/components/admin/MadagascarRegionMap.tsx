// src/components/admin/MadagascarRegionMap.tsx
// Carte SVG interactive de Madagascar — sélection des 22 régions par clic

import { useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface RegionData {
  id: string;
  nom: string;
  province: string;
  latitude: number;
  longitude: number;
  // coordonnées SVG du centroïde pour le label
  cx: number;
  cy: number;
  // path SVG simplifié de la région
  path: string;
  color: string;
}

// ─── Données géographiques des 22 régions ─────────────────────
// Paths SVG approximatifs de Madagascar (viewBox 0 0 400 900)
// Coordonnées calibrées sur la forme réelle de Madagascar
export const REGIONS_DATA: RegionData[] = [
  // ── DIANA (nord extrême)
  {
    id: 'diana',
    nom: 'Diana',
    province: 'Antsiranana',
    latitude: -12.2794,
    longitude: 49.2913,
    cx: 235,
    cy: 48,
    path: 'M 180,20 L 290,15 L 310,30 L 280,60 L 250,75 L 210,65 L 185,50 Z',
    color: '#0891b2',
  },
  // ── SAVA (nord-est)
  {
    id: 'sava',
    nom: 'Sava',
    province: 'Antsiranana',
    latitude: -14.2,
    longitude: 50.1667,
    cx: 295,
    cy: 100,
    path: 'M 250,75 L 310,30 L 340,50 L 340,130 L 305,140 L 270,120 L 255,95 Z',
    color: '#06b6d4',
  },
  // ── SOFIA (nord-ouest)
  {
    id: 'sofia',
    nom: 'Sofia',
    province: 'Mahajanga',
    latitude: -15.5,
    longitude: 48.5,
    cx: 145,
    cy: 130,
    path: 'M 80,80 L 185,50 L 210,65 L 255,95 L 270,120 L 230,155 L 175,165 L 110,150 L 75,115 Z',
    color: '#7c3aed',
  },
  // ── ANALANJIROFO (nord-est côte)
  {
    id: 'analanjirofo',
    nom: 'Analanjirofo',
    province: 'Toamasina',
    latitude: -16.8,
    longitude: 49.7667,
    cx: 305,
    cy: 175,
    path: 'M 270,120 L 305,140 L 340,130 L 345,190 L 320,215 L 285,205 L 265,175 Z',
    color: '#16a34a',
  },
  // ── BOENY (nord-ouest côte)
  {
    id: 'boeny',
    nom: 'Boeny',
    province: 'Mahajanga',
    latitude: -15.7167,
    longitude: 46.3167,
    cx: 90,
    cy: 195,
    path: 'M 55,150 L 110,150 L 175,165 L 180,215 L 145,245 L 85,235 L 50,200 Z',
    color: '#d97706',
  },
  // ── BETSIBOKA
  {
    id: 'betsiboka',
    nom: 'Betsiboka',
    province: 'Mahajanga',
    latitude: -16.8333,
    longitude: 46.8333,
    cx: 160,
    cy: 225,
    path: 'M 110,150 L 175,165 L 230,155 L 265,175 L 260,230 L 225,255 L 180,265 L 145,245 L 175,215 Z',
    color: '#b45309',
  },
  // ── ALAOTRA-MANGORO (centre-est)
  {
    id: 'alaotra-mangoro',
    nom: 'Alaotra-Mangoro',
    province: 'Toamasina',
    latitude: -17.6667,
    longitude: 48.6667,
    cx: 280,
    cy: 250,
    path: 'M 265,175 L 285,205 L 320,215 L 345,240 L 330,290 L 295,305 L 265,285 L 255,250 Z',
    color: '#15803d',
  },
  // ── MELAKY (ouest)
  {
    id: 'melaky',
    nom: 'Melaky',
    province: 'Mahajanga',
    latitude: -16.5,
    longitude: 44.6667,
    cx: 65,
    cy: 270,
    path: 'M 35,215 L 85,235 L 145,245 L 180,265 L 165,315 L 115,330 L 55,305 L 30,260 Z',
    color: '#92400e',
  },
  // ── BONGOLAVA
  {
    id: 'bongolava',
    nom: 'Bongolava',
    province: 'Antananarivo',
    latitude: -18.5,
    longitude: 45.8333,
    cx: 150,
    cy: 320,
    path: 'M 115,265 L 180,265 L 225,255 L 245,300 L 230,345 L 185,360 L 140,350 L 115,320 Z',
    color: '#c2410c',
  },
  // ── ANALAMANGA (centre — capitale)
  {
    id: 'analamanga',
    nom: 'Analamanga',
    province: 'Antananarivo',
    latitude: -18.9137,
    longitude: 47.5361,
    cx: 235,
    cy: 330,
    path: 'M 225,255 L 260,230 L 265,285 L 295,305 L 280,345 L 255,360 L 230,345 Z',
    color: '#dc2626',
  },
  // ── ATSINANANA (côte est centre)
  {
    id: 'atsinanana',
    nom: 'Atsinanana',
    province: 'Toamasina',
    latitude: -18.1443,
    longitude: 49.4024,
    cx: 325,
    cy: 325,
    path: 'M 295,305 L 330,290 L 355,310 L 355,370 L 325,385 L 300,365 L 285,340 Z',
    color: '#059669',
  },
  // ── ITASY
  {
    id: 'itasy',
    nom: 'Itasy',
    province: 'Antananarivo',
    latitude: -19.5,
    longitude: 46.6667,
    cx: 155,
    cy: 385,
    path: 'M 140,350 L 185,360 L 200,400 L 175,420 L 140,410 L 125,385 Z',
    color: '#7c3aed',
  },
  // ── VAKINANKARATRA (hautes terres)
  {
    id: 'vakinankaratra',
    nom: 'Vakinankaratra',
    province: 'Antananarivo',
    latitude: -20.0,
    longitude: 47.1667,
    cx: 220,
    cy: 405,
    path: 'M 185,360 L 230,345 L 255,360 L 270,400 L 255,440 L 220,455 L 190,440 L 175,415 Z',
    color: '#6d28d9',
  },
  // ── MENABE (côte ouest centre)
  {
    id: 'menabe',
    nom: 'Menabe',
    province: 'Toliara',
    latitude: -20.3,
    longitude: 44.3167,
    cx: 95,
    cy: 430,
    path: 'M 55,355 L 115,330 L 140,350 L 125,385 L 140,410 L 130,455 L 85,475 L 50,440 Z',
    color: '#b45309',
  },
  // ── HAUTE MATSIATRA
  {
    id: 'haute-matsiatra',
    nom: 'Haute Matsiatra',
    province: 'Fianarantsoa',
    latitude: -21.4527,
    longitude: 47.0858,
    cx: 195,
    cy: 490,
    path: 'M 175,415 L 190,440 L 220,455 L 235,495 L 215,525 L 180,530 L 160,505 L 155,465 Z',
    color: '#16a34a',
  },
  // ── VATOVAVY FITOVINANY (côte est sud)
  {
    id: 'vatovavy',
    nom: 'Vatovavy Fitovinany',
    province: 'Fianarantsoa',
    latitude: -21.5,
    longitude: 47.6667,
    cx: 295,
    cy: 470,
    path: 'M 270,400 L 300,365 L 325,385 L 340,420 L 335,475 L 305,500 L 275,490 L 260,455 Z',
    color: '#0f766e',
  },
  // ── AMORON'I MANIA
  {
    id: 'amoroni-mania',
    nom: "Amoron'i Mania",
    province: 'Fianarantsoa',
    latitude: -20.8333,
    longitude: 46.6667,
    cx: 230,
    cy: 455,
    path: 'M 220,455 L 255,440 L 260,455 L 275,490 L 260,510 L 235,495 Z',
    color: '#047857',
  },
  // ── ATSIMO-ATSINANANA (côte est extrême sud)
  {
    id: 'atsimo-atsinanana',
    nom: 'Atsimo-Atsinanana',
    province: 'Fianarantsoa',
    latitude: -22.9,
    longitude: 47.5333,
    cx: 295,
    cy: 560,
    path: 'M 275,490 L 305,500 L 335,475 L 345,540 L 330,590 L 295,600 L 270,575 L 265,535 Z',
    color: '#065f46',
  },
  // ── IHOROMBE (centre-sud)
  {
    id: 'ihorombe',
    nom: 'Ihorombe',
    province: 'Fianarantsoa',
    latitude: -22.4167,
    longitude: 46.1667,
    cx: 175,
    cy: 565,
    path: 'M 155,520 L 180,530 L 215,525 L 235,495 L 260,510 L 265,535 L 250,575 L 210,590 L 165,575 L 145,545 Z',
    color: '#134e4a',
  },
  // ── ATSIMO-ANDREFANA (grand sud-ouest)
  {
    id: 'atsimo-andrefana',
    nom: 'Atsimo-Andrefana',
    province: 'Toliara',
    latitude: -23.3568,
    longitude: 43.6917,
    cx: 110,
    cy: 610,
    path: 'M 55,475 L 85,475 L 130,455 L 145,545 L 165,575 L 155,630 L 120,665 L 65,650 L 40,590 L 40,515 Z',
    color: '#78350f',
  },
  // ── ANOSY (sud-est)
  {
    id: 'anosy',
    nom: 'Anosy',
    province: 'Toliara',
    latitude: -24.9667,
    longitude: 46.8333,
    cx: 240,
    cy: 650,
    path: 'M 210,590 L 250,575 L 265,535 L 270,575 L 295,600 L 310,650 L 285,680 L 245,685 L 215,660 Z',
    color: '#92400e',
  },
  // ── ANDROY (extrême sud)
  {
    id: 'androy',
    nom: 'Androy',
    province: 'Toliara',
    latitude: -25.1667,
    longitude: 45.3,
    cx: 170,
    cy: 690,
    path: 'M 120,665 L 155,630 L 165,575 L 210,590 L 215,660 L 195,700 L 155,715 L 115,700 Z',
    color: '#7c2d12',
  },
];

// ─── Couleurs provinces ────────────────────────────────────────
const PROVINCE_COLORS: Record<string, string> = {
  'Antsiranana':  '#0891b2',
  'Mahajanga':    '#d97706',
  'Toamasina':    '#16a34a',
  'Antananarivo': '#dc2626',
  'Fianarantsoa': '#047857',
  'Toliara':      '#78350f',
};

// ─── Component ────────────────────────────────────────────────
interface Props {
  selectedRegionId?: string | null;
  onSelectRegion: (region: RegionData) => void;
  highlightProvinces?: boolean;
}

export default function MadagascarRegionMap({
  selectedRegionId,
  onSelectRegion,

}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setZoom(z => Math.min(z + 0.3, 3))}
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom avant"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.3, 0.5))}
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={reset}
          className="w-8 h-8 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Réinitialiser"
        >
          <RotateCcw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Provinces</p>
        <div className="space-y-1">
          {Object.entries(PROVINCE_COLORS).map(([prov, color]) => (
            <div key={prov} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-gray-600">{prov}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3 h-3 text-green-600" />
          Cliquez sur une région pour la sélectionner
        </div>
      </div>

      {/* SVG Map */}
      <div
        className="flex-1 overflow-hidden rounded-xl cursor-grab active:cursor-grabbing"
        style={{ background: 'linear-gradient(135deg, #e8f4f8 0%, #d1ecf5 100%)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 400 740"
          className="w-full h-full select-none"
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.1s ease',
          }}
        >
          {/* Ocean background */}
          <rect x="0" y="0" width="400" height="740" fill="#c8e8f5" rx="4" />

          {/* Grid lines (ocean effect) */}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`h${i}`}
              x1="0" y1={i * 100} x2="400" y2={i * 100}
              stroke="white" strokeWidth="0.5" opacity="0.3"
            />
          ))}

          {/* Region paths */}
          {REGIONS_DATA.map((region) => {
            const isSelected = selectedRegionId === region.id;
            const isHovered  = hovered === region.id;
            const baseColor  = PROVINCE_COLORS[region.province] || region.color;

            return (
              <g key={region.id}>
                {/* Shadow */}
                {(isSelected || isHovered) && (
                  <path
                    d={region.path}
                    fill="none"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    transform="translate(2,2)"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Region fill */}
                <path
                  d={region.path}
                  fill={isSelected ? '#1a6b45' : isHovered ? `${baseColor}dd` : `${baseColor}99`}
                  stroke={isSelected ? '#0f4027' : 'white'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeLinejoin="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.15s, stroke 0.15s',
                    filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none',
                  }}
                  onMouseEnter={() => setHovered(region.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRegion(region);
                  }}
                />

                {/* Selected pin icon */}
                {isSelected && (
                  <g transform={`translate(${region.cx - 7}, ${region.cy - 18})`} style={{ pointerEvents: 'none' }}>
                    <circle cx="7" cy="7" r="9" fill="white" opacity="0.9" />
                    <text x="7" y="11" textAnchor="middle" fontSize="10">📍</text>
                  </g>
                )}

                {/* Region label */}
                <text
                  x={region.cx}
                  y={isSelected ? region.cy + 8 : region.cy + 4}
                  textAnchor="middle"
                  fontSize={isSelected ? 7.5 : 6.5}
                  fontWeight={isSelected ? '800' : '600'}
                  fill={isSelected ? 'white' : 'rgba(255,255,255,0.95)'}
                  style={{
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {region.nom.length > 12 ? region.nom.split(' ')[0] : region.nom}
                </text>
              </g>
            );
          })}

          {/* Hover tooltip */}
          {hovered && !REGIONS_DATA.find(r => r.id === hovered && r.id === selectedRegionId) && (() => {
            const r = REGIONS_DATA.find(r => r.id === hovered);
            if (!r) return null;
            return (
              <g transform={`translate(${r.cx}, ${r.cy - 28})`} style={{ pointerEvents: 'none' }}>
                <rect x="-35" y="-12" width="70" height="22" rx="4" fill="rgba(0,0,0,0.75)" />
                <text x="0" y="4" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="white">
                  {r.nom}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
