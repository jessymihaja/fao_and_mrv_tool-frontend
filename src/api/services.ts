import api from './client';
import type {
  Project, Financement, Document, User, Depense,
  Faq, Partner, Contact, Slider, GlobalStats, PerspectivesHomepageStats, Indicateur, RapportNational, FiltresIndicateurs,
  PaginatedResponse, classification, status, domaine_intervention, entite_accreditee,
  indicateur_referentiel, Composante, Activite, contribution_categorie, MapDataResponse, organisme_contributeur,  BudgetPledge, BudgetMobilisation, BudgetApprobation, BudgetEngagement, BudgetProgrammation,
  BudgetDecaissement, BudgetDepense, BudgetCycleSummary,
  ProjectIdea, ProjectIdeaFinancement, ProjectIdeaDocument, ProjectIdeaDashboard, Secteur,
  Stakeholder, StakeholderCategory, StakeholderRole, StakeholderContributionType, StakeholderDocument,
  ProjectPerspective, PerspectiveType, ChatbotSettings, ChatbotKnowledgeEntry, ChatbotKnowledgeFormData,
  Province, District, Commune, Fokontany, GeoRegionRef, ActivityLog, RapportDetail, LaravelResourceCollection, Setting,
  Result, Beneficiary, BeneficiaryListResponse, ResultType, BeneficiaryType, BeneficiaryCategory,
  DepenseProjectSummary, GeographicZone, ZoneCandidate,
} from '@/types';

// ─── AUTH ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me:     () => api.get('/auth/me'),
};

// ─── STATS ────────────────────────────────────────────────────
export const statsApi = {
  public:       () => api.get<GlobalStats>('/public/stats'),
  perspectives: () => api.get<PerspectivesHomepageStats>('/public/stats/perspectives'),
  global:       () => api.get<GlobalStats>('/stats/global'),
  byStatus:     () => api.get('/stats/projects-by-status'),
  budgetByYear: () => api.get('/stats/budget-by-year'),
  byRegion:     () => api.get('/stats/projects-by-region'),
  updateManual: (data: { use_auto_calculation: boolean; manual_total_projects: number; manual_total_budget: number; manual_actifs: number; manual_termines: number }) => api.post('/settings/stats', data),
};

// ─── PROJECTS (PUBLIC) ────────────────────────────────────────
export const publicProjectApi = {
  list:    (params?: object) =>
    api.get<PaginatedResponse<Project>>('/public/projects', { params }),
  mapData: () => api.get<MapDataResponse>('/public/projects/map'),
  show:    (id: number) => api.get<Project>(`/public/projects/${id}`),
};

// ─── CLASSIFICATIONS ──────────────────────────────────────────────────────
export const classificationApi = {
  list:    (params?: object) =>
    api.get<classification[]>('/classifications', { params }),
  create: (data: Partial<classification>) =>
    api.post<classification>('/classifications', data),
  show:    (id: number) => api.get<classification>(`/classifications/${id}`),
  update: (id: number, data: Partial<classification>) =>
    api.put<classification>(`/classifications/${id}`, data),
  delete: (id: number) => api.delete(`/classifications/${id}`),
};

// ─── CATÉGORIES DE CONTRIBUTION EN NATURE ───────────────────────────
export const contributionCategorieApi = {
  list:   (params?: object) =>
    api.get<contribution_categorie[]>('/contribution-categories', { params }),
  create: (data: Partial<contribution_categorie>) =>
    api.post<contribution_categorie>('/contribution-categories', data),
};

// ─── ORGANISMES CONTRIBUTEURS (CO-FINANCEURS) ───────────────────────
export const organismeContributeurApi = {
  list:   (params?: object) =>
    api.get<organisme_contributeur[]>('/organismes-contributeurs', { params }),
  create: (data: Partial<organisme_contributeur>) =>
    api.post<organisme_contributeur>('/organismes-contributeurs', data),
};

// ─── RÉFÉRENTIEL INDICATEURS ────────────────────────────────────────
export const indicateurReferentielApi = {
  list:   (params?: object) =>
    api.get<indicateur_referentiel[]>('/indicateur-referentiels', { params }),
  create: (data: Partial<indicateur_referentiel>) =>
    api.post<indicateur_referentiel>('/indicateur-referentiels', data),
  update: (id: number, data: Partial<indicateur_referentiel>) =>
    api.put<indicateur_referentiel>(`/indicateur-referentiels/${id}`, data),
  delete: (id: number) => api.delete(`/indicateur-referentiels/${id}`),
};

// ─── STATUSES ──────────────────────────────────────────────────────
export const statusApi = {
  list: (params?: object) =>
    api.get<status[]>('/statuses', { params }),
  create: (data: Partial<status>) =>
    api.post<status>('/statuses', data),
  show:    (id: number) => api.get<status>(`/statuses/${id}`),
  update: (id: number, data: Partial<status>) =>
    api.put<status>(`/statuses/${id}`, data),
  delete: (id: number) => api.delete(`/statuses/${id}`),
};

// ─── ENTITE ACCREDITEE ──────────────────────────────────────────────────────
export const entite_accrediteeApi = {
  list:    (params?: object) =>
    api.get<entite_accreditee[]>('/entite-accreditees', { params }),
  create: (data: Partial<entite_accreditee>) =>
    api.post<entite_accreditee>('/entite-accreditees', data),
  show:    (id: number) => api.get<entite_accreditee>(`/entite-accreditees/${id}`),
  update: (id: number, data: Partial<entite_accreditee>) =>
    api.put<entite_accreditee>(`/entite-accreditees/${id}`, data),
  delete: (id: number) => api.delete(`/entite-accreditees/${id}`),
};

// ─── DOMAINES INTERVENTION ──────────────────────────────────────────────────────
export const domaine_interventionApi = {
  list:    (params?: object) =>
    api.get<domaine_intervention[]>('/domaine-interventions', { params }),
  create: (data: Partial<domaine_intervention>) =>
    api.post<domaine_intervention>('/domaine-interventions', data),
  show:    (id: number) => api.get<domaine_intervention>(`/domaine-interventions/${id}`),
  update: (id: number, data: Partial<domaine_intervention>) =>
    api.put<domaine_intervention>(`/domaine-interventions/${id}`, data),
  delete: (id: number) => api.delete(`/domaine-interventions/${id}`),
};

// ─── PROJECTS (ADMIN) ─────────────────────────────────────────
export const projectApi = {
  list:         (params?: object) =>
    api.get<PaginatedResponse<Project>>('/projects', { params }),
  create:       (data: Partial<Project>) => api.post<Project>('/projects', data),
  show:         (id: number) => api.get<Project>(`/projects/${id}`),
  update:       (id: number, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data), 
  delete:       (id: number) => api.delete(`/projects/${id}`),
  advanceStep:  (id: number, step: number) =>
    api.post<Project>(`/projects/${id}/wizard-step`, { step }),
  financements: (id: number) => api.get<Financement[] | LaravelResourceCollection<Financement>>(`/projects/${id}/financements`),
  documents:    (id: number) => api.get(`/projects/${id}/documents`),
  depenses:     (id: number, params?: object) =>
    api.get(`/projects/${id}/depenses`, { params }),
  // ── Zones géographiques multiples (région/district/commune) ──────────
  geographicZones: (id: number) =>
    api.get<GeographicZone[]>(`/projects/${id}/geographical-zones`),
  addGeographicZone: (id: number, zoneType: 'region' | 'district' | 'commune', zoneId: number) =>
    api.post<{ created: GeographicZone[]; skipped: { zone_type: string; zone_id: number }[] }>(
      `/projects/${id}/geographical-zones`,
      { zone_type: zoneType, zone_id: zoneId }
    ),
  addGeographicZones: (id: number, zones: { zone_type: 'region' | 'district' | 'commune'; zone_id: number }[]) =>
    api.post<{ created: GeographicZone[]; skipped: { zone_type: string; zone_id: number }[] }>(
      `/projects/${id}/geographical-zones`,
      { zones }
    ),
  removeGeographicZone: (id: number, zoneAssociationId: number) =>
    api.delete(`/projects/${id}/geographical-zones/${zoneAssociationId}`),
};

// ─── FINANCEMENTS ─────────────────────────────────────────────
export const financementApi = {
  list:   (params?: object) =>
    api.get<LaravelResourceCollection<Financement>>('/financements', { params }),
  create: (data: Partial<Financement>) =>
    api.post<Financement>('/financements', data),
  show:   (id: number) => api.get<Financement>(`/financements/${id}`),
  update: (id: number, data: Partial<Financement>) =>
    api.put<Financement>(`/financements/${id}`, data),
  delete: (id: number) => api.delete(`/financements/${id}`),
  totaux: (params?: { project_id?: number }) =>
      api.get('/financements/totaux', { params }),
};

// ─── SUIVI FINANCIER ──────────────────────────────────────────
/**
 * Téléchargement authentifié générique (fichier privé sur disque 'local'
 * côté backend). Réutilisé par tous les points de téléchargement du module
 * Budgets (pledges, mobilisations, approbations, engagements, plans,
 * décaissements, rapports d'audit) — même logique que depenseApi.download.
 */
const downloadAuthenticatedFile = (path: string, fallbackFilename: string): void => {
  const token   = localStorage.getItem('gcf_token');
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      if (!res.ok) throw new Error('Erreur téléchargement');
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? fallbackFilename;
      return res.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Impossible de télécharger le fichier.'));
};

export const suiviApi = {
  // Engagements
  engagements:       (financementId: number) =>
    api.get(`/financements/${financementId}/engagements`),
  createEngagement:  (financementId: number, data: object) =>
    api.post(`/financements/${financementId}/engagements`, data),
  createEngagementWithFile: (financementId: number, formData: FormData) =>
    api.post<BudgetEngagement>(`/financements/${financementId}/engagements`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateEngagement:  (id: number, data: object) =>
    api.put(`/engagements/${id}`, data),
  updateEngagementWithFile: (id: number, formData: FormData) =>
    api.post<BudgetEngagement>(`/engagements/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteEngagement:  (id: number) =>
    api.delete(`/engagements/${id}`),
  downloadEngagement: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/engagements/${id}/download`, filename ?? `accord_${id}`),

  // Plans de décaissement (étape "Budgets programmés")
  plans:       (financementId: number) =>
    api.get<BudgetProgrammation[]>(`/financements/${financementId}/decaissement-plans`),
  createPlan:  (financementId: number, data: object) =>
    api.post(`/financements/${financementId}/decaissement-plans`, data),
  createPlanWithFile: (financementId: number, formData: FormData) =>
    api.post<BudgetProgrammation>(`/financements/${financementId}/decaissement-plans`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updatePlan:  (id: number, data: object) =>
    api.put(`/decaissement-plans/${id}`, data),
  updatePlanWithFile: (id: number, formData: FormData) =>
    api.post<BudgetProgrammation>(`/decaissement-plans/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePlan:  (id: number) =>
    api.delete(`/decaissement-plans/${id}`),
  downloadPlan: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/decaissement-plans/${id}/download`, filename ?? `programmation_${id}`),

  // Décaissements réels
  decaissements:       (financementId: number) =>
    api.get(`/financements/${financementId}/decaissements`),
  createDecaissement:  (financementId: number, data: object) =>
    api.post(`/financements/${financementId}/decaissements`, data),
  createDecaissementWithFile: (financementId: number, formData: FormData) =>
    api.post<BudgetDecaissement>(`/financements/${financementId}/decaissements`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateDecaissement:  (id: number, data: object) =>
    api.put(`/decaissements/${id}`, data),
  updateDecaissementWithFile: (id: number, formData: FormData) =>
    api.post<BudgetDecaissement>(`/decaissements/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteDecaissement:  (id: number) =>
    api.delete(`/decaissements/${id}`),
  downloadDecaissement: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/decaissements/${id}/download`, filename ?? `decaissement_${id}`),
};

// ─── DÉPENSES ─────────────────────────────────────────────────
export const depenseApi = {
  list:   (params?: object) =>
    api.get<PaginatedResponse<Depense>>('/depenses', { params }),
  create: (formData: FormData) =>
    api.post<Depense>('/depenses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  show:   (id: number) => api.get<Depense>(`/depenses/${id}`),
  update: (id: number, data: object) => api.put<Depense>(`/depenses/${id}`, data),
  delete: (id: number) => api.delete(`/depenses/${id}`),
  /** Suivi Projet → Composante → Activité, totaux + budget/solde/taux d'exécution */
  summaryByProject: (projectId: number) =>
    api.get<DepenseProjectSummary>(`/projects/${projectId}/depenses-summary`),
  /** Étape 7 du cycle budgétaire : auditer une dépense déjà enregistrée */
  audit: (id: number, formData: FormData) =>
    api.post<BudgetDepense>(`/depenses/${id}/audit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadRapportAudit: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/depenses/${id}/rapport-audit/download`, filename ?? `rapport_audit_${id}`),
  download: (id: number): void => {
    const token   = localStorage.getItem('gcf_token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    fetch(`${baseUrl}/depenses/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Erreur téléchargement');
        const disposition = res.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match?.[1] ?? `justification_${id}`;
        return res.blob().then(blob => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Impossible de télécharger le fichier.'));
  },
};

// ─── DOCUMENTS ────────────────────────────────────────────────
export const documentApi = {
  list:   (params?: object) =>
    api.get<PaginatedResponse<Document>>('/documents', { params }),
  listByProject: (projectId: number) =>
    api.get<Document[]>(`/projects/${projectId}/documents`),
  listByComposante: (composanteId: number) =>
    api.get<Document[]>(`/composantes/${composanteId}/documents`),
  upload: (formData: FormData) =>
    api.post<Document>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  show:   (id: number) => api.get<Document>(`/documents/${id}`),
  delete: (id: number) => api.delete(`/documents/${id}`),
  download: async (id: number): Promise<void> => {
    const res = await api.get<{ url: string }>(`/documents/${id}/signed-url`);
    window.open(res.data.url, '_blank');
  },
};

// ─── USERS ────────────────────────────────────────────────────
export const userApi = {
  list:       (params?: object) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  create:     (data: Partial<User> & { password: string; password_confirmation: string }) =>
    api.post<User>('/users', data),
  show:       (id: number) => api.get<User>(`/users/${id}`),
  update:     (id: number, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  delete:     (id: number) => api.delete(`/users/${id}`),
  updateRole: (id: number, role: string) =>
    api.put(`/users/${id}/role`, { role }),
  toggle:     (id: number) => api.put(`/users/${id}/toggle`),
};

// ─── GEO ──────────────────────────────────────────────────────
export const geoApi = {
  provinces:  () => api.get<Province[]>('/geo/provinces'),
  regions:    (provinceId?: number) =>
    api.get<GeoRegionRef[]>('/geo/regions' + (provinceId ? `/${provinceId}` : '')),
  districts:  (regionId?: number) =>
    api.get<District[]>('/geo/districts' + (regionId ? `/${regionId}` : '')),
  communes:   (districtId?: number) =>
    api.get<Commune[]>('/geo/communes' + (districtId ? `/${districtId}` : '')),
  fokontany:  (communeId?: number) =>
    api.get<Fokontany[]>('/geo/fokontany' + (communeId ? `/${communeId}` : '')),
  // Recherche unifiée région/district/commune (module zones multiples).
  searchZones: (q: string) =>
    api.get<ZoneCandidate[]>('/geo/zones/search', { params: { q } }),
};

// ─── CMS ──────────────────────────────────────────────────────
export const cmsApi = {
  faq:          () => api.get<Faq[]>('/public/faq'),
  adminFaq:     () => api.get<Faq[]>('/cms/faq'),
  createFaq:    (data: Partial<Faq>) => api.post<Faq>('/cms/faq', data),
  updateFaq:    (id: number, data: Partial<Faq>) =>
    api.put<Faq>(`/cms/faq/${id}`, data),
  deleteFaq:    (id: number) => api.delete(`/cms/faq/${id}`),
  partners:     () => api.get<Partner[]>('/public/partners'),
  adminPartners:() => api.get<Partner[]>('/cms/partners'),
  createPartner:(data: FormData) =>
    api.post<Partner>('/cms/partners', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updatePartner:(id: number, data: FormData) =>
    api.post<Partner>(`/cms/partners/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePartner:(id: number) => api.delete(`/cms/partners/${id}`),
  sendContact:  (data: Partial<Contact>) => api.post('/public/contact', data),
  contacts:     () => api.get<PaginatedResponse<Contact>>('/cms/contacts'),
  markAsRead:   (id: number) => api.put(`/cms/contacts/${id}/read`),
  deleteContact:(id: number) => api.delete(`/cms/contacts/${id}`),
  slider:       () => api.get<Slider[]>('/public/slider'),
  adminSlider:  () => api.get<Slider[]>('/cms/slider'),
  createSlider: (data: FormData) =>
    api.post<Slider>('/cms/slider', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateSlider: (id: number, data: FormData) =>
    api.post<Slider>(`/cms/slider/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteSlider: (id: number) => api.delete(`/cms/slider/${id}`),
};

// ─── CHATBOT ──────────────────────────────────────────────────
export const chatbotApi = {
  publicSettings:  () => api.get<ChatbotSettings>('/chatbot/settings/public'),
  message:         (message: string) => api.post('/chatbot/message', { message }),
  settings:        () => api.get<ChatbotSettings>('/chatbot/settings'),
  updateSettings:  (data: Partial<ChatbotSettings>) => api.put('/chatbot/settings', data),
  knowledge:       () => api.get<ChatbotKnowledgeEntry[]>('/chatbot/knowledge'),
  createKnowledge: (data: ChatbotKnowledgeFormData) => api.post('/chatbot/knowledge', data),
  updateKnowledge: (id: number, data: ChatbotKnowledgeFormData) =>
    api.put(`/chatbot/knowledge/${id}`, data),
  deleteKnowledge: (id: number) => api.delete(`/chatbot/knowledge/${id}`),
};

// ─── RAPPORTS ─────────────────────────────────────────────────
export const rapportApi = {
  show:         (id: number) => api.get<RapportDetail>(`/rapports/${id}`),
  exportPdfUrl: (id: number) =>
    `${api.defaults.baseURL}/rapports/${id}/export/pdf`,
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────
export const activityApi = {
  list: (params?: object) => api.get<PaginatedResponse<ActivityLog>>('/activity-logs', { params }),
};

// ─── SETTINGS ─────────────────────────────────────────────────
export const settingsApi = {
  public: () => api.get<Setting[]>('/public/settings'),
  admin:  () => api.get<Setting[]>('/settings'),
  update: (key: string, value: string, type?: string) =>
    api.put(`/settings/${key}`, { value, type }),
};

// ─── INDICATEURS ──────────────────────────────────────────────
export const indicateurApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Indicateur>>('/indicateurs', { params }),

  listByProject: (projectId: number) =>
    api.get<Indicateur[]>(`/projects/${projectId}/indicateurs`),

  // Tous les indicateurs du projet, quel que soit leur niveau de
  // rattachement (projet / composante / activité) — à utiliser pour les
  // sélecteurs de type "Indicateur associé" (module Résultats), pas pour la
  // gestion CRUD des indicateurs "niveau projet" (cf. listByProject).
  listAllForProject: (projectId: number) =>
    api.get<Indicateur[]>(`/projects/${projectId}/indicateurs-all`),

  listByComposante: (composanteId: number) =>
    api.get<Indicateur[]>(`/composantes/${composanteId}/indicateurs`),

  listByActivite: (activiteId: number) =>
    api.get<Indicateur[]>(`/activites/${activiteId}/indicateurs`),

  create: (data: FormData) =>
    api.post<Indicateur>('/indicateurs', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  show: (id: number) =>
    api.get<Indicateur>(`/indicateurs/${id}`),

  update: (id: number, data: FormData) =>
    api.post<Indicateur>(`/indicateurs/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
    delete: (id: number) =>
    api.delete(`/indicateurs/${id}`),
  
  deleteJustificatif: (indicateurId: number, fichierIndex: number) =>
    api.delete(`/indicateurs/${indicateurId}/justificatifs/${fichierIndex}`),
  
  // Dashboard KPIs agrégés
  kpis: (params?: FiltresIndicateurs) =>
    api.get('/indicateurs/kpis', { params }),       
};

// ─── RAPPORTS NATIONAUX ───────────────────────────────────────
export const rapportNationalApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<RapportNational>>('/rapports-nationaux', { params }),
  
  create: (data: Partial<RapportNational>) =>
    api.post<RapportNational>('/rapports-nationaux', data),
  
  show: (id: number) =>
    api.get<RapportNational>(`/rapports-nationaux/${id}`),
  
  generate: (id: number) =>
    api.post<RapportNational>(`/rapports-nationaux/${id}/generate`),
  
  delete: (id: number) =>
    api.delete(`/rapports-nationaux/${id}`),
  
  exportPdfUrl: (id: number) =>
    `${api.defaults.baseURL}/rapports-nationaux/${id}/export/pdf`,
  
  exportExcelUrl: (id: number) =>
    `${api.defaults.baseURL}/rapports-nationaux/${id}/export/excel`,
};
// ─── COMPOSANTES ────────────────────────────────────────────────
export const composanteApi = {
  listByProject: (projectId: number, params?: object) =>
    api.get<Composante[]>(`/projects/${projectId}/composantes`, { params }),
  create: (projectId: number, data: Partial<Composante>) =>
    api.post<Composante>(`/projects/${projectId}/composantes`, data),
  show:   (id: number) => api.get<Composante>(`/composantes/${id}`),
  update: (id: number, data: Partial<Composante>) =>
    api.put<Composante>(`/composantes/${id}`, data),
  delete: (id: number) => api.delete(`/composantes/${id}`),
};

// ─── ACTIVITÉS ──────────────────────────────────────────────────
export const activiteApi = {
  listByComposante: (composanteId: number) =>
    api.get<Activite[]>(`/composantes/${composanteId}/activites`),
  listByProject: (projectId: number) =>
    api.get<Activite[]>(`/projects/${projectId}/activites`),
  // Toutes les activités du projet (directes + via composantes) — à utiliser
  // pour les sélecteurs (cycle budgétaire, résultats...), pas pour la gestion
  // CRUD des activités "directes au projet" (cf. listByProject ci-dessus).
  listAllForProject: (projectId: number) =>
    api.get<Activite[]>(`/projects/${projectId}/activites-all`),
  create: (composanteId: number, data: FormData) =>
    api.post<Activite>(`/composantes/${composanteId}/activites`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createForProject: (projectId: number, data: FormData) =>
    api.post<Activite>(`/projects/${projectId}/activites`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  show:   (id: number) => api.get<Activite>(`/activites/${id}`),
  update: (id: number, data: FormData) =>
    api.post<Activite>(`/activites/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/activites/${id}`),
  deletePieceJointe: (activiteId: number, pieceId: number) =>
    api.delete(`/activites/${activiteId}/pieces-jointes/${pieceId}`),
};

// ─── RÉSULTATS DU PROJET ────────────────────────────────────────
// project_id toujours pris depuis la route — jamais depuis le payload.
export const resultApi = {
  listByProject: (projectId: number, params?: object) =>
    api.get<Result[]>(`/projects/${projectId}/results`, { params }),
  create: (projectId: number, data: FormData) =>
    api.post<Result>(`/projects/${projectId}/results`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  show:   (id: number) => api.get<Result>(`/results/${id}`),
  update: (id: number, data: FormData) =>
    api.post<Result>(`/results/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/results/${id}`),
  deletePieceJointe: (resultId: number, pieceId: number) =>
    api.delete(`/results/${resultId}/pieces-jointes/${pieceId}`),
};

// ─── BÉNÉFICIAIRES DU PROJET ────────────────────────────────────
// project_id toujours pris depuis la route — jamais depuis le payload.
export const beneficiaryApi = {
  listByProject: (projectId: number, params?: object) =>
    api.get<BeneficiaryListResponse>(`/projects/${projectId}/beneficiaries`, { params }),
  create: (projectId: number, data: Partial<Beneficiary>) =>
    api.post<Beneficiary>(`/projects/${projectId}/beneficiaries`, data),
  show:   (id: number) => api.get<Beneficiary>(`/beneficiaries/${id}`),
  update: (id: number, data: Partial<Beneficiary>) =>
    api.put<Beneficiary>(`/beneficiaries/${id}`, data),
  delete: (id: number) => api.delete(`/beneficiaries/${id}`),
};

// ─── RÉFÉRENTIELS Résultats / Bénéficiaires (ajout en ligne "+") ──
export const resultTypeApi = {
  list:   () => api.get<ResultType[]>('/result-types'),
  create: (designation: string) => api.post<ResultType>('/result-types', { designation }),
};
export const beneficiaryTypeApi = {
  list:   () => api.get<BeneficiaryType[]>('/beneficiary-types'),
  create: (designation: string) => api.post<BeneficiaryType>('/beneficiary-types', { designation }),
};
export const beneficiaryCategoryApi = {
  list:   () => api.get<BeneficiaryCategory[]>('/beneficiary-categories'),
  create: (designation: string) => api.post<BeneficiaryCategory>('/beneficiary-categories', { designation }),
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE BUDGETS — cycle de vie des budgets climatiques
// Annoncé → Mobilisé → Engagé → Approuvé → Programmé → Décaissé → Audité/Dépensé
// ═══════════════════════════════════════════════════════════════════════════

// ─── Étape 1 : Budgets annoncés (Pledges) ──────────────────────
export const budgetPledgeApi = {
  list:   (financementId: number) =>
    api.get<BudgetPledge[]>(`/financements/${financementId}/pledges`),
  create: (financementId: number, formData: FormData) =>
    api.post<BudgetPledge>(`/financements/${financementId}/pledges`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.post<BudgetPledge>(`/pledges/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/pledges/${id}`),
  download: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/pledges/${id}/download`, filename ?? `pledge_${id}`),
};

// ─── Étape 2 : Budgets mobilisés (repose sur financement_contributions) ─
export const budgetMobilisationApi = {
  list:   (financementId: number) =>
    api.get<BudgetMobilisation[]>(`/financements/${financementId}/mobilisations`),
  create: (financementId: number, formData: FormData) =>
    api.post<BudgetMobilisation>(`/financements/${financementId}/mobilisations`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.post<BudgetMobilisation>(`/mobilisations/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/mobilisations/${id}`),
  download: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/mobilisations/${id}/download`, filename ?? `mobilisation_${id}`),
};

// ─── Étape 4 : Budgets approuvés ────────────────────────────────
export const budgetApprobationApi = {
  list:   (financementId: number) =>
    api.get<BudgetApprobation[]>(`/financements/${financementId}/approbations`),
  create: (financementId: number, formData: FormData) =>
    api.post<BudgetApprobation>(`/financements/${financementId}/approbations`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, formData: FormData) =>
    api.post<BudgetApprobation>(`/approbations/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/approbations/${id}`),
  download: (id: number, filename?: string) =>
    downloadAuthenticatedFile(`/approbations/${id}/download`, filename ?? `approbation_${id}`),
};

// ─── Vue consolidée du cycle (tableau de bord / chronologie / cascade) ──
export const budgetCycleApi = {
  forProject: (
    projectId: number,
    params?: { financement_id?: number; composante_id?: number; activite_id?: number }
  ) => api.get<BudgetCycleSummary>(`/projects/${projectId}/budget-cycle`, { params }),
  forFinancement: (
    financementId: number,
    params?: { composante_id?: number; activite_id?: number }
  ) => api.get<BudgetCycleSummary>(`/financements/${financementId}/budget-cycle`, { params }),
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE IDÉES DE PROJET
// ═══════════════════════════════════════════════════════════════════════════

export const secteurApi = {
  list:   () => api.get<Secteur[]>('/secteurs'),
  create: (designation: string) => api.post<Secteur>('/secteurs', { designation }),
};

export interface ProjectIdeaListParams {
  search?: string;
  statut?: string;
  secteur_id?: number;
  region_id?: number;
  bailleur_id?: number;
  per_page?: number;
  page?: number;
}

export const projectIdeaApi = {
  list: (params?: ProjectIdeaListParams) =>
    api.get<PaginatedResponse<ProjectIdea>>('/project-ideas', { params }),
  /** Toutes les lignes correspondant aux filtres (non paginées), pour l'export PDF/Excel. */
  exportData: (params?: ProjectIdeaListParams) =>
    api.get<{ data: ProjectIdea[] }>('/project-ideas/export-data', { params }),
  show:   (id: number) => api.get<ProjectIdea>(`/project-ideas/${id}`),
  create: (data: object) => api.post<ProjectIdea>('/project-ideas', data),
  update: (id: number, data: object) => api.put<ProjectIdea>(`/project-ideas/${id}`, data),
  delete: (id: number) => api.delete(`/project-ideas/${id}`),

  changeStatus: (id: number, nouveau_statut: string, commentaire?: string) =>
    api.put<ProjectIdea>(`/project-ideas/${id}/status`, { nouveau_statut, commentaire }),

  convert: (id: number) =>
    api.post<{ message: string; project: { id: number; titre: string }; idea: ProjectIdea }>(
      `/project-ideas/${id}/convert`
    ),

  // Onglet 6 : Financements envisagés
  financements: {
    list:   (ideaId: number) => api.get<ProjectIdeaFinancement[]>(`/project-ideas/${ideaId}/financements`),
    create: (ideaId: number, data: object) => api.post<ProjectIdeaFinancement>(`/project-ideas/${ideaId}/financements`, data),
    update: (id: number, data: object) => api.put<ProjectIdeaFinancement>(`/project-idea-financements/${id}`, data),
    delete: (id: number) => api.delete(`/project-idea-financements/${id}`),
  },

  // Onglet 7 : Documents
  documents: {
    list:   (ideaId: number) => api.get<ProjectIdeaDocument[]>(`/project-ideas/${ideaId}/documents`),
    create: (ideaId: number, formData: FormData) =>
      api.post<ProjectIdeaDocument>(`/project-ideas/${ideaId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    delete: (id: number) => api.delete(`/project-idea-documents/${id}`),
    download: (id: number, filename?: string) => {
      const token   = localStorage.getItem('gcf_token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      fetch(`${baseUrl}/project-idea-documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (!res.ok) throw new Error('Erreur téléchargement');
          return res.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href = url; a.download = filename ?? `document_${id}`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => alert('Impossible de télécharger le fichier.'));
    },
  },
};

export const projectIdeaDashboardApi = {
  index: () => api.get<ProjectIdeaDashboard>('/project-ideas/dashboard'),
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE PARTIES PRENANTES (Stakeholders)
// ═══════════════════════════════════════════════════════════════════════════

export const stakeholderCategoryApi = {
  list:   () => api.get<StakeholderCategory[]>('/stakeholder-categories'),
  create: (designation: string) => api.post<StakeholderCategory>('/stakeholder-categories', { designation }),
};

export const stakeholderRoleApi = {
  list:   () => api.get<StakeholderRole[]>('/stakeholder-roles'),
  create: (designation: string) => api.post<StakeholderRole>('/stakeholder-roles', { designation }),
};

export const stakeholderContributionTypeApi = {
  list:   () => api.get<StakeholderContributionType[]>('/stakeholder-contribution-types'),
  create: (designation: string) => api.post<StakeholderContributionType>('/stakeholder-contribution-types', { designation }),
};

export interface StakeholderListParams {
  search?: string;
  categorie_id?: number;
  role_id?: number;
  statut?: string;
  per_page?: number;
  page?: number;
}

export const stakeholderApi = {
  list: (params?: StakeholderListParams) =>
    api.get<PaginatedResponse<Stakeholder>>('/stakeholders', { params }),
  exportData: (params?: StakeholderListParams) =>
    api.get<{ data: Stakeholder[] }>('/stakeholders/export-data', { params }),
  show:   (id: number) => api.get<Stakeholder>(`/stakeholders/${id}`),
  create: (data: object) => api.post<Stakeholder>('/stakeholders', data),
  update: (id: number, data: object) => api.put<Stakeholder>(`/stakeholders/${id}`, data),
  delete: (id: number) => api.delete(`/stakeholders/${id}`),

  documents: {
    list:   (stakeholderId: number) => api.get<StakeholderDocument[]>(`/stakeholders/${stakeholderId}/documents`),
    create: (stakeholderId: number, formData: FormData) =>
      api.post<StakeholderDocument>(`/stakeholders/${stakeholderId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    delete: (id: number) => api.delete(`/stakeholder-documents/${id}`),
    download: (id: number, filename?: string) => {
      const token   = localStorage.getItem('gcf_token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      fetch(`${baseUrl}/stakeholder-documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (!res.ok) throw new Error('Erreur téléchargement');
          return res.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href = url; a.download = filename ?? `document_${id}`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => alert('Impossible de télécharger le fichier.'));
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PERSPECTIVES DES PROJETS (Homepage + gestion depuis la fiche projet)
// ═══════════════════════════════════════════════════════════════════════════

export const perspectiveTypeApi = {
  list:   () => api.get<PerspectiveType[]>('/perspective-types'),
  publicList: () => api.get<PerspectiveType[]>('/public/perspective-types'),
  create: (designation: string) => api.post<PerspectiveType>('/perspective-types', { designation }),
};

export const projectPerspectiveApi = {
  list:   (projectId: number) => api.get<ProjectPerspective[]>(`/projects/${projectId}/perspectives`),
  create: (projectId: number, data: object) => api.post<ProjectPerspective>(`/projects/${projectId}/perspectives`, data),
  update: (id: number, data: object) => api.put<ProjectPerspective>(`/project-perspectives/${id}`, data),
  delete: (id: number) => api.delete(`/project-perspectives/${id}`),
  /** Toutes les perspectives (projets publiés uniquement), pour la page publique dédiée. */
  publicList: (params?: { type_id?: number; per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<ProjectPerspective>>('/public/perspectives', { params }),
};