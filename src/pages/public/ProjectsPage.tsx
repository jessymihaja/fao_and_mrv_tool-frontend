// src/pages/public/ProjectsPage.tsx
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { publicProjectApi } from '@/api/services';
import { MapPin, ArrowRight, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '@/types';
import { useProjectSearch } from '@/hooks/useProjectSearch';
import ProjectSearch from '@/components/public/ProjectSearch';
import { sectorMapColor, blendSectorColors } from '@/utils/sectorColors';
import { normalizePagination } from '@/utils/pagination';

const STATUTS = ['', 'en cours', 'cloture', 'Concept Note', 'funding proposal'];
const SECTEURS = ['', 'adaptation', 'attenuation', 'resilience', 'biodiversite', 'eau', 'foret', 'energie', 'transport', 'agriculture'];

// ─── AND SECTION ──────────────────────────────────────────────
function ANDSection() {
  const [activeTab, setActiveTab] = useState<'apropos' | 'presentation'>('apropos');

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-10">
        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
          Autorité Nationale Désignée
        </span>
        <h2 className="text-3xl font-extrabold text-gray-800 mt-2">
          AND Madagascar & Green Climate Fund
        </h2>
        <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
          Madagascar, à travers son AND, coordonne l'accès aux financements climatiques internationaux pour soutenir sa transition vers un développement résilient.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 justify-center mb-10">
        {[
          { key: 'apropos',      label: 'À propos de l\'AND' },
          { key: 'presentation', label: 'Présentation au niveau GCF' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'apropos' | 'presentation')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === key
                ? 'text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={activeTab === key ? { background: 'var(--gcf-green)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'apropos' && (
        <div className="space-y-10">
          {/* Ligne 1 : texte gauche + image droite */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Qu'est-ce que l'AND ?
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                L'<strong>Autorité Nationale Désignée (AND)</strong> de Madagascar est le point focal officiel du pays auprès du Green Climate Fund (GCF). Elle est rattachée au <strong>Bureau National des Changements Climatiques et de la REDD+ (BNCC-REDD+)</strong>, placé sous la tutelle du Ministère de l'Environnement et du Développement Durable (MEDD).
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                L'AND assure la coordination nationale des financements climatiques, garantit l'alignement des projets GCF avec les priorités nationales définies dans la <strong>Contribution Déterminée au niveau National (CDN)</strong> de Madagascar, et veille à ce que les investissements climatiques respectent les politiques environnementales et sociales du pays.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Elle émet les <strong>lettres de non-objection (No-Objection Letters)</strong> pour tout projet soumis au GCF impliquant Madagascar, constituant ainsi la porte d'entrée obligatoire pour l'accès aux financements climatiques internationaux.
              </p>
            </div>

            {/* Mosaïque d'images AND / environnement Madagascar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl overflow-hidden row-span-2" style={{ height: 280 }}>
                <img
                  src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80&fit=crop"
                  alt="Forêt tropicale Madagascar"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ height: 134 }}>
                <img
                  src="https://images.unsplash.com/photo-1573167243872-43c6433b9d40?w=400&q=80&fit=crop"
                  alt="Réunion institutionnelle"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ height: 134 }}>
                <img
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80&fit=crop"
                  alt="Ressources en eau Madagascar"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Ligne 2 : missions avec image bannière au-dessus */}
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-6" style={{ height: 160 }}>
              <img
                src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=70&fit=crop"
                alt="Madagascar vue aérienne"
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(0.55)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white text-2xl font-extrabold tracking-wide drop-shadow-lg">
                  Missions principales de l'AND
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: '🎯',
                  titre: 'Point focal GCF',
                  desc: "Représenter Madagascar auprès du Green Climate Fund et assurer la liaison officielle avec le Secrétariat du GCF à Incheon, Corée du Sud.",
                  img: 'https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?w=300&q=70&fit=crop',
                },
                {
                  icon: '📋',
                  titre: 'Coordination nationale',
                  desc: "Coordonner les entités accréditées, les agences d'exécution et les ministères sectoriels pour garantir la cohérence des projets climatiques.",
                  img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=300&q=70&fit=crop',
                },
                {
                  icon: '✅',
                  titre: 'Délivrance des NOL',
                  desc: "Émettre les Lettres de Non-Objection pour valider les propositions de projets soumises au GCF au nom de Madagascar.",
                  img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=300&q=70&fit=crop',
                },
                {
                  icon: '📊',
                  titre: 'Suivi & redevabilité',
                  desc: "Assurer le suivi des projets financés, la collecte des données d'impact et la redevabilité envers les communautés bénéficiaires.",
                  img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&q=70&fit=crop',
                },
              ].map(({ icon, titre, desc, img }) => (
                <div key={titre} className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all group">
                  <div className="h-32 overflow-hidden">
                    <img src={img} alt={titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex gap-3 p-4 bg-white">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm mb-1">{titre}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'presentation' && (
        <div className="space-y-10">
          {/* Ligne 1 : image gauche + texte droite */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Image principale GCF */}
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 320 }}>
              <img
                src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80&fit=crop"
                alt="Énergie renouvelable GCF"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-white font-bold text-lg leading-tight drop-shadow">
                  Financer la transition climatique mondiale
                </span>
                <p className="text-green-200 text-xs mt-1">Créé à la COP16 de Cancún, 2010</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Le Green Climate Fund (GCF)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Le <strong>Green Climate Fund</strong> est le principal mécanisme financier de la Convention-Cadre des Nations Unies sur les Changements Climatiques (CCNUCC). Créé en 2010 lors de la COP16 de Cancún, il a pour mission de soutenir les pays en développement dans leurs efforts d'<strong>atténuation</strong> et d'<strong>adaptation</strong> face aux changements climatiques.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Le GCF opère à travers un réseau d'<strong>Entités Accréditées</strong> — organisations internationales, banques de développement, ONG et entités nationales — qui soumettent des propositions de projets au nom des pays bénéficiaires.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Madagascar bénéficie des financements GCF dans les domaines de l'adaptation côtière, la gestion des ressources en eau, la préservation des forêts (REDD+), les énergies renouvelables et la résilience des communautés rurales.
              </p>
            </div>
          </div>

          {/* Ligne 2 : chiffres + cycle avec bannière image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Chiffres clés */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-5">Madagascar & le GCF en chiffres</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { valeur: '2010', label: 'Création du GCF (COP16)', color: '#1a6b45' },
                  { valeur: '22', label: 'Régions couvertes à Madagascar', color: '#2563eb' },
                  { valeur: '2', label: 'Entités accréditées nationales', color: '#7c3aed' },
                  { valeur: 'CDN', label: 'Alignement sur la contribution nationale', color: '#b45309' },
                ].map(({ valeur, label, color }) => (
                  <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                    <div className="text-2xl font-extrabold mb-1" style={{ color }}>{valeur}</div>
                    <div className="text-xs text-gray-500 leading-tight">{label}</div>
                  </div>
                ))}
              </div>
              {/* Petite galerie de secteurs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { img: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&q=70&fit=crop', label: 'Forêts REDD+' },
                  { img: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=300&q=70&fit=crop', label: 'Ressources eau' },
                  { img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=300&q=70&fit=crop', label: 'Communautés' },
                ].map(({ img, label }) => (
                  <div key={label} className="relative rounded-xl overflow-hidden" style={{ height: 90 }}>
                    <img src={img} alt={label} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                      <span className="text-white text-xs font-semibold leading-tight">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cycle GCF */}
            <div>
              <div className="relative rounded-2xl overflow-hidden mb-5" style={{ height: 130 }}>
                <img
                  src="https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&q=70&fit=crop"
                  alt="Processus GCF"
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.5)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h4 className="text-white text-lg font-extrabold tracking-wide drop-shadow">
                    Cycle d'un projet GCF
                  </h4>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { etape: '1', label: 'Concept Note', desc: "Soumission de la note conceptuelle + NOL de l'AND", img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=80&q=60&fit=crop' },
                  { etape: '2', label: 'Due Diligence', desc: 'Évaluation par le Secrétariat du GCF et le Panel technique', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=60&fit=crop' },
                  { etape: '3', label: 'Approbation', desc: "Décision du Conseil d'Administration du GCF", img: 'https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?w=80&q=60&fit=crop' },
                  { etape: '4', label: 'Mise en œuvre', desc: "Exécution par l'entité accréditée et suivi AND", img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=80&q=60&fit=crop' },
                ].map(({ etape, label, desc, img }) => (
                  <div key={etape} className="flex gap-3 items-center p-3 rounded-xl hover:bg-green-50 transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'var(--gcf-green)' }}>
                      {etape}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-700">{label} — </span>
                      <span className="text-sm text-gray-500">{desc}</span>
                    </div>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={img} alt={label} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const search = useProjectSearch();
  const [statut, setStatut] = useState('');
  const [secteur, setSecteur] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-projects', page, search.debouncedQuery, statut, secteur],
    queryFn: () => publicProjectApi.list({ page, search: search.debouncedQuery, statut, secteur, per_page: 12 }).then(r => normalizePagination(r.data)),
  });

  // Revenir à la page 1 dès que la recherche (débouncée) ou un filtre change.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.debouncedQuery, statut, secteur]);

  const hasFilters = search.isActive || statut || secteur;
  const resetAll = () => { search.reset(); setStatut(''); setSecteur(''); setPage(1); };

  return (
    <div>
      {/* Hero */}
      <div className="relative py-20 text-white text-center overflow-hidden">
        {/* Image de fond */}
        <img
          src="/images/madagascar-baobab.jpg"
          alt="Madagascar"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.45)' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).style.background = 'var(--gcf-green-dark)';
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(15,64,39,0.7) 100%)' }} />
        {/* Contenu */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-3 drop-shadow-lg">Projets climatiques</h1>
          <p className="text-green-100 max-w-xl mx-auto text-lg drop-shadow">
            Explorez l'ensemble des projets GCF Madagascar — {data?.total ?? ''} projets dans toutes les régions de Madagascar
          </p>
        </div>
      </div>

      {/* Section AND */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-14">

          {/* Tabs */}
          <ANDSection />

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Recherche globale — même composant/logique que la MAP SECTION de la Homepage */}
        <ProjectSearch
          className="mb-4"
          value={search.query}
          onChange={search.setQuery}
          onSubmit={search.submit}
          onReset={search.reset}
          resultsCount={search.isActive ? data?.total : undefined}
          loading={isFetching && search.isActive}
        />

        {/* Filters */}
        <div className="card p-4 mb-8 flex flex-wrap gap-3 items-center">
          <select className="form-input w-auto" value={statut} onChange={e => setStatut(e.target.value)}>
            {STATUTS.map(s => <option key={s} value={s}>{s ? `Statut: ${s}` : 'Tous les statuts'}</option>)}
          </select>
          <select className="form-input w-auto" value={secteur} onChange={e => setSecteur(e.target.value)}>
            {SECTEURS.map(s => <option key={s} value={s}>{s ? `Secteur: ${s}` : 'Tous les secteurs'}</option>)}
          </select>
          {hasFilters && (
            <button className="btn btn-secondary btn-sm" onClick={resetAll}>
              <Filter className="w-3.5 h-3.5" /> Réinitialiser tous les filtres
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {data?.data?.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg">Aucun projet trouvé</p>
                {hasFilters && <button className="btn btn-secondary btn-sm mt-3" onClick={resetAll}>Réinitialiser les filtres</button>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.data?.map((p: Project) => {
                const pColor = blendSectorColors(p.domaines_intervention?.map(d => d.designation));
                return (
                <Link
                  key={p.id}
                  to={`/projets/${p.id}`}
                  className="card p-5 hover:shadow-lg transition-all hover:-translate-y-1 group block"
                  style={{ border: `1.5px solid ${pColor.fillColor}55` }}
                >
                  {/* Sector bar */}
                  <div className="h-1.5 -mx-5 -mt-5 mb-5 rounded-t-xl"
                    style={{ background: pColor.fillColor }} />

                  <div className="flex items-start justify-between mb-3 flex-wrap gap-1">
                    {p.domaines_intervention?.map(d => (
                      <span key={d.id_domaine_intervention} className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                        style={{ background: sectorMapColor(d.designation) }}>
                        {d.designation}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.statut?.designation}`}>{p.statut?.designation}</span>
                  </div>

                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-green-700 transition-colors leading-tight line-clamp-2">
                    {p.titre}
                  </h3>

                  {p.description && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4 leading-relaxed">{p.description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      {p.region && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />{p.region?.designation}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{p.classifications?.map(c => c.designation).join(', ')}</span>
                    </div>
                    {p.financements && p.financements.length > 0 && (
                      <div className="text-sm font-bold" style={{ color: 'var(--gcf-green)' }}>
                        {p.financements.length} financement{p.financements.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold mt-3 group-hover:gap-2 transition-all"
                    style={{ color: 'var(--gcf-green)' }}>
                    Voir les détails <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.last_page > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary">
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: data.last_page }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === p ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      style={page === p ? { background: 'var(--gcf-green)' } : {}}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button disabled={page === data.last_page} onClick={() => setPage(p => p + 1)} className="btn btn-secondary">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}