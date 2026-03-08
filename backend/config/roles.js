const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  COORDINATOR: 'coordinator',
  PROJECT_MANAGER: 'projectManager',
  TEAM_MEMBER: 'teamMember',
  CLIENT: 'client',
};

// Coordinatrice : coordination opérationnelle globale entre équipes, chefs de projet, clients et direction.
// Responsabilités : pilotage multi-projets, attribution/supervision des tâches, équilibrage charge, suivi
// avancement, respect deadlines/jalons, communication interne/externe, anticipation risques/retards,
// arbitrage des priorités, reporting direction. Fonctionnalités : dashboard global (projets actifs/en retard/
// proches deadline, charge globale, taux occupation ressources, temps estimé vs consommé), projets (création,
// configuration, priorités, budgets, délais, statuts, archivage), ressources humaines (affectation/réaffectation),
// planification agile (sprints, milestones, backlog, Gantt global), suivi temps, livrables, communication, reporting.
// Permissions : tous les projets ✅, création projet ✅, statut projet ✅, affectation équipes ✅, gestion tâches ✅ ;
// pas facturation ❌, pas gestion rôles système ❌, pas configuration plateforme ❌.

// Chef de Projet : pilotage opérationnel, planification/exécution/livraison des projets (délais, budget, qualité).
// Responsabilités : planification tâches et ressources, coordination équipe, suivi avancement, gestion priorités
// et urgences, respect deadlines, contrôle qualité livrables, communication coordinatrice/direction, remontée
// risques et blocages, validation tâches terminées. Fonctionnalités : dashboard (KPIs projets actifs/en retard/
// terminés, % avancement, charge équipe, temps estimé vs consommé ; widgets : projets assignés, tâches urgentes,
// derniers commentaires, notifications, prochaines deadlines), gestion projets (voir/modifier ses projets,
// budget/dates/priorités, statuts Prospection→Archivé), tâches (création, sous-tâches, checklists, assignation,
// statuts À faire/En cours/Review/Terminé, % progression, temps), Kanban, Gantt, calendrier, équipe (membres,
// charge, performance), collaboration (commentaires, documents), livrables (upload, versioning, validation),
// time tracking, rapports (avancement, performance, export). Permissions : projets assignés uniquement ✅,
// création tâches et assignation équipe ✅, modifier budget ⚠️ limité ; pas tous les projets ❌, pas facturation ❌,
// pas dashboard financier ❌.

// Membre d'Équipe : exécuter les tâches assignées, livrables, mise à jour statuts, collaboration,
// commentaires, temps passé, Kanban (lecture + statut), calendrier, Gantt (lecture). Accès aux projets
// dont il fait partie (team) ; lecture/écriture sur ses tâches, lecture des autres tâches du projet ;
// pas de suppression projet, pas de budget, pas de facturation, pas de gestion utilisateurs.
// Dashboard : mes tâches en cours, en retard, projets assignés, temps travaillé, notifications.

// Client : consulter l'avancement de ses projets, valider/refuser livrables, fournir ressources,
// échanger avec l'équipe, respecter délais de validation. Portail : accès sécurisé, projets actifs +
// avancement (%), historique terminés, livrables (télécharger, versions, valider/demander modification,
// commentaires), messagerie avec chef de projet, commentaires sur livrables, notifications.
// Facturation : consultation/validation devis, consultation factures, téléchargement PDF, suivi paiements.
// Permissions : lecture seule sur ses projets, commentaires autorisés, validation livrables autorisée ;
// pas d'accès aux tâches internes ni aux autres clients. Dashboard : projets en cours, livrables récents,
// factures en attente, notifications.

const PERMISSIONS = {
  // Gestion des utilisateurs
  CREATE_USER: [ROLES.ADMIN],
  UPDATE_USER: [ROLES.ADMIN],
  DELETE_USER: [ROLES.ADMIN],
  MANAGE_ROLES: [ROLES.ADMIN],
  VIEW_USERS: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],

  // Gestion des clients
  CREATE_CLIENT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR],
  UPDATE_CLIENT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR],
  DELETE_CLIENT: [ROLES.ADMIN, ROLES.DIRECTOR],
  VIEW_CLIENT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  VIEW_CLIENT_DETAILS: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],

  // Gestion des projets
  CREATE_PROJECT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  UPDATE_PROJECT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  DELETE_PROJECT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  VIEW_PROJECT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER, ROLES.CLIENT],
  VALIDATE_PROJECT: [ROLES.ADMIN, ROLES.DIRECTOR],
  ALLOCATE_RESOURCES: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR],

  // Gestion des tâches
  CREATE_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  UPDATE_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  DELETE_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  VIEW_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER, ROLES.CLIENT],
  ASSIGN_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],

  // Gestion des devis
  CREATE_QUOTE: [ROLES.ADMIN, ROLES.DIRECTOR],
  UPDATE_QUOTE: [ROLES.ADMIN, ROLES.DIRECTOR],
  DELETE_QUOTE: [ROLES.ADMIN],
  VIEW_QUOTE: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.CLIENT],
  CONVERT_QUOTE: [ROLES.ADMIN, ROLES.DIRECTOR],
  VALIDATE_QUOTE: [ROLES.ADMIN, ROLES.DIRECTOR],
  CLIENT_ACCEPT_REFUSE_QUOTE: [ROLES.CLIENT],

  // Gestion des factures (Chef de Projet : pas d'accès facturation)
  CREATE_INVOICE: [ROLES.ADMIN, ROLES.DIRECTOR],
  UPDATE_INVOICE: [ROLES.ADMIN, ROLES.DIRECTOR],
  DELETE_INVOICE: [ROLES.ADMIN],
  VIEW_INVOICE: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.CLIENT],
  VALIDATE_INVOICE: [ROLES.ADMIN, ROLES.DIRECTOR],
  EXPORT_ACCOUNTING: [ROLES.ADMIN, ROLES.DIRECTOR],

  // Rapports et tableaux de bord (Coordinatrice : rapports d'avancement)
  VIEW_EXECUTIVE_DASHBOARD: [ROLES.DIRECTOR],
  VIEW_ADMIN_DASHBOARD: [ROLES.ADMIN],
  VIEW_COORDINATOR_DASHBOARD: [ROLES.ADMIN, ROLES.COORDINATOR],
  VIEW_PROGRESS_REPORTS: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER],
  VIEW_ANALYTICS: [ROLES.ADMIN, ROLES.DIRECTOR],
  VIEW_FINANCIAL_REPORTS: [ROLES.ADMIN, ROLES.DIRECTOR],

  // Configuration et audit
  MANAGE_SYSTEM_SETTINGS: [ROLES.ADMIN],
  MANAGE_INTEGRATIONS: [ROLES.ADMIN],
  VIEW_AUDIT_LOGS: [ROLES.ADMIN],
  MANAGE_EMAIL_CONFIG: [ROLES.ADMIN],
  MANAGE_WORKFLOWS: [ROLES.ADMIN],

  // Gestion du temps et suivit
  LOG_TIME: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  VIEW_TIME_LOGS: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],

  // Communication et documents
  SHARE_DOCUMENT: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  COMMENT_ON_TASK: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINATOR, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER, ROLES.CLIENT],

  // Portail client (accès limité aux données du client connecté)
  VIEW_CLIENT_PORTAL: [ROLES.CLIENT],
  CLIENT_VALIDATE_DELIVERABLE: [ROLES.CLIENT],
};

module.exports = { ROLES, PERMISSIONS };