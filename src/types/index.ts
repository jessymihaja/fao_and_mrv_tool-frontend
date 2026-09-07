export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'gestionnaire' | 'gestionnaire_cms' | 'utilisateur';
  avatar?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface Province {
  id: number;
  nom: string;
  code: string;
}

export interface Region {
  id: number;
  designation: string;
  nom?: string;
  code?: string;
  province_id: number;
  province?: Province;
  latitude?: number;
  longitude?: number;
}

export interface District {
  id: number;
  nom: string;
  region_id: number;
  region?: Region;
}

export interface Commune {
  id: number;
  nom: string;
  district_id: number;
}

export interface Fokontany {
  id: number;
  nom: string;
  commune_id: number;
}

/**
 * Forme "référentiel" plate des régions telle que renvoyée par
 * GET /geo/regions (utilisée pour les sélecteurs géographiques) — à ne pas
 * confondre avec `Region`, la relation enrichie exposée sur `Project.region`
 * (qui utilise `designation` au lieu de `nom`). Les deux existent réellement
 * côté API ; garder cette distinction évite de réintroduire un `any` pour
 * contourner l'incompatibilité de champ.
 */
export interface GeoRegionRef {
  id: number;
  nom: string;
  province_id?: number;
}

export interface status {
  id_status: number;
  designation: string;
}

export interface classification {
  id_classification: number;
  designation: string;
}

export interface domaine_intervention {
  id_domaine_intervention: number;
  designation: string;
}

export interface indicateur_referentiel {
  id: number;
  dimension: CategorieIndicateur;
  nom: string;
  unite: string;
  frequence?: string;
}

export interface entite_accreditee {
  id_entite_accreditee: number;
  designation: string;
  sigle: string;
}

export type ProjectClassification =
  | 'Readiness'
  | 'SAP (Simplified Approval Process)'
  | 'FP (Funding Proposal)';

export type SecteurClimatique =
  | 'adaptation'
  | 'attenuation'
  | 'resilience'
  | 'biodiversite'
  | 'eau'
  | 'foret'
  | 'energie'
  | 'transport'
  | 'agriculture';

export type Devise = 'AR' | 'USD' | 'EUR';


// Carte publique : un point = une région (et non plus un projet), avec la
// liste de tous ses projets publiés + leur statut.
// Champs classifications / entites_accreditees / domaines_intervention :
// libellés à plat (string[]), utilisés par la recherche globale partagée
// (voir utils/projectSearch.ts) — pas besoin des objets complets ici.
export interface RegionMapProject {
  id: number;
  titre: string;
  statut: string | null;
  id_projet?: string;
  classifications?: string[];
  entites_accreditees?: string[];
  domaines_intervention?: string[];
}
export interface RegionMapPoint {
  region_id: number;
  region: string;
  latitude: number;
  longitude: number;
  projects: RegionMapProject[];
}

// Zone (polygone) d'intervention officielle d'un projet, indépendante du
// regroupement par région ci-dessus.
export interface ProjectZoneMapPoint {
  id: number;
  titre: string;
  statut: string | null;
  id_projet?: string;
  classifications?: string[];
  entites_accreditees?: string[];
  domaines_intervention?: string[];
  zone_points: { latitude: number; longitude: number }[];
}

// Une zone géographique (région/district/commune) associée à un projet
// publié, telle que renvoyée par GET /public/projects/map — un marqueur
// par association projet ↔ zone, distinct de ProjectZoneMapPoint
// (polygone dessiné à la main). Voir aussi GeographicZone (admin).
export interface ProjectGeographicZoneMapPoint {
  id: number;              // id de l'association (project_geographic_zones.id)
  project_id: number;
  titre: string;
  statut: string | null;
  id_projet?: string;
  classifications?: string[];
  entites_accreditees?: string[];
  domaines_intervention?: string[];
  zone_type: 'region' | 'district' | 'commune';
  zone_id: number;
  name: string;
  region_name: string | null;
  district_name: string | null;
  commune_name: string | null;
  latitude: number | null;
  longitude: number | null;
  is_approximate_location?: boolean;
}

// Forme réelle de la réponse GET /public/projects/map
export interface MapDataResponse {
  regions: RegionMapPoint[];
  project_zones: ProjectZoneMapPoint[];
  project_geographic_zones: ProjectGeographicZoneMapPoint[];
  total_projects_on_map?: number;
}

export interface Project {
  id: number;               // clé primaire auto-increment (utilisée pour les routes/API)
  id_projet: string;        // identifiant lisible ex: GCF-2026-001 (affichage uniquement)
  titre: string;
  status_id: number;
  classification_ids?: number[];
  entite_accreditee_ids?: number[];
  description?: string;
  domaine_intervention_ids?: number[];
  date_debut?: string;
  date_fin?: string;
  latitude?: number;
  longitude?: number;
  province_id?: number;
  region_id?: number;
  district_id?: number;
  commune_id?: number;
  fokontany_id?: number;
  zone_description?: string;
  geo_address?: string | null;
  zone?: string | null;
  objectifs?: string;
  impact?: string;
  problematique_climatique?: string;
  is_published: boolean;
  nombre_beneficiaires?: number | null;
  wizard_step?: number;
  province?: Province;
  region?: Region;
  district?: District;
  commune?: Commune;
  fokontany?: Fokontany;
  financements?: Financement[];
  documents?: Document[];
  financements_count?: number;
  documents_count?: number;
  created_at?: string;
  updated_at?: string;
  statut?: status;
  classifications?: classification[];
  domaines_intervention?: domaine_intervention[];
  entites_accreditees?: entite_accreditee[];
  budget_total?: number;
  // Zone d'intervention (polygone) du projet — même forme que
  // ProjectZoneMapPoint.zone_points, renvoyée par l'API sur le projet
  // individuel (GET/PUT /projects/:id et /public/projects/:id).
  zone_points?: { latitude: number; longitude: number }[];
  // Zones géographiques multiples (région/district/commune) — distinct de
  // zone_points ci-dessus (polygone dessiné à la main). Voir GeographicZone.
  geographic_zones?: GeographicZone[];
}

/**
 * Une zone (région, district ou commune) telle que renvoyée par la
 * recherche (GET /geo/zones/search) — avant association à un projet, donc
 * sans identifiant d'association.
 */
export interface ZoneCandidate {
  zone_type: 'region' | 'district' | 'commune';
  zone_id: number;
  name: string;
  region_name: string | null;
  district_name: string | null;
  commune_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Une zone associée à un projet — telle que renvoyée par
 * GET /projects/:id/geographical-zones et incluse dans
 * Project.geographic_zones. `id` est l'identifiant de l'association
 * (project_geographic_zones.id), à utiliser pour la suppression —
 * `zone_id` est l'identifiant de la région/district/commune elle-même.
 */
export interface GeographicZone extends ZoneCandidate {
  id: number;
  is_approximate_location?: boolean;
}

export type TypeFinancement  = 'gcf' | 'cofinancement_public' | 'cofinancement_prive';
export type ModeContribution = 'numeraire' | 'nature';
export type MethodeEvaluation = 'valeur_marchande' | 'expertise_independante' | 'valeur_comptable' | 'autre';

export interface contribution_categorie {
  id: number;
  designation: string;
}

export interface organisme_contributeur {
  id: number;
  designation: string;
}

export interface FinancementContributionLine {
  id?: number;
  organisme_contributeur_id: number | '';
  organisme_contributeur?: organisme_contributeur | null;
  mode_contribution: ModeContribution;
  montant: number | '';
  devise: Devise;
  // Champ mort : le backend ne renvoie plus 'montant_mga' depuis la purge
  // évoquée dans l'historique du projet ; laissé optionnel pour ne pas
  // casser un appelant existant, non lu ni écrit ailleurs dans le code.
  montant_mga?: number | '';
  date_contribution: string;
  categorie_contribution_id?: number | '';
  categorie_contribution?: contribution_categorie | null;
  description?: string;
}

export interface Financement {
  id: number;
  project_id: number;
  type_financement: TypeFinancement;
  mode_contribution: ModeContribution;
  source_financement: string;
  budget_approuve: number;
  devise: Devise;
  montant_mga: number;
  date_approbation: string;
  description?: string | null;
  categorie_contribution_id?: number | null;
  categorie_contribution?: contribution_categorie | null;
  contributions?: FinancementContributionLine[];
  project?: Project;
  documents?: Document[];
  created_at?: string;
}

export type DocumentType = 'rapport' | 'contrat' | 'accord' | 'plan' | 'etude' | 'photo' | 'autre';

export interface Document {
  id: number;
  titre: string;
  type: DocumentType;
  fichier: string;
  fichier_original?: string;
  taille?: number;
  mime_type?: string;
  project_id: number;
  composante_id?: number | null;
  financement_id?: number;
  description?: string;
  uploaded_by?: number;
  project?: Project;
  financement?: Financement;
  created_at?: string;
}

export interface Depense {
  id: number;
  project_id: number;
  financement_id?: number | null;
  // Hiérarchie obligatoire Projet → Composante → Activité → Dépense.
  composante_id: number;
  activite_id: number;
  designation: string;
  note: string;
  montant: number;
  devise?: string;
  date: string;
  // Période de suivi semestriel — indépendante de `date`.
  annee: number;
  semestre: 'S1' | 'S2';
  beneficiaire: string;
  categorie?: string;
  reference?: string;
  justification_path: string;
  justification_name: string;
  montant_audite?: number | null;
  organisme_audit?: string | null;
  date_audit?: string | null;
  rapport_audit_path?: string | null;
  rapport_audit_name?: string | null;
  observation_audit?: string | null;
  statut: 'depense' | 'audite';
  created_by?: number;
  project?: Project;
  financement?: Financement;
  composante?: { id: number; nom: string; budget?: number | string | null; devise?: Devise | null } | null;
  activite?: { id: number; nom: string; budget?: number | string | null; devise?: Devise | null } | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Suivi des dépenses par Composante → Activité (GET /projects/{id}/depenses-summary) ───
// Correction multidevises (§9-10) : un même projet/composante/activité peut
// avoir des dépenses dans plusieurs devises (AR, USD, EUR) — tous les
// montants agrégés sont donc des ventilations { devise => montant }, jamais
// un total unique qui les mélangerait. `solde`/`taux_execution` ne sont
// renseignés que pour la devise du budget concerné (voir `devise` sur la
// composante/activité) : comparer un budget dans une devise à une dépense
// dans une autre n'a pas de sens sans conversion explicite.
export type MontantsParDevise = Partial<Record<Devise, number>>;

export interface DepensePeriodeTotal {
  annee: number;
  semestre: 'S1' | 'S2';
  totaux: MontantsParDevise;
}

export interface DepenseActiviteSummary {
  id: number;
  nom: string;
  budget: number | null;
  devise: Devise | null;
  totaux_depense: MontantsParDevise;
  solde: number | null;
  taux_execution: number | null;
  par_periode: DepensePeriodeTotal[];
}

export interface DepenseComposanteSummary {
  id: number;
  nom: string;
  budget: number | null;
  devise: Devise | null;
  totaux_depense: MontantsParDevise;
  solde: number | null;
  taux_execution: number | null;
  activites: DepenseActiviteSummary[];
}

export interface DepenseProjectSummary {
  composantes: DepenseComposanteSummary[];
  non_ventilees: { count: number; totaux_depense: MontantsParDevise };
  project: {
    budget: MontantsParDevise;
    totaux_depense: MontantsParDevise;
    solde: MontantsParDevise;
    taux_execution: Partial<Record<Devise, number | null>>;
  };
  par_periode: DepensePeriodeTotal[];
  par_annee: { annee: number; totaux: MontantsParDevise }[];
}

// ── Stats étendues ─────────────────────────────────────────────────────────────
// Correction multidevises (§11-14) : ces totaux mélangeaient auparavant AR,
// USD et EUR dans un seul nombre (ex. "500 USD + 100 AR" affiché "600" et
// étiqueté "Ar"). Ils sont désormais ventilés par devise.
export interface AutresFinancementsStats {
  cofinancement_public: MontantsParDevise;
  cofinancement_prive: MontantsParDevise;
  partenaires_techniques_financiers: MontantsParDevise;
  contributions_nature: MontantsParDevise;
  contributions_numeraire: MontantsParDevise;
  budget_total_hors_gcf: MontantsParDevise;
  nombre_bailleurs_partenaires: number;
}

export interface GlobalStats {
  // Projets
  total_projets:      number;
  projets_actifs:     number;   // "En cours"
  projets_termines:   number;   // "Clôturé"
  projets_planifies:  number;   // "Concept Note"
  projets_suspendus:  number;   // "Funding Proposal"

  // Budget (financements) — ventilé par devise, ex. { AR: 100, USD: 700 }.
  // Remplace les anciens champs budget_usd/budget_eur/budget_ar, qui
  // dupliquaient la même donnée que budget_total mélangeait par erreur.
  budget_total:        MontantsParDevise;

  // Colonne 1 (GCF) — ajouts
  nombre_beneficiaires?: number;
  nombre_regions?:        number;

  // Colonne 2 : Autres financements (hors GCF)
  autres_financements?: AutresFinancementsStats;

  // Dernière mise à jour (calculée dynamiquement, MAX(updated_at))
  derniere_mise_a_jour?: string | null;

  // Autres compteurs
  total_financements?:  number;
  total_documents?:     number;
  total_users?:         number;
  total_depenses?:      MontantsParDevise;
  total_engagements?:   MontantsParDevise;
  total_decaissements?: MontantsParDevise;
}

export type StatutPerspective = 'a_l_etude' | 'planifie' | 'en_cours' | 'realise';

export const STATUT_PERSPECTIVE_LABELS: Record<StatutPerspective, string> = {
  a_l_etude: "À l'étude",
  planifie: 'Planifié',
  en_cours: 'En cours',
  realise: 'Réalisé',
};

/** Référentiel extensible (ajout en ligne "+"), remplace l'ancien enum fixe. */
export interface PerspectiveType {
  id: number;
  designation: string;
}

export interface ProjectPerspective {
  id: number;
  project_id: number;
  project?: { id: number; titre: string; is_published?: boolean };
  type_id: number;
  type?: PerspectiveType | null;
  titre: string;
  description: string | null;
  zone_extension_envisagee: string | null;
  objectif_moyen_terme: string | null;
  objectif_long_terme: string | null;
  impact_futur_attendu: string | null;
  statut: StatutPerspective;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPerspectiveFormData {
  type_id: number | '';
  titre: string;
  description: string;
  zone_extension_envisagee: string;
  objectif_moyen_terme: string;
  objectif_long_terme: string;
  impact_futur_attendu: string;
  statut: StatutPerspective;
}

export interface PerspectivesHomepageStats {
  projets_en_preparation: number;
  projets_recherche_financement: number;
  projets_extension_envisagee: number;
  projets_perennisation_envisagee: number;
  total_perspectives: number;
  apercu: {
    id: number;
    titre: string;
    type_id: number;
    type: string | null;
    impact_futur_attendu: string | null;
    projet: string | null;
    project_id: number;
  }[];
}

export interface Faq {
  id: number;
  question: string;
  reponse: string;
  categorie?: string;
  ordre: number;
  is_active: boolean;
}

export interface Partner {
  id: number;
  nom: string;
  logo?: string;
  url?: string;
  description?: string;
  abbr?: string;
  color?: string;
  ordre: number;
  is_active: boolean;
}

export interface Contact {
  id: number;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Slider {
  id: number;
  titre: string;
  sous_titre?: string;
  image?: string;
  cta_text?: string;
  cta_url?: string;
  ordre: number;
  is_active: boolean;
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

/**
 * Forme du rapport détaillé renvoyé par GET /rapports/:id (résumé + détail
 * du projet). Champs limités à ceux effectivement consommés par
 * RapportPage.tsx — à faire évoluer si d'autres champs sont utilisés.
 * NB : `region.nom` reflète l'usage existant du code, à confirmer côté
 * backend (voir remarque d'audit : Project.region utilise `designation`
 * ailleurs dans l'app, alors que ce endpoint semble utiliser `nom`).
 */
export interface Setting {
  key: string;
  value: string;
  type?: string;
}

export interface RapportDetail {
  generated_at?: string;
  generated_by?: string;
  resume?: {
    nb_financements?: number;
    nb_documents?: number;
    budget_total_usd?: number;
    budget_total_eur?: number;
  };
  projet?: {
    titre?: string;
    statut?: string;
    phase?: string;
    secteur_climatique?: string;
    region?: { id: number; nom: string } | null;
    date_debut?: string | null;
    date_fin?: string | null;
    description?: string;
    financements?: {
      id: number;
      source: string;
      type: string;
      montant: number;
      devise: string;
      date?: string | null;
    }[];
  };
}

export interface ChatbotSettings {
  id?: number;
  is_active: boolean | 0 | 1;
  welcome_message: string | null;
}

export interface ChatbotKnowledgeEntry {
  id: number;
  category: string;
  keywords: string;
  response: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatbotKnowledgeFormData {
  category: string;
  keywords: string;
  response: string;
  is_active: boolean;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  module: string;
  description: string;
  project_id?: number;
  created_at: string;
  user?: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

/**
 * Forme "API Resource Collection" de Laravel : { data, links, meta }.
 * Contrairement à `PaginatedResponse<T>` (pagination "à plat"), certains
 * endpoints — ex. GET /financements — renvoient la pagination imbriquée
 * sous `meta`. Les deux formats existent réellement côté API ; utiliser
 * le bon type au bon endroit évite un `any` de contournement.
 */
export interface LaravelResourceCollection<T> {
  data: T[];
  links?: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}



export type CategorieIndicateur =
  | 'financier'
  | 'physique'
  | 'adaptation'
  | 'attenuation';

export type NiveauPerformance = 'Faible' | 'Moyen' | 'Bon' | 'Excellent';

export interface Indicateur {
  id: number;
  project_id: number;
  composante_id?: number | null;
  activite_id?: number | null;
  categorie: CategorieIndicateur;
  nom: string;
  unite: string;
  // Laravel caste ces colonnes en decimal:4 → sérialisées en string dans le JSON
  // (ex: "45.0000"), pas en number natif. Toujours passer par Number(...)
  // avant tout calcul ou appel à .toFixed() côté frontend.
  valeur_cible: number | string;
  valeur_realisee: number | string;
  date_reference: string;
  commentaire?: string;
  taux_atteinte: number | string;
  ecart: number | string; 
  niveau_performance: NiveauPerformance;
  justificatifs?: JustificatifIndicateur[];
  project?: {
    id: number;
    titre: string;
    secteur_climatique?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface JustificatifIndicateur {
  id: number;
  indicateur_id: number;
  fichier: string;
  nom_original: string;
  taille?: number;
  created_at?: string;
}

export interface RapportNational {
  id: number;
  titre: string;
  annee?: number;
  region_id?: number;
  secteur_climatique?: string;
  accredited_entity?: string;
  source_financement?: string;
  statut_projet?: string;
  statut: 'brouillon' | 'genere' | 'publie';
  contenu?: RapportContenu;
  created_by?: number;
  created_at?: string;
}

export interface RapportContenu {
  resume: RapportResume;
  financier: RapportFinancier;
  physique: RapportPhysique;
  climatique: RapportClimatique;
}

export interface RapportResume {
  total_projets: number;
  // Correction multidevises (§7-11-14) : un financement peut être en AR,
  // USD ou EUR — ces totaux sont désormais ventilés par devise, jamais un
  // nombre unique étiqueté "Ar".
  budget_total_approuve: MontantsParDevise;
  budget_engage: MontantsParDevise;
  budget_decaisse: MontantsParDevise;
  // Taux d'exécution par devise (décaissé / approuvé dans la même devise).
  taux_execution_global: Partial<Record<Devise, number | null>>;
}

export interface RapportFinancier {
  par_secteur: { secteur: string; totaux: MontantsParDevise }[];
  par_region: { region: string; totaux: MontantsParDevise }[];
  // Le classement est basé sur le plus gros montant, toutes devises
  // confondues (aucune conversion n'est faite pour établir ce rang — voir
  // RapportNationalController::buildContenu()).
  top_projets: { titre: string; totaux: MontantsParDevise; taux: number }[];
}

export interface RapportPhysique {
  total_beneficiaires: number;
  infrastructures_realisees: number;
  surfaces_restaurees: number;
  formations_realisees: number;
}

export interface RapportClimatique {
  adaptation: {
    population_resiliente: number;
    reduction_vulnerabilite: number;
    systemes_alerte: number;
  };
  attenuation: {
    co2_evite: number;
    energie_renouvelable: number;
    reduction_energetique: number;
  };
}

export interface FiltresIndicateurs {
  annee?: number;
  region_id?: number;
  project_id?: number;
  secteur_climatique?: string;
  accredited_entity?: string;
  source_financement?: string;
  categorie?: CategorieIndicateur;
}
// ─── COMPOSANTES / ACTIVITÉS (module Wizard Projet) ────────────
export type StatutComposante = 'Planifiee' | 'En cours' | 'Terminee' | 'Suspendue';

export interface Composante {
  id: number;
  project_id: number;
  code?: string;
  nom: string;
  objectif_specifique?: string;
  description?: string;
  responsable?: string;
  budget?: number;
  // Devise du budget (§9-10) — nécessaire pour comparer les dépenses au
  // budget dans la même devise. Nullable : composantes créées avant cette
  // colonne, ou sans budget renseigné.
  devise?: Devise | null;
  date_debut?: string;
  date_fin?: string;
  statut: StatutComposante;
  ordre?: number;
  activites?: Activite[];
  indicateurs?: Indicateur[];
  documents?: Document[];
  activites_count?: number;
  indicateurs_count?: number;
  documents_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivitePieceJointe {
  id: number;
  activite_id: number;
  fichier: string;
  fichier_original?: string;
  taille?: number;
  mime_type?: string;
  created_at?: string;
}

export interface Activite {
  id: number;
  project_id?: number | null;
  composante_id?: number | null;
  code?: string;
  nom: string;
  description?: string;
  responsable?: string;
  date_debut?: string;
  date_fin?: string;
  budget?: number;
  devise?: Devise | null;
  statut: StatutComposante;
  pourcentage_avancement: number;
  observations?: string;
  pieces_jointes?: ActivitePieceJointe[];
  indicateurs?: Indicateur[];
  indicateurs_count?: number;
  created_at?: string;
  updated_at?: string;
}

// ─── RÉSULTATS DU PROJET (cadre logique GCF) ───────────────────
// Type de résultat : référentiel extensible (comme Classification,
// Secteur...) — l'utilisateur peut ajouter une valeur manquante en ligne
// via SelectAvecAjout, plutôt qu'un enum fixe.
export interface ResultType {
  id: number;
  designation: string;
}
export type StatutResultat = 'prevu' | 'en_cours' | 'atteint' | 'partiellement_atteint' | 'non_atteint';

export interface ResultPieceJointe {
  id: number;
  result_id: number;
  fichier: string;
  nom_original: string;
  taille?: number;
  created_at?: string;
}

/**
 * Résultat du projet. Volontairement SANS valeur_cible/valeur_realisee/unite
 * propres : lorsque `indicateur_id` est renseigné, ces informations sont
 * dérivées côté backend de l'indicateur associé (seule source de vérité,
 * voir Result::getValeurCibleAttribute() etc.) et exposées ici en lecture
 * seule. Ne jamais les envoyer dans le payload de création/modification.
 */
export interface Result {
  id: number;
  project_id: number;
  composante_id?: number | null;
  activite_id?: number | null;
  indicateur_id?: number | null;
  result_type_id: number;
  // Laravel sérialise resultType() → "result_type" en JSON (snake_case).
  result_type?: ResultType | null;
  titre: string;
  description?: string;
  reference_year: number;
  target_year: number;
  statut: StatutResultat;
  valeur_reference?: number | string | null;
  source_verification?: string;
  methode_collecte?: string;
  observations?: string;
  // Dérivés en lecture seule depuis l'indicateur associé (appends backend) —
  // number | string car Laravel caste certains champs decimal:N en string.
  valeur_cible?: number | string | null;
  valeur_realisee?: number | string | null;
  unite?: string | null;
  annee_realisation?: string | null;
  pourcentage_atteinte?: number | null;
  indicateur?: Indicateur | null;
  composante?: { id: number; nom: string } | null;
  activite?: { id: number; nom: string } | null;
  pieces_jointes?: ResultPieceJointe[];
  created_at?: string;
  updated_at?: string;
}

// ─── BÉNÉFICIAIRES DU PROJET ────────────────────────────────────
// Type et catégorie de bénéficiaire : référentiels extensibles (comme
// Type de résultat ci-dessus) — ajout en ligne possible, plutôt que des
// enums fixes.
export interface BeneficiaryType {
  id: number;
  designation: string;
}
export interface BeneficiaryCategory {
  id: number;
  designation: string;
}

export interface Beneficiary {
  id: number;
  project_id: number;
  beneficiary_type_id: number;
  beneficiary_category_id: number;
  // Laravel sérialise les relations en snake_case (beneficiaryType() →
  // "beneficiary_type" dans le JSON), d'où ces noms de clés.
  beneficiary_type?: BeneficiaryType | null;
  beneficiary_category?: BeneficiaryCategory | null;
  description?: string;
  region_id?: number | null;
  district_id?: number | null;
  commune_id?: number | null;
  fokontany_id?: number | null;
  region?: { id: number; nom: string } | null;
  district?: { id: number; nom: string } | null;
  commune?: { id: number; nom: string } | null;
  fokontany?: { id: number; nom: string } | null;
  planned_count: number;
  achieved_count: number;
  women_count?: number | null;
  men_count?: number | null;
  youth_count?: number | null;
  vulnerable_count?: number | null;
  reference_year: number;
  monitoring_year?: number | null;
  // Calculé automatiquement côté backend — jamais saisi manuellement.
  taux_atteinte: number | string;
  source?: string;
  observations?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BeneficiaryStats {
  total_prevu: number;
  total_atteint: number;
  femmes: number;
  hommes: number;
  jeunes: number;
  vulnerables: number;
  taux_atteinte: number;
}

export interface BeneficiaryListResponse {
  data: Beneficiary[];
  stats: BeneficiaryStats;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE BUDGETS — cycle de vie des budgets climatiques
// Annoncé → Mobilisé → Engagé → Approuvé → Programmé → Décaissé → Audité/Dépensé
// ═══════════════════════════════════════════════════════════════════════════

export type BudgetStageKey = 'pledge' | 'mobilise' | 'engage' | 'approuve' | 'programme' | 'decaisse' | 'audite';

export type TypeMobilisation = 'public' | 'prive' | 'cofinancement' | 'effet_levier';

/** Champs communs à toutes les étapes du cycle budgétaire */
interface BudgetStageBase {
  id: number;
  financement_id: number;
  composante_id?: number | null;
  composante?: Composante | null;
  activite_id?: number | null;
  activite?: Activite | null;
  devise: Devise;
  montant_mga: number;
  justificatif_path?: string | null;
  justificatif_name?: string | null;
}

// ── Étape 1 : Annoncé (Pledge) ──────────────────────────────────────────────
export interface BudgetPledge extends BudgetStageBase {
  date_annonce: string;
  bailleur_id?: number | null;
  bailleur?: organisme_contributeur | null;
  montant: number;
  description?: string | null;
  source?: string | null;
  created_by?: number | null;
}

export interface BudgetPledgeFormData {
  date_annonce: string;
  bailleur_id: number | '';
  montant: number | '';
  devise: Devise;
  montant_mga: number | '';
  description?: string;
  source?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 2 : Mobilisé (repose sur FinancementContribution) ────────────────
export interface BudgetMobilisation extends BudgetStageBase {
  organisme_contributeur_id: number;
  organisme_contributeur?: organisme_contributeur | null;
  mode_contribution: ModeContribution;
  type_mobilisation?: TypeMobilisation | null;
  montant: number;
  date_contribution: string;
  categorie_contribution_id?: number | null;
  categorie_contribution?: contribution_categorie | null;
  description?: string | null;
  commentaire?: string | null;
}

export interface BudgetMobilisationFormData {
  organisme_contributeur_id: number | '';
  mode_contribution: ModeContribution;
  type_mobilisation?: TypeMobilisation | '';
  montant: number | '';
  devise: Devise;
  montant_mga: number | '';
  date_contribution: string;
  categorie_contribution_id?: number | '';
  description?: string;
  commentaire?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 3 : Engagé (Engagement) ───────────────────────────────────────────
export interface BudgetEngagement extends BudgetStageBase {
  date: string;
  reference_accord?: string | null;
  bailleur_id?: number | null;
  bailleur?: organisme_contributeur | null;
  montant: number;
  description?: string | null;
}

export interface BudgetEngagementFormData {
  date: string;
  montant: number | '';
  devise: Devise;
  montant_mga: number | '';
  reference_accord?: string;
  bailleur_id?: number | '';
  description?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 4 : Approuvé (BudgetApprobation) ──────────────────────────────────
export interface BudgetApprobation extends BudgetStageBase {
  date_approbation: string;
  organisme_id?: number | null;
  organisme?: organisme_contributeur | null;
  montant_approuve: number;
  reference?: string | null;
  decision?: string | null;
  created_by?: number | null;
}

export interface BudgetApprobationFormData {
  date_approbation: string;
  organisme_id: number | '';
  montant_approuve: number | '';
  devise: Devise;
  montant_mga: number | '';
  reference?: string;
  decision?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 5 : Programmé (DecaissementPlan) ──────────────────────────────────
export type StatutProgrammation = 'prevu' | 'effectue';

export interface BudgetProgrammation extends BudgetStageBase {
  date_prevue: string;
  exercice_budgetaire?: string | null;
  annee?: number | null;
  montant_prevu: number;
  statut: StatutProgrammation;
  description?: string | null;
}

export interface BudgetProgrammationFormData {
  date_prevue: string;
  exercice_budgetaire?: string;
  annee?: number | '';
  montant_prevu: number | '';
  devise: Devise;
  montant_mga: number | '';
  statut?: StatutProgrammation;
  description?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 6 : Décaissé (Decaissement) ───────────────────────────────────────
export interface BudgetDecaissement extends BudgetStageBase {
  date: string;
  montant: number;
  reference?: string | null;
  beneficiaire?: string | null;
  commentaire?: string | null;
}

export interface BudgetDecaissementFormData {
  date: string;
  montant: number | '';
  devise: Devise;
  montant_mga: number | '';
  reference?: string;
  beneficiaire?: string;
  commentaire?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justificatif?: File | null;
}

// ── Étape 7 : Audité / Dépensé (Depense) ────────────────────────────────────
export type StatutDepense = 'depense' | 'audite';

export interface BudgetDepense extends BudgetStageBase {
  project_id: number;
  designation: string;
  note?: string | null;
  montant: number;
  date: string;
  beneficiaire: string;
  categorie?: string | null;
  reference?: string | null;
  justification_path?: string | null;
  justification_name?: string | null;
  statut: StatutDepense;
  montant_audite?: number | null;
  organisme_audit?: string | null;
  date_audit?: string | null;
  rapport_audit_path?: string | null;
  rapport_audit_name?: string | null;
  observation_audit?: string | null;
}

export interface BudgetDepenseFormData {
  project_id: number;
  financement_id: number | '';
  designation: string;
  note: string;
  montant: number | '';
  devise: Devise;
  montant_mga: number | '';
  date: string;
  beneficiaire: string;
  categorie?: string;
  reference?: string;
  composante_id?: number | '';
  activite_id?: number | '';
  justification?: File | null;
}

export interface BudgetAuditFormData {
  montant_audite: number | '';
  organisme_audit: string;
  date_audit: string;
  observation_audit?: string;
  rapport_audit?: File | null;
}

// ── Vue consolidée du cycle (BudgetCycleController) ─────────────────────────
// Correction multidevises (§7-8-11) : un item individuel (pledge, décaissement...)
// reste dans une seule devise (`devise` + `montant`), mais les totaux agrégés
// par étape ne peuvent plus être un nombre unique — ils sont ventilés par
// devise (`totaux`). Remplace les anciens champs `montant_mga`/`total_mga`
// qui laissaient croire à une conversion automatique inexistante.
export interface BudgetStageItem {
  id: number;
  date: string | null;
  montant: number;
  devise: Devise;
  label: string;
  statut: string;
  has_justificatif: boolean;
  composante_id?: number | null;
  activite_id?: number | null;
  [key: string]: unknown; // champs spécifiques à l'étape (reference, beneficiaire, montant_audite...)
}

export interface BudgetStageSummary {
  label: string;
  totaux: MontantsParDevise;
  totaux_audite?: MontantsParDevise;
  count: number;
  items: BudgetStageItem[];
}

export interface BudgetCycleRates {
  taux_mobilisation: MontantsParDevise;
  taux_engagement: MontantsParDevise;
  taux_decaissement: MontantsParDevise;
  taux_execution: MontantsParDevise;
}

export interface BudgetCascadePoint {
  stage: string;
  totaux: MontantsParDevise;
}

export interface BudgetCycleFinancementMeta {
  id: number;
  type_financement: TypeFinancement;
  source_financement: string;
  budget_approuve: number | null;
  devise: Devise;
}

export interface BudgetCycleSummary {
  financements: BudgetCycleFinancementMeta[];
  // Toutes les devises apparaissant à une étape quelconque du cycle — permet
  // au frontend de savoir combien de séries tracer sans les deviner.
  devises: Devise[];
  stages: Record<BudgetStageKey, BudgetStageSummary>;
  rates: BudgetCycleRates;
  cascade: BudgetCascadePoint[];
}


export type StatutIdee = 'brouillon' | 'soumis' | 'en_etude' | 'approuve' | 'converti';

export const STATUT_IDEE_LABELS: Record<StatutIdee, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  en_etude: 'En étude',
  approuve: 'Approuvé',
  converti: 'Converti en Projet',
};

export const WORKFLOW_IDEE: StatutIdee[] = ['brouillon', 'soumis', 'en_etude', 'approuve', 'converti'];

export interface Secteur {
  id: number;
  designation: string;
}

export type TypeFinancementIdee = 'don' | 'pret' | 'cofinancement' | 'assistance_technique';
export type StatutFinancementIdee = 'en_preparation' | 'soumis' | 'en_negociation';

export interface ProjectIdeaFinancement {
  id: number;
  organisme_contributeur_id: number | null;
  bailleur: string;
  bailleur_autre: string | null;
  montant_demande: number | null;
  devise: Devise;
  type_financement: TypeFinancementIdee;
  statut: StatutFinancementIdee;
}

export interface ProjectIdeaFinancementFormData {
  organisme_contributeur_id: number | '';
  bailleur_autre: string;
  montant_demande: number | '';
  devise: Devise;
  type_financement: TypeFinancementIdee;
  statut: StatutFinancementIdee;
}

export type ProjectIdeaDocumentType = 'concept_note' | 'etude_faisabilite' | 'budget' | 'carte' | 'images' | 'autre';

export const PROJECT_IDEA_DOCUMENT_TYPE_LABELS: Record<ProjectIdeaDocumentType, string> = {
  concept_note: 'Concept Note',
  etude_faisabilite: 'Étude de faisabilité',
  budget: 'Budget',
  carte: 'Carte',
  images: 'Images',
  autre: 'Autre',
};

export interface ProjectIdeaDocument {
  id: number;
  type: ProjectIdeaDocumentType;
  libelle: string | null;
  file_name: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
}

export interface ProjectIdeaStatusHistoryEntry {
  id: number;
  ancien_statut: StatutIdee | null;
  nouveau_statut: StatutIdee;
  commentaire: string | null;
  auteur: string | null;
  created_at: string;
}

export interface ProjectIdea {
  id: number;
  titre: string;
  lien: string | null;
  acronyme: string | null;
  description: string | null;
  contexte: string | null;
  justification: string | null;
  objectif_general: string | null;
  objectifs_specifiques: string | null;
  resultats_attendus: string | null;
  duree_prevue_mois: number | null;
  date_debut_estimee: string | null;
  date_fin_estimee: string | null;
  porteur_projet: string | null;

  latitude: number | null;
  longitude: number | null;
  province_id: number | null;
  region_id: number | null;
  district_id: number | null;
  commune_id: number | null;
  fokontany_id: number | null;
  zone_description: string | null;
  geo_address: string | null;
  zone: string | null;
  province?: { id: number; nom: string } | null;
  region?: { id: number; nom: string } | null;
  district?: { id: number; nom: string } | null;
  commune?: { id: number; nom: string } | null;
  fokontany?: { id: number; nom: string } | null;

  secteur_ids?: number[];
  secteurs?: Secteur[];

  nombre_beneficiaires: number | null;
  beneficiaires_hommes: number | null;
  beneficiaires_femmes: number | null;
  beneficiaires_jeunes: number | null;
  beneficiaires_vulnerables: number | null;

  budget_total_estime: number | null;
  devise: Devise;
  contribution_nationale: number | null;
  contribution_partenaires: number | null;
  cofinancement_prive: number | null;
  autres_financements: number | null;
  total_contributions?: number;
  pourcentage_cofinancement?: number | null;

  statut: StatutIdee;
  converted_project_id: number | null;
  converted_at: string | null;

  financements?: ProjectIdeaFinancement[];
  bailleur_cible?: string | null;
  documents?: ProjectIdeaDocument[];
  status_history?: ProjectIdeaStatusHistoryEntry[];

  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Données du formulaire de création/édition (7 onglets) — un seul objet plat. */
export interface ProjectIdeaFormData {
  titre: string;
  lien: string;
  acronyme: string;
  description: string;
  contexte: string;
  justification: string;
  objectif_general: string;
  objectifs_specifiques: string;
  resultats_attendus: string;
  duree_prevue_mois: number | '';
  date_debut_estimee: string;
  date_fin_estimee: string;
  porteur_projet: string;
  latitude?: number | null;
  longitude?: number | null;
  province_id?: number | null;
  region_id?: number | null;
  district_id?: number | null;
  commune_id?: number | null;
  fokontany_id?: number | null;
  zone_description?: string | null;
  geo_address?: string | null;
  zone?: string | null;
  secteur_ids: number[];
  nombre_beneficiaires: number | '';
  beneficiaires_hommes: number | '';
  beneficiaires_femmes: number | '';
  beneficiaires_jeunes: number | '';
  beneficiaires_vulnerables: number | '';
  budget_total_estime: number | '';
  devise: Devise;
  contribution_nationale: number | '';
  contribution_partenaires: number | '';
  cofinancement_prive: number | '';
  autres_financements: number | '';
}

export interface ProjectIdeaListItem {
  id: number;
  titre: string;
  lien: string | null;
  secteurs: Secteur[];
  porteur_projet: string | null;
  bailleur_cible: string | null;
  budget_total_estime: number | null;
  devise: Devise;
  statut: StatutIdee;
  created_at: string;
  region?: { id: number; nom: string } | null;
}

export interface ProjectIdeaDashboard {
  total: number;
  par_statut: Record<StatutIdee, number>;
  par_statut_labels: Record<StatutIdee, string>;
  budget_total_estime: number;
  budget_par_secteur: { secteur: string; montant: number }[];
  budget_par_bailleur: { bailleur: string; montant: number }[];
  repartition_region: { region: string; total: number }[];
  repartition_statut: { statut: string; total: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE PARTIES PRENANTES (Stakeholders) — Phase 1, module indépendant
// (pas encore lié aux Idées de projet ni aux Projets — voir backend)
// ═══════════════════════════════════════════════════════════════════════════

export type StatutStakeholder = 'actif' | 'en_attente' | 'suspendu' | 'termine';

export const STATUT_STAKEHOLDER_LABELS: Record<StatutStakeholder, string> = {
  actif: 'Actif',
  en_attente: 'En attente',
  suspendu: 'Suspendu',
  termine: 'Terminé',
};

export interface StakeholderCategory {
  id: number;
  designation: string;
}

export interface StakeholderRole {
  id: number;
  designation: string;
}

export interface StakeholderContributionType {
  id: number;
  designation: string;
}

export interface StakeholderDocument {
  id: number;
  libelle: string | null;
  file_name: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
}

export interface Stakeholder {
  id: number;
  nom: string;
  organisation: string | null;
  acronyme: string | null;

  categorie_id: number;
  categorie?: { id: number; designation: string };
  role_id: number | null;
  role?: { id: number; designation: string } | null;

  nom_representant: string | null;
  fonction: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;

  type_contribution_id: number | null;
  type_contribution?: { id: number; designation: string } | null;
  description_contribution: string | null;
  montant_estimatif: number | null;
  devise: Devise | null;

  date_debut: string | null;
  date_fin: string | null;
  statut: StatutStakeholder;

  documents?: StakeholderDocument[];

  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface StakeholderFormData {
  nom: string;
  organisation: string;
  acronyme: string;
  categorie_id: number | '';
  role_id: number | '';
  nom_representant: string;
  fonction: string;
  email: string;
  telephone: string;
  adresse: string;
  type_contribution_id: number | '';
  description_contribution: string;
  montant_estimatif: number | '';
  devise: Devise;
  date_debut: string;
  date_fin: string;
  statut: StatutStakeholder;
}