// src/pages/admin/project-ideas/ProjectIdeaDashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Lightbulb, FileEdit, Send, Search, CheckCircle2, FolderKanban, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { projectIdeaDashboardApi } from '@/api/services';
import { STATUT_IDEE_LABELS, type StatutIdee } from '@/types';

const fmt = (n: number) => Math.round(n).toLocaleString('fr-MG');

const STATUT_COLORS: Record<StatutIdee, string> = {
  brouillon: '#9ca3af', soumis: '#3b82f6', en_etude: '#d97706', approuve: '#16a34a', converti: '#4f46e5',
};
const STATUT_ICONS: Record<StatutIdee, React.ElementType> = {
  brouillon: FileEdit, soumis: Send, en_etude: Search, approuve: CheckCircle2, converti: FolderKanban,
};

const PIE_COLORS = ['#16a34a', '#0284c7', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4338ca', '#059669', '#b45309', '#be185d', '#475569'];

export default function ProjectIdeaDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['project-ideas-dashboard'],
    queryFn: () => projectIdeaDashboardApi.index().then(r => r.data),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statutCards: { key: StatutIdee }[] = [
    { key: 'brouillon' }, { key: 'soumis' }, { key: 'en_etude' }, { key: 'approuve' }, { key: 'converti' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/project-ideas" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tableau de bord — Idées de projet</h1>
          <p className="text-sm text-gray-400">Vue d'ensemble du pipeline de préparation des projets</p>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total des idées</p>
          <p className="text-2xl font-bold text-gray-800">{data.total}</p>
        </div>
        {statutCards.map(({ key }) => {
          const Icon = STATUT_ICONS[key];
          return (
            <div key={key} className="card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: STATUT_COLORS[key] }} />
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{STATUT_IDEE_LABELS[key]}</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{data.par_statut[key] ?? 0}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-bold text-gray-700">Budget total estimé (toutes idées)</p>
        </div>
        <p className="text-3xl font-bold text-gray-800">{fmt(data.budget_total_estime)} Ar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Répartition par statut (secteurs / pie) */}
        <div className="card p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Répartition par statut</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.repartition_statut} dataKey="total" nameKey="statut" cx="50%" cy="50%" outerRadius={90} label>
                {data.repartition_statut.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par région (barres) */}
        <div className="card p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Répartition par région</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.repartition_region} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget par secteur */}
        <div className="card p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Budget estimé par secteur (Ar)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.budget_par_secteur} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="secteur" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined) => `${fmt(Number(Array.isArray(v) ? v[0] : v))} Ar`} />
              <Bar dataKey="montant" fill="#0284c7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget par bailleur */}
        <div className="card p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Budget demandé par bailleur envisagé (Ar)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.budget_par_bailleur} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
              <YAxis type="category" dataKey="bailleur" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined) => `${fmt(Number(Array.isArray(v) ? v[0] : v))} Ar`} />
              <Bar dataKey="montant" fill="#7c3aed" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
