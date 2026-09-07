// src/pages/admin/users/UsersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/services';
import { useAuthStore } from '@/store/authStore';
import {
  Plus, Edit, Trash2, X, Save, ToggleLeft, ToggleRight,
  Search, Shield, User as UserIcon, Users, ChevronLeft, ChevronRight,
  KeyRound, Mail, BadgeCheck, Clock, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

// ── Constantes rôles (super_admin JAMAIS affiché ni sélectionnable) ────────────
const ROLES = ['admin', 'gestionnaire', 'gestionnaire_cms', 'utilisateur'] as const;

const ROLE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  icon: React.ElementType; description: string;
}> = {
  admin: {
    label: 'Administrateur',
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',
    icon: Shield,
    description: 'Accès complet — gestion CMS, utilisateurs, paramètres',
  },
  gestionnaire: {
    label: 'Gestionnaire',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    icon: BadgeCheck,
    description: 'Saisie et modification des données métier (projets, financements, dépenses)',
  },
  gestionnaire_cms: {
    label: 'Gestionnaire CMS',
    color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200',
    icon: Globe,
    description: 'Site vitrine uniquement — FAQ, partenaires, slider, chatbot, paramètres publics',
  },
  utilisateur: {
    label: 'Utilisateur',
    color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200',
    icon: UserIcon,
    description: 'Lecture seule — tableau de bord et consultation des projets',
  },
};


// ── Composant Badge rôle ──────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return <span className="text-xs text-gray-400">{role}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Avatar initiales ───────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = [
    ['#16a34a', '#dcfce7'], ['#2563eb', '#dbeafe'], ['#7c3aed', '#ede9fe'],
    ['#d97706', '#fef3c7'], ['#0891b2', '#e0f2fe'], ['#be185d', '#fce7f3'],
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-xl flex items-center justify-center font-black flex-shrink-0`}
      style={{ background: color[1], color: color[0] }}>
      {initials}
    </div>
  );
}

// ── Formulaire modal ───────────────────────────────────────────────────────────
function UserModal({
  editing, onClose,
}: {
  editing: User | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:                  editing?.name  ?? '',
    email:                 editing?.email ?? '',
    password:              '',
    password_confirmation: '',
    role:                  editing?.role  ?? 'gestionnaire',
  });
  const [tab, setTab] = useState<'info' | 'role'>('info');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: Partial<User> & { password?: string; password_confirmation?: string }) =>
      editing ? userApi.update(editing.id, data) : userApi.create(data as Partial<User> & { password: string; password_confirmation: string }),
    onSuccess: () => {
      toast.success(editing ? 'Utilisateur mis à jour ✓' : 'Utilisateur créé ✓');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'), { duration: 5000 });
    },
  });

  const handleSubmit = () => {
    const payload: Partial<User> & { password?: string; password_confirmation?: string } =
      { name: form.name, email: form.email, role: form.role };
    if (form.password) {
      payload.password              = form.password;
      payload.password_confirmation = form.password_confirmation;
    }
    mutation.mutate(payload);
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {editing ? (
              <Avatar name={editing.name} />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div>
              <h3 className="font-black text-gray-800">
                {editing ? `Modifier — ${editing.name}` : 'Nouvel utilisateur'}
              </h3>
              {editing && <RoleBadge role={editing.role} />}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-50 mx-6 mt-5 p-1 rounded-xl">
          {([
            { key: 'info', label: 'Informations' },
            { key: 'role', label: 'Rôle & accès' },
          ] as const).map(t => (
            <button key={t.key} type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── Tab Informations ── */}
          {tab === 'info' && (
            <>
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" /> Nom complet *
                </label>
                <input className="form-input" required placeholder="Jean Rakoto"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> Adresse email *
                </label>
                <input type="email" className="form-input" required placeholder="jean@gcf-madagascar.org"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  Mot de passe {editing ? '(laisser vide = inchangé)' : '*'}
                </label>
                <input type="password" className="form-input"
                  placeholder={editing ? '••••••••' : 'Min. 8 caract., majuscule + chiffre'}
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              {form.password && (
                <div>
                  <label className="form-label">Confirmer le mot de passe</label>
                  <input type="password" className="form-input" placeholder="••••••••"
                    value={form.password_confirmation}
                    onChange={e => set('password_confirmation', e.target.value)} />
                </div>
              )}
            </>
          )}

          {/* ── Tab Rôle ── */}
          {tab === 'role' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium">
                Sélectionnez le niveau d'accès de cet utilisateur.
              </p>
              {ROLES.map(r => {
                const cfg  = ROLE_CONFIG[r];
                const Icon = cfg.icon;
                const active = form.role === r;
                return (
                  <button
                    key={r} type="button"
                    onClick={() => set('role', r)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      active
                        ? `${cfg.border} ${cfg.bg}`
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? cfg.bg : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${active ? cfg.color : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-black ${active ? cfg.color : 'text-gray-700'}`}>
                          {cfg.label}
                        </p>
                        {active && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                            Sélectionné
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{cfg.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      active ? `${cfg.border.replace('border', 'bg').replace('-200','-500').replace('-200','')} border-transparent` : 'border-gray-300'
                    }`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc               = useQueryClient();
  const { user: me }     = useAuthStore();
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, filterRole],
    queryFn: () => userApi.list({ page, search, role: filterRole || undefined, per_page: 15 }).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => userApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      toast.success('Utilisateur supprimé');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur')),
  });

  const openCreate = () => { setEditing(null); setModal(true); };
  const openEdit   = (u: User) => { setEditing(u); setModal(true); };

  // Compteurs par rôle

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.total ?? 0} compte{(data?.total ?? 0) > 1 ? 's' : ''} enregistré{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Ajouter un utilisateur
        </button>
      </div>

      {/* Cartes résumé rôles */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map(r => {
          const cfg  = ROLE_CONFIG[r];
          const Icon = cfg.icon;
          return (
            <button key={r} type="button"
              onClick={() => setFilterRole(filterRole === r ? '' : r)}
              className={`card p-4 flex items-center gap-3 hover:shadow-md transition-all text-left border-2 ${
                filterRole === r ? `${cfg.border} ${cfg.bg}` : 'border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-800 leading-none">
                  {(data?.data ?? []).filter((u: User) => u.role === r).length}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="form-input pl-9" placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-input w-auto"
          value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
          <option value="">Tous les rôles</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
          ))}
        </select>
        {(search || filterRole) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setFilterRole(''); setPage(1); }}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : data?.data?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Dernière connexion', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((u: User) => {
                    const isMe = u.id === me?.id;
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${isMe ? 'bg-green-50/30' : ''}`}>
                        {/* Utilisateur */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {u.name}
                                {isMe && (
                                  <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                    Vous
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-300" />
                            {u.email}
                          </span>
                        </td>
                        {/* Rôle */}
                        <td className="px-5 py-3.5">
                          <RoleBadge role={u.role} />
                        </td>
                        {/* Statut */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            u.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                            {u.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        {/* Dernière connexion */}
                        <td className="px-5 py-3.5">
                          {u.last_login_at ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(u.last_login_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Jamais connecté</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            {/* Toggle actif/inactif */}
                            {!isMe && (
                              <button
                                onClick={() => toggleMutation.mutate(u.id)}
                                title={u.is_active ? 'Désactiver' : 'Activer'}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                {u.is_active
                                  ? <ToggleRight className="w-5 h-5 text-green-500" />
                                  : <ToggleLeft  className="w-5 h-5 text-gray-400" />
                                }
                              </button>
                            )}
                            {/* Modifier */}
                            <button
                              onClick={() => openEdit(u)}
                              title="Modifier"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {/* Supprimer */}
                            {!isMe && (
                              <button
                                onClick={() => setDeleteId(u.id)}
                                title="Supprimer"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.last_page > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                <span className="text-sm text-gray-400">{data.from}–{data.to} sur {data.total}</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 font-medium">{page} / {data.last_page}</span>
                  <button disabled={page === data.last_page} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm text-gray-400 font-medium mb-3">Aucun utilisateur trouvé</p>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Modal créer / modifier */}
      {modal && (
        <UserModal editing={editing} onClose={() => { setModal(false); setEditing(null); }} />
      )}

      {/* Modal suppression */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-800 text-center mb-2">Supprimer l'utilisateur ?</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Cette action est irréversible. L'utilisateur perdra tout accès à la plateforme.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn-danger flex-1"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}