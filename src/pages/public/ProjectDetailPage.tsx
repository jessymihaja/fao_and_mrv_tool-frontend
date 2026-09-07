// src/pages/public/ProjectDetailPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicProjectApi } from '@/api/services';
import { MapContainer, TileLayer, Marker, Polygon, Popup } from 'react-leaflet';
import { ArrowLeft, MapPin, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { blendSectorColors } from '@/utils/sectorColors';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/*const STATUT_STYLES: Record<string, string> = {
  'Concept Note':     'bg-blue-100 text-blue-700',
  'Funding Proposal': 'bg-purple-100 text-purple-700',
  'En cours':         'bg-green-100 text-green-700',
  'Clôturé':          'bg-gray-100 text-gray-500',
};*/

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data: project, isLoading } = useQuery({
    queryKey: ['public-project', id],
    queryFn: () => publicProjectApi.show(Number(id)).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-32">
      <p className="text-gray-400">Projet introuvable</p>
      <Link to="/projets" className="btn btn-primary mt-4">← Retour aux projets</Link>
    </div>
  );

  const color = blendSectorColors(project.domaines_intervention?.map(d => d.designation)).fillColor;

  // Zone officielle d'intervention (polygone) si définie sur au moins 3
  // sommets ; sinon on retombe sur l'ancien point unique (latitude/longitude).
  const hasZone = (project.zone_points?.length ?? 0) >= 3;
  const mapCenter: [number, number] = hasZone
    ? [
        project.zone_points!.reduce((s, p) => s + p.latitude, 0) / project.zone_points!.length,
        project.zone_points!.reduce((s, p) => s + p.longitude, 0) / project.zone_points!.length,
      ]
    : [project.latitude ?? -18.9137, project.longitude ?? 47.5361];

  return (
    <div>
      {/* Hero */}
      <div className="py-14 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}dd, ${color}99)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <Link to="/projets" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour aux projets
          </Link>
          <div className="flex flex-wrap items-start gap-3 mb-4">
            {project.domaines_intervention?.map(d => (
              <span key={d.id_domaine_intervention} className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">{d.designation}</span>
            ))}
            <span className={`text-xs px-3 py-1 rounded-full font-medium 'bg-white/20'}`}>
              {project.statut?.designation}
            </span>
            {project.classifications?.map(c => (
              <span key={c.id_classification} className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">{c.designation}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">{project.titre}</h1>
          {project.region && (
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <MapPin className="w-4 h-4" />
              {[project.province?.nom, project.region?.designation, project.district?.nom].filter(Boolean).join(' › ')}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {project.description && (
              <div className="card p-6">
                <h2 className="font-bold text-gray-800 mb-3 text-lg">Description du projet</h2>
                <p className="text-gray-600 leading-relaxed">{project.description}</p>
              </div>
            )}

            {(project.objectifs || project.impact) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.objectifs && (
                  <div className="card p-5">
                    <h3 className="font-semibold text-gray-800 mb-2">🎯 Objectifs</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{project.objectifs}</p>
                  </div>
                )}
                {project.impact && (
                  <div className="card p-5">
                    <h3 className="font-semibold text-gray-800 mb-2">📈 Impact attendu</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{project.impact}</p>
                  </div>
                )}
              </div>
            )}

            {project.problematique_climatique && (
              <div className="card p-5" style={{ borderLeft: `4px solid ${color}` }}>
                <h3 className="font-semibold text-gray-800 mb-2">🌡️ Problématique climatique locale</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{project.problematique_climatique}</p>
              </div>
            )}

            {project.financements && project.financements.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" /> Sources de financement
                  </h2>
                </div>
                <table className="data-table">
                  <thead><tr><th>Source</th><th>Budget approuvé</th><th>Devise</th></tr></thead>
                  <tbody>
                    {project.financements.map((f) => (
                      <tr key={f.id}>
                        <td className="font-medium">{f.source_financement}</td>
                        <td className="font-semibold">{Number(f.budget_approuve).toLocaleString()}</td>
                        <td className="text-xs font-bold text-gray-500">{f.devise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(hasZone || (project.latitude && project.longitude)) && (
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" /> {hasZone ? 'Zone d\'intervention' : 'Localisation'}
                  </h2>
                </div>
                <div style={{ height: '300px' }}>
                  <MapContainer center={mapCenter} zoom={hasZone ? 9 : 9}
                    style={{ height: '100%', width: '100%', borderRadius: 0 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {hasZone ? (
                      <Polygon
                        positions={project.zone_points!.map(p => [p.latitude, p.longitude])}
                        pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#22c55e', fillOpacity: 0.3 }}
                      >
                        <Popup><strong>{project.titre}</strong></Popup>
                      </Polygon>
                    ) : (
                      <Marker position={[project.latitude!, project.longitude!]}>
                        <Popup><strong>{project.titre}</strong></Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                {project.zone_description && (
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">{project.zone_description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Informations clés</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Statut',            project.statut?.designation],
                  ['Classification',    project.classifications?.map(c => c.designation).join(', ')],
                  ['Entité accréditée', project.entites_accreditees?.map(e => e.designation).join(', ')],
                  ['Secteur',           project.domaines_intervention?.map(d => d.designation).join(', ')],
                  ['Zone',              project.zone],
                  ['Province',          project.province?.nom],
                  ['Région',            project.region?.designation],
                  ['District',          project.district?.nom],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700 text-right max-w-[150px] truncate">{value}</span>
                  </div>
                ))}
                {project.date_debut && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Début</span>
                    <span className="font-medium">{format(new Date(project.date_debut), 'MMM yyyy', { locale: fr })}</span>
                  </div>
                )}
                {project.date_fin && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fin prévue</span>
                    <span className="font-medium">{format(new Date(project.date_fin), 'MMM yyyy', { locale: fr })}</span>
                  </div>
                )}
              </div>
            </div>

            {project.documents && project.documents.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-700">Documents ({project.documents.length})</span>
                </div>
                <div className="space-y-2">
                  {project.documents.slice(0, 3).map((d) => (
                    <div key={d.id} className="text-sm text-gray-600 flex items-center gap-2">
                      <span>📄</span><span className="line-clamp-1">{d.titre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to="/contact" className="btn btn-primary w-full justify-center">
              Contacter GCF Madagascar
            </Link>
            <Link to="/projets" className="btn btn-secondary w-full justify-center">
              <ArrowLeft className="w-4 h-4" /> Retour aux projets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}