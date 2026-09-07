// src/pages/admin/activity/ActivityPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/api/services';
import { Activity, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODULE_COLORS: Record<string, string> = {
  project: 'bg-green-100 text-green-700',
  financement: 'bg-blue-100 text-blue-700',
  document: 'bg-purple-100 text-purple-700',
  user: 'bg-orange-100 text-orange-700',
};

const ACTION_ICONS: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', upload: '📤', login: '🔐',
};

export default function ActivityPage() {
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, module],
    queryFn: () => activityApi.list({ page, module, per_page: 30 }).then(r => r.data),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Activity className="w-6 h-6" />Journal d'activité</h1>
      </div>

      <div className="card p-4 flex gap-3">
        <select className="form-input w-auto" value={module} onChange={e => { setModule(e.target.value); setPage(1); }}>
          <option value="">Tous les modules</option>
          {['project', 'financement', 'document', 'user'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {module && <button className="btn btn-secondary btn-sm" onClick={() => setModule('')}><Filter className="w-3.5 h-3.5" /> Réinitialiser</button>}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Action</th><th>Module</th><th>Description</th><th>Utilisateur</th><th>Date</th></tr></thead>
            <tbody>
              {data?.data?.map((log) => (
                <tr key={log.id}>
                  <td><div className="flex items-center gap-2"><span className="text-base">{ACTION_ICONS[log.action] || '📌'}</span><span className="text-xs font-medium text-gray-600">{log.action}</span></div></td>
                  <td><span className={`text-xs px-2 py-1 rounded-full font-medium ${MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-600'}`}>{log.module}</span></td>
                  <td className="max-w-xs"><div className="text-sm text-gray-700 line-clamp-2">{log.description}</div></td>
                  <td><div className="text-sm font-medium text-gray-700">{log.user?.name || 'Système'}</div><div className="text-xs text-gray-400">{log.user?.role}</div></td>
                  <td className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</td>
                </tr>
              ))}
              {!data?.data?.length && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Aucune activité enregistrée</td></tr>}
            </tbody>
          </table>
        )}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">{data.from}–{data.to} sur {data.total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm">Préc.</button>
              <span className="px-3 py-1 text-sm">{page} / {data.last_page}</span>
              <button disabled={page === data.last_page} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">Suiv.</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
