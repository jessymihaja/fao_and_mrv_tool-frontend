// src/pages/admin/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { statsApi, activityApi, projectApi, financementApi } from '@/api/services';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import {
  FolderKanban, DollarSign, CheckCircle, FileText,
  Users, TrendingUp, Activity, Plus, Upload, Banknote,
  ArrowUpRight, Layers, CalendarCheck,
  CircleDollarSign, BarChart3, MapPin,
  Zap, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { GlobalStats, Financement, Project, Devise } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNum  = (n: number) => Number(n).toLocaleString('fr-MG');
const fmtMega = (n: number): string => {
  if (!n) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Mrd`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)} K`;
  return fmtNum(n);
};
// Correction multidevises (§11-14) : jamais de total unique mélangeant AR,
// USD et EUR — cette fonction affiche chaque devise séparément, ex.
// "700 USD · 100 AR". Ne rend rien (chaîne vide) si aucune devise n'a de
// montant, plutôt que d'afficher un "0" trompeur.
const fmtDevises = (totaux?: Partial<Record<string, number>>): string => {
  const entries = Object.entries(totaux ?? {}).filter(([, v]) => (v ?? 0) !== 0);
  if (entries.length === 0) return '—';
  return entries.map(([devise, montant]) => `${fmtMega(montant ?? 0)} ${devise}`).join(' · ');
};

const STATUT_COLORS: Record<string, string> = {
  'Concept Note':     '#3b82f6',
  'Funding Proposal': '#8b5cf6',
  'En cours':         '#10b981',
  'Clôturé':          '#94a3b8',
};
const STATUT_BADGE: Record<string, string> = {
  'Concept Note':     'bg-blue-50 text-blue-600 border border-blue-100',
  'Funding Proposal': 'bg-violet-50 text-violet-600 border border-violet-100',
  'En cours':         'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'Clôturé':          'bg-slate-50 text-slate-500 border border-slate-100',
};
const SECTEUR_COLORS = [
  '#10b981','#3b82f6','#8b5cf6','#059669',
  '#0ea5e9','#15803d','#f59e0b','#64748b','#a16207',
];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, total, subtitle, icon: Icon, color, bg, link, trend }: {
  label: string; total: string | number; subtitle?: string;
  icon: React.ElementType; color: string; bg: string; link?: string; trend?: string;
}) {
  const inner = (
    <div className="relative bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 h-full overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {link && (
          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl font-black text-gray-900 leading-none tabular-nums tracking-tight">{total}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1.5 font-medium">{subtitle}</div>}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        {trend && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">{trend}</span>}
      </div>
    </div>
  );
  return link ? <Link to={link} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, action, color = '#10b981', bg = '#d1fae5' }: {
  icon: React.ElementType; title: string;
  action?: { label: string; to: string };
  color?: string; bg?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h2 className="text-base font-black text-gray-800 tracking-tight">{title}</h2>
      </div>
      {action && (
        <Link to={action.to}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all">
          {action.label} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: { dataKey?: string; name?: string; value?: number; color?: string }[];
  label?: string;
}
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-xs">
      <p className="font-bold text-gray-500 mb-2 uppercase tracking-wide text-[10px]">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name ?? p.dataKey}</span>
          <strong className="text-gray-900 ml-auto pl-3">{fmtMega(p.value ?? 0)}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage() {

  const { data: stats }        = useQuery({ queryKey: ['admin-stats'],       queryFn: () => statsApi.global().then(r => r.data as GlobalStats) });
  const { data: byStatus }     = useQuery({ queryKey: ['stats-status'],      queryFn: () => statsApi.byStatus().then(r => {
    const d = r.data; return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
  }) });
  const { data: activity }     = useQuery({ queryKey: ['activity-recent'],   queryFn: () => activityApi.list({ per_page: 8 }).then(r => r.data) });
  const { data: projectsData } = useQuery({ queryKey: ['projects-recent'],   queryFn: () => projectApi.list({ per_page: 10 }).then(r => r.data) });
  const { data: finData }      = useQuery({ queryKey: ['financements-dash'], queryFn: () => financementApi.list({ per_page: 999 }).then(r => r.data) });

  const { data: budgetByYearRaw } = useQuery({
    queryKey: ['stats-budget-year'],
    queryFn: () => statsApi.budgetByYear().then(r => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    }),
  });
  const budgetByYear = Array.isArray(budgetByYearRaw) ? budgetByYearRaw : [];

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const financements: Financement[] = finData?.data ?? [];
  const nbFinancements = finData?.meta?.total ?? stats?.total_financements ?? 0;
  const nbSources      = new Set(financements.map(f => f.source_financement)).size;

  // Correction multidevises (§11-14) : `budget_total`, `total_depenses`,
  // `total_engagements`, `total_decaissements` sont désormais des
  // ventilations { devise => montant } — on ne les mélange plus jamais dans
  // un même nombre (ex. "USD à 12% du total MGA" n'a aucun sens sans
  // conversion). Chaque devise garde son propre total, sa propre dépense et
  // son propre taux d'exécution.
  const budgetParDevise        = stats?.budget_total ?? {};
  const depensesParDevise      = stats?.total_depenses ?? {};
  const engagementsParDevise   = stats?.total_engagements ?? {};
  const decaissementsParDevise = stats?.total_decaissements ?? {};
  const devisesBudget = Array.from(new Set([
    ...Object.keys(budgetParDevise),
    ...Object.keys(depensesParDevise),
  ])).sort() as Devise[];
  const nbPublies = projectsData?.data?.filter((p) => p.is_published).length ?? 0;

  const secteurData = Object.entries(
    (projectsData?.data ?? []).reduce((acc: Record<string, number>, p: Project) => {
      const domaines = p.domaines_intervention?.length ? p.domaines_intervention : [{ designation: 'Autre' }];
      domaines.forEach((d) => {
        const s = d.designation ?? 'Autre';
        acc[s] = (acc[s] ?? 0) + 1;
      });
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const pieData = (byStatus ?? []).map((s: { name?: string; statut?: string; value?: number; count?: number }) => ({
    name:  s.name  ?? s.statut ?? '—',
    value: s.value ?? s.count  ?? 0,
  }));

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-medium">Plateforme de suivi des financements climatiques</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm font-medium">
          <CalendarCheck className="w-4 h-4 text-emerald-500" />
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </div>
      </div>

      {/* ══ SECTION 1 — PROJETS ═══════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={FolderKanban} title="Projets" action={{ label: 'Voir tous', to: '/admin/projects' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total projets"   total={stats?.total_projets ?? 0}    subtitle="Tous statuts confondus"   icon={FolderKanban} color="#10b981" bg="#d1fae5" link="/admin/projects" />
          <KpiCard label="En cours"        total={stats?.projets_actifs ?? 0}   subtitle="Projets actifs"           icon={TrendingUp}   color="#3b82f6" bg="#dbeafe" link="/admin/projects" />
          <KpiCard label="Clôturés"        total={stats?.projets_termines ?? 0} subtitle="Projets terminés"         icon={CheckCircle}  color="#8b5cf6" bg="#ede9fe" link="/admin/projects" />
          <KpiCard label="Concept Note"    total={stats?.projets_planifies ?? 0} subtitle="En préparation"          icon={Layers}       color="#f59e0b" bg="#fef3c7" link="/admin/projects" />
        </div>
      </section>

      {/* ══ SECTION 2 — BUDGET ════════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={CircleDollarSign} title="Budget & Financements"
          action={{ label: 'Gérer', to: '/admin/financements' }}
          color="#3b82f6" bg="#dbeafe" />

        {/* Hero budget + petites cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

          {/* Hero card — Correction multidevises : plus de total unique
              mélangeant AR/USD/EUR, chaque devise garde son propre montant. */}
          <div className="relative rounded-2xl p-6 flex flex-col justify-between overflow-hidden lg:col-span-1"
            style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)', minHeight: 200 }}>
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-10 bg-white" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-10 bg-white" />

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Banknote className="w-4 h-4 text-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Budget total approuvé</span>
              </div>
              {devisesBudget.length === 0 && (
                <p className="text-4xl font-black leading-none text-white">0</p>
              )}
              {devisesBudget.map((devise) => (
                <p key={devise} className="text-2xl font-black leading-tight text-white">
                  {fmtMega(budgetParDevise[devise] ?? 0)} <span className="text-base text-emerald-300 font-bold">{devise}</span>
                </p>
              ))}
              <p className="text-sm text-emerald-300 mt-1.5 font-medium">Par devise — jamais additionnées entre elles</p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              {[
                { val: nbFinancements, lbl: 'Financements' },
                { val: nbSources,      lbl: 'Financeurs'   },
                { val: nbPublies,      lbl: 'Publiés'      },
              ].map(({ val, lbl }) => (
                <div key={lbl}>
                  <p className="text-xl font-black text-white">{val}</p>
                  <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wide mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card unifiée : une colonne par devise, avec budget approuvé,
              dépensé et taux d'exécution propres à cette devise (§9-12). */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-gray-50">
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Répartition budgétaire par devise</span>
            </div>

            {/* Une carte par devise réellement utilisée */}
            {devisesBudget.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">Aucun financement enregistré.</p>
            ) : (
              <div
                className="grid divide-x divide-gray-50"
                style={{ gridTemplateColumns: `repeat(${devisesBudget.length}, minmax(0, 1fr))` }}
              >
                {devisesBudget.map((devise) => {
                  const budget = budgetParDevise[devise] ?? 0;
                  const depense = depensesParDevise[devise] ?? 0;
                  // Taux d'exécution calculé UNIQUEMENT dans cette devise
                  // (§10 : jamais de comparaison entre devises différentes).
                  const pct = budget > 0 ? Math.min(Math.round((depense / budget) * 100), 100) : 0;
                  return (
                    <div key={devise} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{devise}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{pct}%</span>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 leading-none tabular-nums">{fmtMega(budget)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Budget approuvé</p>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-300 text-right">{fmtMega(depense)} {devise} dépensés ({pct}%)</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer — récapitulatif dépenses, une ligne par devise */}
            <div className="px-5 pb-4 pt-3 border-t border-gray-50">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Dépenses par devise</p>
              <p className="text-sm font-bold text-red-600">{fmtDevises(depensesParDevise)}</p>
            </div>
          </div>
        </div>

        {/* KPIs secondaires */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Documents"     total={stats?.total_documents ?? 0}    subtitle="Fichiers uploadés"  icon={FileText}    color="#ec4899" bg="#fce7f3" link="/admin/documents" />
          <KpiCard label="Utilisateurs"  total={stats?.total_users ?? 0}        subtitle="Comptes actifs"     icon={Users}       color="#8b5cf6" bg="#ede9fe" link="/admin/users" />
          <KpiCard label="Engagements"   total={fmtDevises(engagementsParDevise)}   subtitle="Total accordé, par devise"  icon={TrendingUp}  color="#0891b2" bg="#e0f2fe" />
          <KpiCard label="Décaissements" total={fmtDevises(decaissementsParDevise)} subtitle="Total débloqué, par devise" icon={CheckCircle} color="#059669" bg="#d1fae5" />
        </div>
      </section>

      {/* ══ SECTION 3 — GRAPHIQUES ════════════════════════════════════════════ */}
      <section>
        <SectionHeader icon={BarChart3} title="Analyses & Statistiques" color="#8b5cf6" bg="#ede9fe" />

        {/* Ligne 1 : Donut + Area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

          <ChartCard title="Projets par statut" subtitle="Répartition actuelle" className="lg:col-span-2">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                    paddingAngle={4} strokeWidth={0}>
                    {pieData.map((e: { name: string; value: number }, i: number) => (
                      <Cell key={e.name} fill={STATUT_COLORS[e.name] ?? SECTEUR_COLORS[i % SECTEUR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          <ChartCard title="Budget approuvé par année" subtitle="Évolution en Ariary (MGA)" className="lg:col-span-3">
            {budgetByYear.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={budgetByYear} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => fmtMega(v)} width={56} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="MGA" name="MGA" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#gradMga)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="Les données apparaîtront dès qu'un financement avec une date d'approbation sera enregistré." />}
          </ChartCard>
        </div>

        {/* Secteurs — pleine largeur */}
        <div className="grid grid-cols-1 gap-4">
          <ChartCard title="Répartition sectorielle" subtitle="Secteurs climatiques couverts">
            {secteurData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={secteurData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={74} paddingAngle={3} strokeWidth={0}>
                    {secteurData.map((_, i: number) => (
                      <Cell key={i} fill={SECTEUR_COLORS[i % SECTEUR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>
        </div>
      </section>

      {/* ══ SECTION 4 — PROJETS RÉCENTS + ACTIVITÉ ═══════════════════════════ */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Projets récents */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: 460 }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-black text-gray-800 text-sm leading-none">Projets récents</h2>
                  {(projectsData?.total) != null && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                      {projectsData?.total} projets au total
                    </p>
                  )}
                </div>
              </div>
              <Link to="/admin/projects"
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
              {projectsData?.data?.length ? projectsData.data.map((p) => {
                const SECTEUR_COLOR: Record<string, string> = {
                  adaptation: '#10b981', attenuation: '#3b82f6', resilience: '#8b5cf6',
                  biodiversite: '#059669', eau: '#0ea5e9', foret: '#15803d',
                  energie: '#f59e0b', transport: '#64748b', agriculture: '#a16207',
                };
                const accent = SECTEUR_COLOR[p.domaines_intervention?.[0]?.designation ?? ''] ?? '#10b981';
                return (
                  <Link key={p.id} to={`/admin/projects/${p.id}/details`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${accent}15` }}>
                      <FolderKanban className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-emerald-700 transition-colors leading-snug">
                        {p.titre}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.region?.designation && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{p.region.designation}
                          </span>
                        )}
                        {!!p.entites_accreditees?.length && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-[11px] text-gray-400 truncate">
                              {p.entites_accreditees.map((e) => e.designation).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0 whitespace-nowrap ${(p.statut?.designation && STATUT_BADGE[p.statut.designation]) ?? 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                      {p.statut?.designation}
                    </span>
                  </Link>
                );
              }) : (
                <div className="flex flex-col items-center py-14 text-gray-300">
                  <FolderKanban className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm text-gray-400 font-medium">Aucun projet</p>
                  <Link to="/admin/projects/new" className="btn btn-primary btn-sm mt-3">
                    <Plus className="w-3.5 h-3.5" /> Créer
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: 460 }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-black text-gray-800 text-sm">Activité récente</h2>
              </div>
              <Link to="/admin/activity"
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-all">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
              {activity?.data?.length ? (
                <div className="relative px-5 py-4">
                  <div className="absolute left-[36px] top-4 bottom-4 w-px bg-gray-100" />
                  <div className="space-y-0.5">
                    {activity.data.map((log) => {
                      const cfg: Record<string, { bg: string; text: string; dot: string; label: string; border: string }> = {
                        create: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Créé',     border: 'border-emerald-100' },
                        update: { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500',    label: 'Modifié',  border: 'border-blue-100' },
                        delete: { bg: 'bg-red-50',     text: 'text-red-500',     dot: 'bg-red-500',     label: 'Supprimé', border: 'border-red-100' },
                      };
                      const c = cfg[log.action] ?? { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-300', label: log.action, border: 'border-gray-100' };
                      return (
                        <div key={log.id} className="flex items-start gap-3 py-3">
                          <div className="relative flex-shrink-0 w-7 flex justify-center mt-0.5">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 ${c.bg} ${c.border}`}>
                              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-snug">{log.description}</p>
                            <div className="flex items-center flex-wrap gap-2 mt-1.5">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                                {c.label}
                              </span>
                              <span className="text-[11px] text-gray-500 font-semibold">
                                {log.user?.name ?? 'Système'}
                              </span>
                              <span className="text-[11px] text-gray-300 hidden sm:inline">·</span>
                              <span className="text-[11px] text-gray-400">
                                {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-14 text-gray-300">
                  <Activity className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm text-gray-400 font-medium">Aucune activité récente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 5 — ACTIONS RAPIDES ══════════════════════════════════════ */}
      <section>
        <SectionHeader icon={Zap} title="Actions rapides" color="#f59e0b" bg="#fef3c7" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/admin/projects/new', icon: Plus,       label: 'Nouveau projet',      color: '#10b981', bg: '#d1fae5', hover: 'hover:border-emerald-200' },
            { to: '/admin/financements', icon: DollarSign, label: 'Ajouter financement', color: '#3b82f6', bg: '#dbeafe', hover: 'hover:border-blue-200' },
            { to: '/admin/documents',    icon: Upload,      label: 'Upload document',     color: '#ec4899', bg: '#fce7f3', hover: 'hover:border-pink-200' },
            { to: '/admin/users',        icon: Users,       label: 'Gérer utilisateurs',  color: '#8b5cf6', bg: '#ede9fe', hover: 'hover:border-violet-200' },
          ].map(({ to, icon: Icon, label, color, bg, hover }) => (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-gray-100 ${hover} hover:shadow-md transition-all duration-200 group`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-xs font-bold text-gray-500 text-center group-hover:text-gray-700 transition-colors leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Empty Chart Placeholder ───────────────────────────────────────────────────
function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-300">
      <BarChart3 className="w-10 h-10 opacity-20" />
      <p className="text-sm text-gray-400 font-medium">Aucune donnée</p>
      {message && <p className="text-[11px] text-gray-300 text-center px-6 leading-relaxed">{message}</p>}
    </div>
  );
}