// src/pages/admin/settings/SettingsPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, statsApi } from '@/api/services';
import { Save, Settings, BarChart2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const qc = useQueryClient();
  const [statsConfig, setStatsConfig] = useState({ use_auto_calculation: true, manual_total_projects: 0, manual_total_budget: 0, manual_actifs: 0, manual_termines: 0 });
  const [siteSettings, setSiteSettings] = useState({ site_name: '', site_tagline: '', contact_email: '', contact_phone: '', contact_address: '' });

  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: () => settingsApi.admin().then(r => r.data) });

  useEffect(() => {
    if (!settings) return;
    const arr = Array.isArray(settings) ? settings : [];
    const get = (key: string) => arr.find((s) => s.key === key)?.value || '';
    setSiteSettings({ site_name: get('site_name'), site_tagline: get('site_tagline'), contact_email: get('contact_email'), contact_phone: get('contact_phone'), contact_address: get('contact_address') });
    const statsRaw = get('stats_config');
    if (statsRaw) {
      try {
        setStatsConfig(JSON.parse(statsRaw));
      } catch {
        // Config JSON malformée côté backend : on garde les valeurs par
        // défaut plutôt que de crasher la page, mais on le signale.
        console.warn('SettingsPage: stats_config JSON invalide, valeurs par défaut conservées.');
      }
    }
  }, [settings]);

  const statsMutation = useMutation({
    mutationFn: (data: typeof statsConfig) => statsApi.updateManual(data),
    onSuccess: () => { toast.success('Statistiques sauvegardées'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
  });

  const siteMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        await settingsApi.update(key, value);
      }
    },
    onSuccess: () => toast.success('Paramètres sauvegardés'),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings className="w-6 h-6" />Paramètres</h1>

      {/* Site settings */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-green-600" />Informations du site</h3>
        <div className="space-y-3">
          {([['site_name', 'Nom du site', 'GCF Madagascar'], ['site_tagline', 'Slogan', 'Plateforme Nationale de Financement Climatique'], ['contact_email', 'Email de contact', 'info@gcf-madagascar.org'], ['contact_phone', 'Téléphone', '+261 20 22 XXX XX'], ['contact_address', 'Adresse', 'Antananarivo, Madagascar']] as const).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" value={siteSettings[key] || ''} onChange={e => setSiteSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} />
            </div>
          ))}
          <button className="btn btn-primary" onClick={() => siteMutation.mutate(siteSettings)} disabled={siteMutation.isPending}><Save className="w-4 h-4" />{siteMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</button>
        </div>
      </div>

      {/* Stats settings */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-green-600" />Statistiques publiques</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="auto_calc" checked={statsConfig.use_auto_calculation} onChange={e => setStatsConfig(s => ({ ...s, use_auto_calculation: e.target.checked }))} className="w-4 h-4 accent-green-600" />
            <label htmlFor="auto_calc" className="text-sm font-medium text-gray-700">Calcul automatique depuis la base de données</label>
          </div>
          {!statsConfig.use_auto_calculation && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="col-span-2 text-xs text-yellow-700 font-medium">⚠️ Mode manuel — Valeurs affichées sur le site vitrine</p>
              {([['manual_total_projects', 'Total projets'], ['manual_total_budget', 'Budget total (USD)'], ['manual_actifs', 'Projets actifs'], ['manual_termines', 'Projets terminés']] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input type="number" className="form-input" value={statsConfig[key] || 0} onChange={e => setStatsConfig(s => ({ ...s, [key]: parseFloat(e.target.value) }))} />
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => statsMutation.mutate(statsConfig)} disabled={statsMutation.isPending}><Save className="w-4 h-4" />{statsMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  );
}
