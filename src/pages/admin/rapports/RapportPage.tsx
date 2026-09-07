// src/pages/admin/rapports/RapportPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rapportApi } from '@/api/services';
import { ArrowLeft, Download} from 'lucide-react';
import { format } from 'date-fns';

export default function RapportPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['rapport', id],
    queryFn: () => rapportApi.show(Number(id)).then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>;

  const p = data?.projet;
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/admin/projects" className="p-2 rounded-lg hover:bg-gray-200"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <h1 className="text-2xl font-bold text-gray-800">Rapport — {p?.titre}</h1>
        <a href={rapportApi.exportPdfUrl(Number(id))} target="_blank" rel="noopener noreferrer" className="ml-auto btn btn-primary btn-sm">
          <Download className="w-4 h-4" /> Export PDF
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Financements', data?.resume?.nb_financements], ['Documents', data?.resume?.nb_documents], ['Budget USD', `$${Number(data?.resume?.budget_total_usd || 0).toLocaleString()}`], ['Budget EUR', `€${Number(data?.resume?.budget_total_eur || 0).toLocaleString()}`]].map(([l, v]) => (
          <div key={l} className="stat-card"><div className="text-2xl font-bold text-gray-800">{v}</div><div className="text-xs text-gray-500 mt-1">{l}</div></div>
        ))}
      </div>
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-3">Informations du projet</h3>
        {[[' Statut', p?.statut], ['Phase', p?.phase], ['Secteur', p?.secteur_climatique], ['Région', p?.region?.nom], ['Début', p?.date_debut ? format(new Date(p.date_debut), 'dd/MM/yyyy') : '—'], ['Fin', p?.date_fin ? format(new Date(p.date_fin), 'dd/MM/yyyy') : '—']].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm"><span className="text-gray-500">{l}</span><span className="font-medium">{v || '—'}</span></div>
        ))}
        {p?.description && <div className="pt-2 border-t"><p className="text-sm text-gray-600 leading-relaxed">{p.description}</p></div>}
      </div>
      {p?.financements && p.financements.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-gray-700">Financements</h3></div>
          <table className="data-table"><thead><tr><th>Source</th><th>Type</th><th>Montant</th><th>Devise</th><th>Date</th></tr></thead>
            <tbody>{p.financements.map((f) => <tr key={f.id}><td>{f.source}</td><td>{f.type}</td><td>{Number(f.montant).toLocaleString()}</td><td>{f.devise}</td><td>{f.date ? format(new Date(f.date), 'dd/MM/yyyy') : '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="text-xs text-gray-400 text-center">Rapport généré le {data?.generated_at ? format(new Date(data.generated_at), 'dd/MM/yyyy HH:mm') : '—'} par {data?.generated_by}</div>
    </div>
  );
}
