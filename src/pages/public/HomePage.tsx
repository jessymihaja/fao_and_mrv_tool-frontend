// src/pages/public/HomePage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Popup, useMap } from 'react-leaflet';
import { format } from 'date-fns';
import { statsApi, publicProjectApi, cmsApi } from '@/api/services';
import {
  ChevronLeft, ChevronRight, ArrowRight, Leaf,
  TrendingUp, DollarSign, FolderKanban,
  MapPin, ExternalLink, Play, Pause, Quote, Clock, Landmark, Users,
  Building2, HandCoins, Sparkles, Compass, Target,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Project, Slider, RegionMapPoint, ProjectZoneMapPoint, ProjectGeographicZoneMapPoint, Partner } from '@/types';
import { useProjectSearch } from '@/hooks/useProjectSearch';
import { filterMapProjects } from '@/utils/projectSearch';
import ProjectSearch from '@/components/public/ProjectSearch';
import { sectorMapColor, blendSectorColors } from '@/utils/sectorColors';

// ─── Constantes ───────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

// ─── Couleurs par secteur climatique (carte cartographique) ───────────
// Voir src/utils/sectorColors.ts (utilitaire partagé avec ProjectsPage et
// ProjectDetailPage pour garantir un code couleur cohérent partout).

// ─── Couleurs des zones géographiques multiples (région/district/commune) ──
// Mêmes couleurs que le panneau admin (ProjectGeographicZonesPanel) — à
// garder synchronisées si l'une des deux change.
const GEO_ZONE_COLOR: Record<'region' | 'district' | 'commune', string> = {
  region: '#2563eb',
  district: '#9333ea',
  commune: '#ea580c',
};

// Puces colorées listant le(s) secteur(s) climatique(s) d'un projet/zone —
// utilisées dans les popups de la carte pour détailler la couleur fusionnée.
function SectorChips({ designations }: { designations?: string[] }) {
  const list = (designations ?? []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.map(d => (
        <span
          key={d}
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
          style={{ background: sectorMapColor(d) }}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// Images de fallback Unsplash — paysages Madagascar / nature
const FALLBACK_SLIDES = [
  {
    id: 0,
    titre: 'Financer la résilience climatique de Madagascar',
    sous_titre: 'GCF Madagascar mobilise des ressources internationales pour protéger les communautés et les écosystèmes face aux changements climatiques.',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&fit=crop',
    cta_text: 'Découvrir nos projets',
    cta_url: '/projets',
    is_active: true,
    ordre: 0,
  },
  {
    id: -1,
    titre: 'Des projets dans les 22 régions',
    sous_titre: 'De Diego-Suarez à Fort-Dauphin, nos projets climatiques touchent chaque région de la grande île pour un avenir durable.',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&q=80&fit=crop',
    cta_text: 'Voir la carte',
    cta_url: '/projets',
    is_active: true,
    ordre: 1,
  },
  {
    id: -2,
    titre: 'Transparence et impact mesurable',
    sous_titre: 'Toutes nos données financières et de suivi de projets sont accessibles au public. La redevabilité est au cœur de notre mission.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&fit=crop',
    cta_text: 'Nos rapports',
    cta_url: '/projets',
    is_active: true,
    ordre: 2,
  },
];

// ─── HERO SLIDER ──────────────────────────────────────────────
function HeroSlider() {
  const [current, setCurrent]   = useState(0);
  const [playing, setPlaying]   = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string | number, boolean>>({});
  const timerRef                = useRef<ReturnType<typeof setInterval>>(undefined);

  const { data: apiSlides = [] } = useQuery({
    queryKey: ['public-slider'],
    queryFn: () => cmsApi.slider().then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    staleTime: 60_000,
  });

  // Fusionner slides API + fallbacks
  const slides: (Slider & { image?: string })[] = (apiSlides as Slider[]).length > 0
    ? (apiSlides as Slider[]).filter(s => s.is_active).sort((a, b) => a.ordre - b.ordre)
    : (FALLBACK_SLIDES as unknown as Slider[]);

  const total = slides.length;

  const go = useCallback((idx: number) => {
    setCurrent(((idx % total) + total) % total);
  }, [total]);

  // Auto-play
  useEffect(() => {
    if (playing && total > 1) {
      timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 6000);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, total]);

  const getImageUrl = (slide: Slider & { image?: string }) => {
    if (!slide.image) return null;
    // Si c'est une URL complète (fallback Unsplash)
    if (slide.image.startsWith('http')) return slide.image;
    // Si c'est un path storage Laravel
    return `${API_BASE}/storage/${slide.image}`;
  };

  if (!total) return null;

  const slide = slides[current];
  {/*const imgUrl = getImageUrl(slide);*/}

  return (
    <section className="relative h-[600px] md:h-[680px] overflow-hidden">
      {/* Slides background */}
      {slides.map((s, i) => {
        const url = getImageUrl(s);
        const isBroken = brokenImages[s.id];
        return (
          <div
            key={s.id}
            className="absolute inset-0 transition-all duration-1000"
            style={{
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'scale(1)' : 'scale(1.04)',
              zIndex: i === current ? 1 : 0,
            }}
          >
            {url && !isBroken ? (
              <img
                src={url}
                alt={s.titre}
                className="w-full h-full object-cover"
                onError={() => setBrokenImages(b => ({ ...b, [s.id]: true }))}
                style={{ filter: 'brightness(0.45)' }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: [
                    'linear-gradient(135deg, #0f4027 0%, #1a6b45 60%, #0a3020 100%)',
                    'linear-gradient(135deg, #1565c0 0%, #1a237e 100%)',
                    'linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)',
                  ][i % 3],
                }}
              />
            )}
            {/* Overlay gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.25) 100%)',
              }}
            />
          </div>
        );
      })}

      {/* Decorative pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          zIndex: 2,
        }}
      />

      {/* Content */}
      <div className="relative flex items-center h-full max-w-7xl mx-auto px-6 md:px-10" style={{ zIndex: 3 }}>
        <div className="max-w-2xl text-white">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Leaf className="w-3.5 h-3.5 text-green-300" />
            <span>Green Climate Fund Madagascar</span>
          </div>

          {/* Title */}
          <h1
            key={`title-${current}`}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            style={{ animation: 'slideInUp 0.6s ease forwards', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
          >
            {slide.titre}
          </h1>

          {/* Subtitle */}
          <p
            key={`sub-${current}`}
            className="text-lg md:text-xl text-white/80 leading-relaxed mb-8"
            style={{ animation: 'slideInUp 0.6s 0.1s ease both' }}
          >
            {slide.sous_titre}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Link
              to={slide.cta_url || '/projets'}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: 'var(--gcf-gold)', color: '#1a1a1a' }}
            >
              {slide.cta_text || 'Découvrir'} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm border border-white/30 hover:bg-white/10 transition-all"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      {total > 1 && (
        <>
          {/* Prev / Next */}
          {[
            { dir: -1, icon: ChevronLeft,  side: 'left-4' },
            { dir:  1, icon: ChevronRight, side: 'right-4' },
          ].map(({ dir, icon: Icon, side }) => (
            <button
              key={side}
              onClick={() => go(current + dir)}
              className={`absolute ${side} top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all hover:scale-110`}
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', zIndex: 4 }}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}

          {/* Bottom bar: dots + play/pause + counter */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 px-6" style={{ zIndex: 4 }}>
            {/* Play/pause */}
            <button
              onClick={() => setPlaying(p => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className="transition-all rounded-full"
                  style={{
                    width:   i === current ? 28 : 8,
                    height:  8,
                    background: i === current ? 'var(--gcf-gold)' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>

            {/* Counter */}
            <span className="text-white/50 text-xs font-mono">{current + 1}/{total}</span>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full" style={{ zIndex: 4 }}>
            {playing && (
              <div
                key={current}
                className="h-full"
                style={{
                  background: 'var(--gcf-gold)',
                  animation: 'progressBar 6s linear forwards',
                }}
              />
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}

// ─── STATS SECTION ────────────────────────────────────────────
const fmtCompact = (n: number | undefined | null) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString('fr-MG');
};

// Correction multidevises (§11-14) : ces montants (budget approuvé,
// cofinancements...) peuvent être en AR, USD ou EUR selon les financements
// concernés. On n'affiche donc plus jamais un total unique étiqueté "Ar" —
// chaque devise réellement présente est affichée séparément, ex.
// "700k USD · 100k AR". Retourne "—" si aucun montant n'est enregistré.
const fmtDevises = (totaux?: Partial<Record<string, number>>): string => {
  const entries = Object.entries(totaux ?? {}).filter(([, v]) => (v ?? 0) !== 0);
  if (entries.length === 0) return '0';
  return entries.map(([devise, montant]) => `${fmtCompact(montant)} ${devise}`).join(' · ');
};

function StatCard({ label, value, icon: Icon, color, bg, suffix = '' }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string; suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 text-center transition-all hover:shadow-lg hover:-translate-y-1"
      style={{ border: `2px solid ${color}20`, background: `linear-gradient(135deg, white, ${bg}80)` }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="text-2xl font-extrabold mb-1" style={{ color }}>
        {value}{suffix}
      </div>
      <div className="text-xs text-gray-500 font-medium leading-tight">{label}</div>
    </div>
  );
}

function LastUpdatedBadge({ date }: { date?: string | null }) {
  if (!date) return null;
  let formatted: string;
  try {
    formatted = format(new Date(date), 'dd/MM/yyyy HH:mm');
  } catch {
    return null;
  }
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mx-auto mt-6">
      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--gcf-green)' }} />
      Dernière mise à jour des données : <span className="font-bold text-gray-700">{formatted}</span>
    </div>
  );
}

function StatsSection() {
  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => statsApi.public().then(r => r.data),
  });

  const gcfItems = [
    { label: 'Montant total approuvé', value: fmtDevises(stats?.budget_total), icon: DollarSign, color: '#b45309', bg: '#fef3c7' },
    { label: 'Projets financés par le GCF', value: stats?.total_projets ?? 0, icon: FolderKanban, color: '#1a6b45', bg: '#dcfce7' },
    { label: 'Bénéficiaires', value: fmtCompact(stats?.nombre_beneficiaires), icon: Users, color: '#0369a1', bg: '#e0f2fe' },
    { label: 'Régions couvertes', value: stats?.nombre_regions ?? 0, icon: MapPin, color: '#7c3aed', bg: '#ede9fe' },
  ];

  const autres = stats?.autres_financements;
  const autresItems = [
    { label: 'Budget total mobilisé hors GCF', value: fmtDevises(autres?.budget_total_hors_gcf), icon: TrendingUp, color: '#1a6b45', bg: '#dcfce7' },
    { label: 'Cofinancements publics', value: fmtDevises(autres?.cofinancement_public), icon: Building2, color: '#0891b2', bg: '#cffafe' },
    { label: 'Cofinancements privés', value: fmtDevises(autres?.cofinancement_prive), icon: Landmark, color: '#be185d', bg: '#fce7f3' },
    { label: 'Bailleurs partenaires', value: autres?.nombre_bailleurs_partenaires ?? 0, icon: Users, color: '#2563eb', bg: '#dbeafe' },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-4">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
            Impact en chiffres
          </span>
          <h2 className="text-3xl font-extrabold text-gray-800 mt-2">GCF Madagascar aujourd'hui</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Données calculées en temps réel depuis notre base de données de projets.
          </p>
        </div>
        <div className="text-center">
          <LastUpdatedBadge date={stats?.derniere_mise_a_jour} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
          {/* Colonne 1 : Financements GCF */}
          <div className="flex flex-col items-center"> {/* Ajout de flex-col et items-center */}
            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2 justify-center"> {/* justify-center ajouté */}
              <Leaf className="w-4 h-4" style={{ color: 'var(--gcf-green)' }} /> Financements GCF {/* Icône changée */}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {gcfItems.map(item => <StatCard key={item.label} {...item} />)}
            </div>
          </div>

          {/* Colonne 2 : Autres financements */}
          <div className="flex flex-col items-center"> {/* Ajout de flex-col et items-center */}
            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2 justify-center"> {/* justify-center ajouté */}
              <HandCoins className="w-4 h-4 text-cyan-600" /> Autres financements {/* Icône changée */}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {autresItems.map(item => <StatCard key={item.label} {...item} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PERSPECTIVES DES PROJETS ─────────────────────────────────
// `type` vient du référentiel extensible côté backend (chaîne libre), donc
// on ne peut plus le typer en enum fixe : on garde une correspondance pour
// les désignations connues et on retombe sur une icône par défaut sinon.
const PERSPECTIVE_TYPE_ICON: Record<string, React.ElementType> = {
  extension: Compass, perennisation: Target, nouveau_financement: HandCoins, autre: Sparkles,
};

function PerspectivesSection() {
  const { data: stats } = useQuery({
    queryKey: ['public-perspectives-stats'],
    queryFn: () => statsApi.perspectives().then(r => r.data),
  });

  const cards = [
    { label: 'Projets en préparation', value: stats?.projets_en_preparation ?? 0, icon: Sparkles, color: '#c2410c', bg: '#ffedd5' },
    { label: 'En recherche de financement', value: stats?.projets_recherche_financement ?? 0, icon: HandCoins, color: '#7c3aed', bg: '#ede9fe' },
    { label: "Extensions envisagées", value: stats?.projets_extension_envisagee ?? 0, icon: Compass, color: '#0891b2', bg: '#cffafe' },
    { label: 'Pérennisation envisagée', value: stats?.projets_perennisation_envisagee ?? 0, icon: Target, color: '#059669', bg: '#d1fae5' },
  ];

  return (
    <section className="py-20" style={{ background: 'linear-gradient(180deg, #f8faf9, white)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
            Vision future
          </span>
          <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Perspectives des projets</h2>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto">
            Ce que les projets enregistrés dans la plateforme envisagent pour la suite : extensions, pérennisation, nouveaux financements.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-6 text-center bg-white shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: bg }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <div className="text-3xl font-extrabold mb-1" style={{ color }}>{value}</div>
              <div className="text-xs text-gray-500 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {stats?.apercu && stats.apercu.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {stats.apercu.map(p => {
              const Icon = p.type ? (PERSPECTIVE_TYPE_ICON[p.type] ?? Sparkles) : Sparkles;
              return (
                <div key={p.id} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm flex gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#dcfce7' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--gcf-green)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{p.titre}</p>
                    <p className="text-xs text-gray-400 mb-1">{p.projet}</p>
                    {p.impact_futur_attendu && (
                      <p className="text-sm text-gray-600 line-clamp-2">{p.impact_futur_attendu}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <Link
            to="/perspectives"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--gcf-green)' }}
          >
            Voir toutes les perspectives <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── AND SECTION ──────────────────────────────────────────────
function ANDSection() {
  const andImages = [
    {
      src: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80&fit=crop',
      label: 'Politique climatique nationale',
    },
    {
      src: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80&fit=crop',
      label: 'Coordination interministérielle',
    },
    {
      src: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&q=80&fit=crop',
      label: 'Accès aux financements GCF',
    },
  ];

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Text */}
          <div>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
              Gouvernance
            </span>
            <h2 className="text-4xl font-extrabold text-gray-800 mt-2 mb-6 leading-tight">
              L'Autorité Nationale{' '}
              <span className="px-2 py-0.5 rounded-lg" style={{ background: 'var(--gcf-green)', color: 'white' }}>
                Désignée
              </span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4 text-lg">
              L'<strong>AND (Autorité Nationale Désignée)</strong> est le point focal officiel de Madagascar auprès du Green Climate Fund.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Elle coordonne l'accès aux financements climatiques internationaux, valide les projets soumis au GCF et garantit leur alignement avec les priorités nationales d'adaptation et d'atténuation du changement climatique.
            </p>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 relative rounded-2xl overflow-hidden group shadow-md" style={{ height: 220 }}>
              <img
                src={andImages[0].src}
                alt={andImages[0].label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">{andImages[0].label}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--gcf-gold)', color: '#1a1a1a' }}>AND</span>
              </div>
            </div>
            {andImages.slice(1).map(({ src, label }) => (
              <div key={label} className="relative rounded-2xl overflow-hidden group shadow-md" style={{ height: 140 }}>
                <img src={src} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── MAP SECTION ──────────────────────────────────────────────
// Mêmes libellés de statut que dans l'admin (Status.designation) — les
// classes CSS globales `badge-*` ne correspondaient à aucun statut réel
// (elles utilisaient des slugs du type "actif"/"termine" au lieu des
// libellés effectifs comme "En cours"/"Clôturé"), d'où ce mapping explicite.
const STATUT_STYLE: Record<string, string> = {
  'Concept Note':     'bg-blue-50 text-blue-600 border border-blue-100',
  'Funding Proposal': 'bg-violet-50 text-violet-600 border border-violet-100',
  'En cours':         'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'Clôturé':          'bg-slate-50 text-slate-500 border border-slate-100',
};
const statutStyle = (s: string | null) => STATUT_STYLE[s ?? ''] ?? 'bg-gray-50 text-gray-500 border border-gray-100';

function RegionProjectsList({ region }: { region: RegionMapPoint }) {
  return (
    <div className="min-w-[220px] max-w-[260px]">
      <p className="font-bold text-sm text-gray-800 mb-0.5">{region.region}</p>
      <p className="text-[11px] text-gray-400 mb-2">{region.projects.length} projet{region.projects.length > 1 ? 's' : ''}</p>
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {region.projects.map(p => {
          const pColor = blendSectorColors(p.domaines_intervention);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 pl-1.5 border-l-[3px]"
              style={{ borderLeftColor: pColor.fillColor }}
            >
              <Link to={`/projets/${p.id}`} className="text-xs text-gray-700 hover:text-green-700 hover:underline truncate flex-1">
                {p.titre}
              </Link>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${statutStyle(p.statut)}`}>
                {p.statut ?? '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Centre & zoom par défaut de la carte (Madagascar) — réutilisés pour
// revenir à l'état initial après réinitialisation d'une recherche.
const MAP_DEFAULT_CENTER: [number, number] = [-18.9137, 46.8691];
const MAP_DEFAULT_ZOOM = 6;

/**
 * Pilote automatiquement la vue de la carte (zoom/centrage) en fonction des
 * résultats de recherche courants : `fitBounds` sur plusieurs résultats,
 * `flyTo` sur un résultat unique, retour à la vue par défaut lorsque la
 * recherche est réinitialisée. Ne modifie jamais la vue en dehors de ces
 * transitions (comportement normal de la carte inchangé hors recherche).
 */
function MapAutoFit({ isActive, bounds, singleCenter }: {
  isActive: boolean;
  bounds: [number, number][];
  singleCenter: [number, number] | null;
}) {
  const map = useMap();
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive) {
      if (singleCenter) {
        map.flyTo(singleCenter, 11, { duration: 0.8 });
      } else if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    } else if (wasActive.current) {
      map.flyTo(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, { duration: 0.8 });
    }
    wasActive.current = isActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, JSON.stringify(bounds), singleCenter?.[0], singleCenter?.[1]]);

  return null;
}

function MapSection() {
  const [selected, setSelected] = useState<RegionMapPoint | null>(null);
  const { data } = useQuery({
    queryKey: ['map-regions'],
    queryFn: () => publicProjectApi.mapData().then(r => r.data),
  });
  const regionsList = Array.isArray(data?.regions) ? data!.regions : [];
  const projectZones = Array.isArray(data?.project_zones) ? data!.project_zones : [];
  const projectGeoZones = Array.isArray(data?.project_geographic_zones) ? data!.project_geographic_zones : [];
  const totalProjectsOnMap = data?.total_projects_on_map ?? 0;

  // ── Recherche globale ────────────────────────────────────────────────
  const search = useProjectSearch();

  // Régions dont on ne garde que les projets correspondant à la recherche
  // (une région sans aucun projet correspondant est masquée) ; zones dont
  // le projet ne correspond pas sont masquées également.
  const visibleRegions = search.isActive
    ? regionsList
        .map(r => ({ ...r, projects: filterMapProjects(r.projects, search.debouncedQuery) }))
        .filter(r => r.projects.length > 0)
    : regionsList;
  const visibleZones: ProjectZoneMapPoint[] = search.isActive
    ? filterMapProjects(projectZones, search.debouncedQuery)
    : projectZones;
  const visibleGeoZones: ProjectGeographicZoneMapPoint[] = search.isActive
    ? filterMapProjects(projectGeoZones, search.debouncedQuery)
    : projectGeoZones;

  // Légende des secteurs climatiques réellement présents sur la carte
  // (dérivée des zones visibles, pour toujours rester à jour même si de
  // nouveaux secteurs sont ajoutés depuis le back-office).
  const legendSectors = Array.from(
    new Set([...visibleZones, ...visibleGeoZones].flatMap(z => (z.domaines_intervention ?? []).filter(Boolean)))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const matchedCount = search.isActive
    ? visibleRegions.reduce((s, r) => s + r.projects.length, 0) + visibleZones.length + visibleGeoZones.length
    : undefined;

  // Désélectionner le détail région affiché s'il ne fait plus partie des
  // résultats visibles (évite d'afficher un panneau désynchronisé).
  useEffect(() => {
    if (selected && !visibleRegions.some(r => r.region_id === selected.region_id)) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.debouncedQuery]);

  // Cadrage automatique : bornes de tous les résultats visibles, ou centre
  // unique s'il n'y a qu'un seul résultat au total.
  const boundsForFit: [number, number][] = [
    ...visibleRegions.map(r => [r.latitude, r.longitude] as [number, number]),
    ...visibleZones.flatMap(z => z.zone_points.map(pt => [Number(pt.latitude), Number(pt.longitude)] as [number, number])),
    ...visibleGeoZones
      .filter(z => z.latitude !== null && z.longitude !== null)
      .map(z => [z.latitude as number, z.longitude as number] as [number, number]),
  ];
  const singleCenter: [number, number] | null =
    matchedCount === 1
      ? (visibleRegions.length === 1 && visibleRegions[0].projects.length === 1
          ? [visibleRegions[0].latitude, visibleRegions[0].longitude]
          : visibleZones.length === 1
            ? (() => {
                const pts = visibleZones[0].zone_points;
                const lat = pts.reduce((s, p) => s + Number(p.latitude), 0) / pts.length;
                const lng = pts.reduce((s, p) => s + Number(p.longitude), 0) / pts.length;
                return [lat, lng] as [number, number];
              })()
            : visibleGeoZones.length === 1 && visibleGeoZones[0].latitude !== null && visibleGeoZones[0].longitude !== null
              ? [visibleGeoZones[0].latitude, visibleGeoZones[0].longitude]
              : null)
      : null;

  return (
    <section style={{ background: 'var(--gcf-bg)' }} className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
            Cartographie
          </span>
          <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Projets sur la carte de Madagascar</h2>
          <p className="text-gray-500 mt-2">Cliquez sur une région pour voir tous les projets qui s'y trouvent</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg" style={{ height: '480px' }}>
            <MapContainer center={MAP_DEFAULT_CENTER} zoom={MAP_DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <MapAutoFit isActive={search.isActive} bounds={boundsForFit} singleCenter={singleCenter} />

              {visibleRegions.map((region) => {
                const regionSectors = blendSectorColors(
                  region.projects.flatMap(p => p.domaines_intervention ?? [])
                );
                return (
                  <CircleMarker
                    key={region.region_id}
                    center={[region.latitude, region.longitude]}
                    radius={Math.min(10 + region.projects.length * 2, 26)}
                    pathOptions={
                      search.isActive
                        ? { fillColor: '#f59e0b', color: 'white', weight: 3, fillOpacity: 0.9 }
                        : { fillColor: regionSectors.fillColor, color: regionSectors.color, weight: 2, fillOpacity: 0.85 }
                    }
                    eventHandlers={{ click: () => setSelected(region) }}
                  >
                    <Popup>
                      <RegionProjectsList region={region} />
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Zones officielles d'intervention des projets (points, lignes ou polygones) */}
              {visibleZones.map((p) => {
                // Sécurité : vérifier que zone_points existe et est un tableau
                if (!p.zone_points || !Array.isArray(p.zone_points)) {
                  return null;
                }

                // Conversion en coordonnées Leaflet
                const positions: [number, number][] = p.zone_points.map((pt) => [
                  Number(pt.latitude),
                  Number(pt.longitude)
                ]);

                const sectorColors = blendSectorColors(p.domaines_intervention);
                const zoneColor = search.isActive
                  ? { color: '#f59e0b', fillColor: sectorColors.fillColor }
                  : sectorColors;

                if (positions.length === 1) {
                  // Cercle pour un seul point
                  return (
                    <CircleMarker
                      key={`circle-${p.id}`}
                      center={positions[0]}
                      radius={8}
                      pathOptions={{ ...zoneColor, fillOpacity: 0.5, weight: 2 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-bold text-gray-800">{p.titre}</div>
                          {p.statut && <div className="text-xs text-gray-500 mt-0.5">{p.statut}</div>}
                          <SectorChips designations={p.domaines_intervention} />
                          <Link to={`/projets/${p.id}`} className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">
                            Voir le projet →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                } else if (positions.length === 2) {
                  // Ligne entre 2 points
                  return (
                    <Polyline
                      key={`line-${p.id}`}
                      positions={positions}
                      pathOptions={{ color: zoneColor.color, weight: 3 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-bold text-gray-800">{p.titre}</div>
                          {p.statut && <div className="text-xs text-gray-500 mt-0.5">{p.statut}</div>}
                          <SectorChips designations={p.domaines_intervention} />
                          <Link to={`/projets/${p.id}`} className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">
                            Voir le projet →
                          </Link>
                        </div>
                      </Popup>
                    </Polyline>
                  );
                } else if (positions.length >= 3) {
                  // Polygone pour 3 points ou plus
                  return (
                    <Polygon
                      key={`zone-${p.id}`}
                      positions={positions}
                      pathOptions={{ color: zoneColor.color, weight: 2, fillColor: zoneColor.fillColor, fillOpacity: 0.35 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-bold text-gray-800">{p.titre}</div>
                          {p.statut && <div className="text-xs text-gray-500 mt-0.5">{p.statut}</div>}
                          <SectorChips designations={p.domaines_intervention} />
                          <Link to={`/projets/${p.id}`} className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">
                            Voir le projet →
                          </Link>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                } else {
                  return null;
                }
              })}

              {/* Zones géographiques multiples (région/district/commune) —
                  un marqueur par association projet ↔ zone, distinct du
                  polygone zone_points ci-dessus */}
              {visibleGeoZones
                .filter(z => z.latitude !== null && z.longitude !== null)
                .map(z => (
                  <CircleMarker
                    key={`geo-zone-${z.id}`}
                    center={[z.latitude as number, z.longitude as number]}
                    radius={8}
                    pathOptions={
                      search.isActive
                        ? { color: '#f59e0b', fillColor: GEO_ZONE_COLOR[z.zone_type], fillOpacity: 0.7, weight: 2 }
                        : { color: GEO_ZONE_COLOR[z.zone_type], fillColor: GEO_ZONE_COLOR[z.zone_type], fillOpacity: 0.65, weight: 2 }
                    }
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-bold text-gray-800">{z.titre}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {z.zone_type === 'region' ? 'Région' : z.zone_type === 'district' ? 'District' : 'Commune'} : {z.name}
                        </div>
                        {z.statut && <div className="text-xs text-gray-500">{z.statut}</div>}
                        <SectorChips designations={z.domaines_intervention} />
                        <Link to={`/projets/${z.project_id}`} className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">
                          Voir le projet →
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
            </MapContainer>
          </div>

          <div className="space-y-3">
            {selected ? (
              <div className="card p-5 animate-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-gray-800 leading-tight flex-1">{selected.region}</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-2 text-xl leading-none">×</button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {selected.projects.length} projet{selected.projects.length > 1 ? 's' : ''} dans cette région
                </p>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {selected.projects.map(p => {
                    const pColor = blendSectorColors(p.domaines_intervention);
                    return (
                      <Link
                        key={p.id}
                        to={`/projets/${p.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border-l-4"
                        style={{ borderLeftColor: pColor.fillColor }}
                      >
                        <span className="text-sm text-gray-700 truncate flex-1">{p.titre}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statutStyle(p.statut)}`}>
                          {p.statut ?? '—'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : search.isActive ? (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-gray-700">Résultats de recherche</span>
                </div>
                <p className="text-sm text-gray-500">
                  {matchedCount === 0
                    ? 'Aucun projet ne correspond à votre recherche.'
                    : 'Cliquez sur un marqueur mis en évidence pour voir le détail.'}
                </p>
              </div>
            ) : (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-700">Sélectionnez une région</span>
                </div>
                <p className="text-sm text-gray-500">Cliquez sur une région de la carte pour afficher tous ses projets et leur statut.</p>
              </div>
            )}

            {/* Barre de recherche — toujours visible, quel que soit l'état de sélection/recherche */}
            <div className="card p-5">
              <ProjectSearch
                compact
                value={search.query}
                onChange={search.setQuery}
                onSubmit={search.submit}
                onReset={search.reset}
                resultsCount={search.isActive ? matchedCount : undefined}
              />
            </div>

            {/* Légende */}
            <div className="card p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Statuts des projets</p>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(STATUT_STYLE).map(([s, cls]) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {legendSectors.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Secteurs climatiques</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {legendSectors.map(sector => (
                    <div key={sector} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: sectorMapColor(sector) }}
                      />
                      <span className="text-xs text-gray-600">{sector}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 italic mt-3">
                  Une zone couvrant plusieurs secteurs affiche une couleur fusionnée.
                </p>
              </div>
            )}

            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {totalProjectsOnMap} projet{totalProjectsOnMap > 1 ? 's' : ''} dans {regionsList.length} région{regionsList.length > 1 ? 's' : ''}
              </p>
              <Link to="/projets" className="text-xs text-green-600 hover:underline flex items-center gap-1">
                Voir tous les projets <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ABOUT SECTION ────────────────────────────────────────────
function AboutSection() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
              À propos
            </span>
            <h2 className="text-4xl font-extrabold text-gray-800 mt-2 mb-6 leading-tight">
              Le Green Climate Fund à Madagascar
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4 text-lg">
              Le <strong>Green Climate Fund (GCF)</strong> est le principal fonds climatique international, créé pour aider les pays en développement à s'adapter aux changements climatiques.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Madagascar, pays particulièrement vulnérable aux aléas climatiques, bénéficie de financements GCF pour des projets couvrant l'adaptation côtière, la gestion forestière, les énergies renouvelables, la gestion de l'eau et la résilience des communautés rurales dans toutes ses 22 régions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/projets" className="btn btn-primary">
                <Leaf className="w-4 h-4" /> Voir nos projets
              </Link>
              <Link to="/contact" className="btn btn-secondary">Nous contacter</Link>
            </div>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=75&fit=crop', label: 'Forêts tropicales', tall: true },
              { img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=75&fit=crop', label: 'Énergie solaire', tall: false },
              { img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=75&fit=crop', label: 'Ressources en eau', tall: false },
              { img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=75&fit=crop', label: 'Communautés rurales', tall: true },
            ].map(({ img, label, tall }) => (
              <div key={label} className={`relative rounded-2xl overflow-hidden group ${tall ? 'row-span-1' : ''}`}
                style={{ height: tall ? 200 : 130 }}>
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURED PROJECTS ────────────────────────────────────────
const PROJECT_IMAGES: Record<string, string> = {
  adaptation:   'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=75&fit=crop',
  foret:        'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=75&fit=crop',
  energie:      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=75&fit=crop',
  eau:          'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=600&q=75&fit=crop',
  biodiversite: 'https://images.unsplash.com/photo-1540048049520-f25fe8a98e1d?w=600&q=75&fit=crop',
  agriculture:  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&q=75&fit=crop',
  default:      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=75&fit=crop',
};

function FeaturedProjects() {
  const { data } = useQuery({
    queryKey: ['public-projects-home'],
    queryFn: () => publicProjectApi.list({ per_page: 3 }).then(r => r.data),
  });

  return (
    <section style={{ background: 'var(--gcf-bg)' }} className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
              Projets
            </span>
            <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Projets en cours</h2>
          </div>
          <Link to="/projets" className="btn btn-secondary btn-sm hidden md:inline-flex">
            Tous les projets →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.data?.map((p: Project) => {
            const imgUrl = PROJECT_IMAGES[p.domaines_intervention?.[0]?.designation || ''] || PROJECT_IMAGES.default;
            const color  = blendSectorColors(p.domaines_intervention?.map(d => d.designation)).fillColor;
            return (
              <Link
                key={p.id}
                to={`/projets/${p.id}`}
                className="card overflow-hidden group block hover:shadow-xl transition-all hover:-translate-y-1"
                style={{ borderTop: `3px solid ${color}` }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={p.titre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Badges on image */}
                  <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                    {p.domaines_intervention?.map(d => (
                      <span key={d.id_domaine_intervention} className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                        style={{ background: sectorMapColor(d.designation) }}>
                        {d.designation}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium badge-${p.statut}`}>
                      {p.statut?.designation}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-green-700 transition-colors leading-tight line-clamp-2">
                    {p.titre}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {p.region && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />{p.region?.designation}
                      </div>
                    )}
                    {p.budget_total && (
                      <span className="text-xs font-bold" style={{ color: 'var(--gcf-green)' }}>
                        ${Number(p.budget_total).toLocaleString()} Ar
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold mt-3 group-hover:gap-2 transition-all"
                    style={{ color }}>
                    Voir le projet <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8 md:hidden">
          <Link to="/projets" className="btn btn-secondary">Tous les projets →</Link>
        </div>
      </div>
    </section>
  );
}

// ─── PARTNERS ─────────────────────────────────────────────────
// Partenaires par défaut — logo = chemin local dans /public
// Ex: logo: '/partenair/Saina.png'
// Laisser logo: null as string | null, null pour afficher le sigle en couleur
const DEFAULT_PARTNERS = [
  {
    id: 1, nom: 'Green Climate Fund', abbr: 'GCF', url: 'https://www.greenclimate.fund',
    description: 'Fonds principal de financement climatique international',
    color: '#1a6b45',
    logo: '/partners/logo-GCF.png'
  },
  {
    id: 2, nom: 'Présidence de la République de Madagascar', abbr: 'Présidence', url: 'https://presidence.gov.mg',
    description: "Amour, Patrie, Développement",
    color: '#2563eb',
    logo: '/partners/Saina.png',
  },
  {
    id: 3, nom: 'Organisation des Nations unies pour l’alimentation et l’agriculture', abbr: 'FAO', url: 'https://www.fao.org',
    description: 'Financement du développement durable',
    color: '#d97706',
    logo: '/partners/logo-FAO.png',
  },
  {
    id: 4, nom: 'Food and Agriculture Organization', abbr: 'FAO', url: 'https://www.fao.org',
    description: 'Financement du développement durable',
    color: '#7c3aed',
    logo: '/partners/FAO.png',
  },
  
];

function PartnersSection() {
  const { data: apiPartners = [] } = useQuery({
    queryKey: ['public-partners'],
    queryFn: () => cmsApi.partners().then(r => r.data),
  });

  type PartnerDisplay = Pick<Partner, 'id' | 'nom' | 'abbr' | 'url' | 'description' | 'color' | 'logo'> & { is_active?: boolean };

  const partners: PartnerDisplay[] = Array.isArray(apiPartners) && apiPartners.length > 0
    ? apiPartners.filter((p) => p.is_active !== false)
    : DEFAULT_PARTNERS;

  // getLogoUrl : /local/path.png | partners/uuid.png | https://...
  const getLogoUrl = (logo?: string | null): string | null => {
    if (!logo) return null;
    if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
    if (logo.startsWith('/')) return logo; // chemin public local
    return `${API_BASE}/storage/${logo}`;
  };

  return (
    <section className="py-20 bg-white" style={{ borderTop: '2px solid #f0f7f0' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
            Partenariats
          </span>
          <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Nos partenaires stratégiques</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            GCF Madagascar mobilise un réseau de partenaires internationaux et nationaux engagés pour le financement climatique.
          </p>
        </div>

        {/* Partners grid */}
        <div className="flex flex-wrap justify-center gap-5">
          {partners.map((p) => {
            const logoUrl = getLogoUrl(p.logo);
            const color = p.color || 'var(--gcf-green)';
            return (
              <a
                key={p.id}
                href={p.url && p.url !== '#' ? p.url : undefined}
                target={p.url && p.url !== '#' ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                style={{ background: 'white' }}
              >
                {/* Logo box */}
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={p.nom}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full items-center justify-center text-sm font-extrabold"
                    style={{ color, display: logoUrl ? 'none' : 'flex' }}
                  >
                    {(p.abbr || p.nom || '').slice(0, 3).toUpperCase()}
                  </div>
                </div>

                {/* Name */}
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-700 group-hover:text-green-700 transition-colors leading-tight line-clamp-2">
                    {p.nom}
                  </div>
                  {p.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-tight hidden md:block">
                      {p.description}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm mb-4">
            Vous souhaitez rejoindre notre réseau de partenaires ?
          </p>
          <Link to="/contact" className="btn btn-secondary btn-sm">
            Devenir partenaire <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIAL / MISSION SECTION ───────────────────────────
function MissionSection() {
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: 'var(--gcf-green-dark)' }}
    >
      {/* BG Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1600&q=60&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-15"
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <div className="flex justify-center mb-6">
          <Quote className="w-12 h-12 text-green-400 opacity-60" />
        </div>
        <p className="text-2xl md:text-3xl font-light leading-relaxed text-white/90 mb-8 italic">
          "Madagascar possède une biodiversité unique au monde. Notre mission est de garantir que les générations futures héritent d'une île résiliente, où les communautés s'épanouissent malgré les défis climatiques."
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="text-left">
            <div className="text-white font-semibold text-sm">Équipe GCF Madagascar</div>
            <div className="text-green-300 text-xs">Antananarivo, Madagascar</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ──────────────────────────────────────────────
function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=60&fit=crop"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.3)' }}
      />
      <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
          Ensemble pour un Madagascar résilient
        </h2>
        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          Vous souhaitez en savoir plus sur nos projets ou explorer des opportunités de partenariat ? Notre équipe est à votre disposition.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 text-base"
            style={{ background: 'var(--gcf-gold)', color: '#1a1a1a' }}
          >
            Nous contacter <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/projets"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold border border-white/30 hover:bg-white/10 transition-all text-base"
          >
            Explorer les projets <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <HeroSlider />
      <StatsSection />
      <PerspectivesSection />
      <ANDSection />
      <MapSection />
      <AboutSection />
      <FeaturedProjects />
      <MissionSection />
      <PartnersSection />
      <CTASection />
    </div>
  );
}