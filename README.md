# NOLYSS - Gestion Projets Moderne & Sécurisée

**NOLYSS** est une plateforme complète de gestion de projets, factures et clients conçue pour les agences et équipes créatives.

---

## Table des Matières

- [Vue d'Ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Stack Technologique](#stack-technologique)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Rôles & Permissions](#rôles--permissions)
- [Documentation](#documentation)
- [Sécurité](#sécurité)
- [Contribution](#contribution)

---

## 👀 Vue d'Ensemble

NOLYSS est une solution intégrée pour :
-  **Gestion de projets** avec cycles de vie (prospection → livraison → clos)
-  **Gestion de tâches** avec Kanban interactif et Gantt
-  **Facturation complète** (devis, factures, avoirs)
-  **Gestion clients et équipes** avec rôles granulaires
-  **Authentification sécurisée** (JWT + 2FA optionnel)
-  **Tableaux de bord** exécutifs avec KPIs et rapports
-  **Suivi du temps** et allocation de ressources

### Cas d'usage
-  Agences créatives
-  Cabinets de conseil  
-  Sociétés de développement logiciel
-  Équipes projet de toutes tailles

---

##  Fonctionnalités

###  Authentification & Sécurité
- Inscription avec vérification email
- Connexion sécurisée (JWT + refresh tokens)
- Réinitialisation mot de passe par email
- Authentification à deux facteurs (2FA) optionnelle
- Protection contre brute force (rate limiting + verrouillage compte)
- Session automatique avec refresh toutes les 10 minutes

###  Gestion de Projets
- Création guidée de projets
- 6 statuts de cycle de vie (prospection → archivé)
- Budget prévisionnel et suivi
- Dates et jalons
- Allocation de ressources par coordinatrice
- Conversion devis → projet → facture

### Gestion de Tâches
- Création de tâches avec priorités et dépendances
- Attribution à des membres d'équipe
- Estimation de temps et suivi réel
- Statuts personnalisables
- Sous-tâches et checklists
- Commentaires et discussions

###  Vues et Visualisations
- **Tableau Kanban** : drag & drop interactif
- **Diagramme de Gantt** : planification temporelle
- **Vue liste** : tri multi-critères
- **Vue calendrier** : vue globale des projet
- **Filtres avancés** : sauvegarde des filtres personnalisés

###  Facturation Complète
- Devis avec modèles
- Numérotation automatique
- Calculs automatiques (HT, TVA, TTC)
- Conversion devis → facture
- Factures d'acompte et solde
- Avoirs et notes de crédit
- Gestion des échéances et paiements
- Export comptable (FEC)

###  Gestion d'Équipe
- 6 rôles spécialisés avec permissions granulaires
- Admin : gestion complète plateforme
- Director : validation + rapports
- Coordinator : coordination opérationnelle
- Chef de projet : gestion projets spécifiques
- Membre : exécution tâches
- Client : consultation et validation

###  Rapports & Analytics
- Tableau de bord administrateur (paramètres + audit)
- Tableau de bord exécutif (KPIs + ROI)
- Rapports financiers (CA, rentabilité, marges)
- Analyse charge de travail par équipe
- Portefeuille clients et opportunités
- Suivi du temps par projet/tâche

###  Intégrations
- **Email** : SMTP, Gmail API, Microsoft Outlook
- **Stockage cloud** : Google Drive, Dropbox, AWS S3 (Cloudinary pour fichiers existant)
- **Calendrier** : Google Calendar, Outlook Calendar
- **Communication** : Slack, Microsoft Teams
- **Paiement** : Stripe, PayPal
- **Webhooks** : automatisations personnalisées vers URLs externes
- Socket.io pour notifications temps réel

---

##  Stack Technologique

### Backend
- **Runtime** : Node.js
- **Framework** : Express.js
- **Base de données** : MongoDB avec Mongoose
- **Authentification** : JWT (jsonwebtoken)
- **Chiffrement** : bcryptjs
- **Email** : Nodemailer
- **Upload fichiers** : Multer + Cloudinary
- **Real-time** : Socket.io
- **Validation** : Express Validator
- **Rate limiting** : express-rate-limit

### Frontend
- **Framework** : React 18
- **Routage** : React Router v6
- **HTTP Client** : Axios
- **État** : Context API
- **Real-time** : Socket.io Client
- **Styling** : CSS3 moderne (variables, glassmorphism)
- **Build** : Create React App / Vite (optionnel)

### Infrastructure
- **Hosting** : Docker Ready
- **Environnement** : Development / Production
- **HTTPS** : TLS/SSL obligatoire prod

---

##  Installation

### Prérequis
- Node.js ≥ 16.x
- npm ou yarn
- MongoDB local ou Atlas
- Compte Cloudinary (optionnel)

### 1. Cloner le repository
```bash
git clone https://github.com/yourusername/nolyss.git
cd nolyss
```

### 2. Installation Backend
```bash
cd backend
npm install

# Créer fichier .env
cp .env.example .env

# Configurer variables d'environnement
# (voir section Configuration)

# (Optionnel) Initialiser base de données
npm run seed
```

### 3. Installation Frontend
```bash
cd ../frontend
npm install

# Créer fichier .env
# REACT_APP_API_URL=http://localhost:5000
```

---

##  Démarrage

### Démarrage Développement

**Terminal 1 - Backend** :
```bash
cd backend
npm run dev
# Backend disponible sur http://localhost:5000
```

**Terminal 2 - Frontend** :
```bash
cd frontend
npm start
# Frontend disponible sur http://localhost:3000
```

Ouvrir http://localhost:3000 dans votre navigateur.

### Démarrage Production

**Backend** :
```bash
cd backend
NODE_ENV=production npm start
```

**Frontend** :
```bash
cd frontend
npm run build
# Servir les fichiers de /build
```

---

##  Configuration

### Variables Backend (.env)

```env
# Serveur
PORT=5000
NODE_ENV=development

# Base de données
MONGODB_URI=mongodb://localhost:27017/nolyss

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

# Email (optionnel, dev)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@nolyss.com
CLIENT_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Variables Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

##  Architecture

### Structure Backend
```
backend/
├── config/          # Configuration (base de données, rôles)
├── controllers/     # Logique métier (auth, clients, projets, etc.)
├── middleware/      # Middlewares (authentification, validation, rôles)
├── models/          # Schémas Mongoose (User, Project, Task, etc.)
├── routes/          # Définition des routes API
├── utils/           # Utilitaires (token generation, formatage)
├── server.js        # Point d'entrée
└── package.json     # Dépendances
```

### Structure Frontend
```
frontend/
├── public/          # HTML statique et assets
├── src/
│   ├── components/  # Composants React
│   │   ├── Auth/       # Pages authentification
│   │   ├── Layout/     # Layout principal
│   │   ├── Dashboard/  # Tableaux de bord
│   │   ├── Clients/    # Gestion clients
│   │   ├── Projects/   # Gestion projets
│   │   ├── Tasks/      # Gestion tâches
│   │   └── ClientPortal/ # Portail client
│   ├── contexts/    # Context API (Auth, Socket)
│   ├── utils/       # Utilitaire API et helper
│   ├── App.js       # Routage principal
│   └── index.js     # Point d'entrée
└── package.json
```

---

## 👥 Rôles & Permissions

### 6 Rôles Spécialisés

| Rôle | Responsabilités | Accès |
|------|---|---|
| **Admin** | Gestion plateforme complète, paramètres, audit | Tous les modules |
| **Director** | Vision stratégique, KPIs, validation budgets | Projects, Clients (lecture), Factures, Rapports |
| **Coordinator** | Coordination opérationnelle, allocation ressources | Projects (créer), Tâches, Temps, Équipe |
| **Chef Projet** | Gestion projets spécifiques | Ses projets, Tâches, Temps |
| **Membre Équipe** | Exécution tâches assignées, suivi temps | Ses tâches, Temps, Communication |
| **Client** | Validation, consultation livrables | Ses projets (lecture), Devis, Factures |

### Permissions Granulaires : 50+
- Gestion utilisateurs, clients, projets, tâches
- Création/modification/suppression devis/factures
- Validation documents > seuil
- Audit logs, rapports
- Configuration système

Voir [FIXES_AND_IMPROVEMENTS.md](FIXES_AND_IMPROVEMENTS.md) pour détails complets.

---

##  Documentation

### Pour les Utilisateurs
-  [Guide Authentification & Compte](./USER_GUIDE_AUTH.md)
  - Inscription, connexion
  - Mot de passe oublié
  - 2FA
  - Sécurité des comptes

### Pour les Développeurs
-  [Architecture Sécurité](./SECURITY.md)
  - Authentification & JWT
  - Protection attaques
  - Gestion session
  - Checklist production

- 🔧 [Corrections & Améliorations](./FIXES_AND_IMPROVEMENTS.md)
  - Défauts corrigés
  - Nouveaux modules ajoutés
  - Comparaison avant/après
  - Checklist sécurité restante

-  [API Documentation](./API.md) (à venir)
  - Endpoints complets
  - Exemples requêtes/réponses
  - Codes d'erreur

### Architecture Technique
- Voir fichiers `/config`, `/controllers`, `/middleware`
- Voir structures de données dans `/models`
- Voir flux d'authentification dans `contexts/AuthContext.js`

---

##  Sécurité

### Implémenté 
-  Authentification JWT avec access/refresh tokens
-  Chiffrement bcryptjs des mots de passe
-  Vérification email à l'inscription
-  Réinitialisation mot de passe sécurisée (1h)
-  Rate limiting (5 tentatives/15min)
-  Brute force protection (verrouillage compte)
-  Session management automatique
-  Validation input avec Express Validator
-  CORS configuré
-  Rôles et permissions granulaires

### Avant Production 
- Déployer sur HTTPS/TLS
- Configurer SMTP pour emails
- Ajouter Helmet.js pour sécurité headers
- Configurer WAF
- Tester avec OWASP Top 10
- Audit logs actif
- Monitoring et alertes

Voir [SECURITY.md](./SECURITY.md) pour détails complets.

---

##  Contribution

Les contributions sont les bienvenues !

### Process
1. Fork le repository
2. Créer branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit changements (`git commit -m 'Add feature'`)
4. Push vers branche (`git push origin feature/AmazingFeature`)
5. Ouvrir Pull Request

### Guide de Code
- Nommage en camelCase pour variables/fonctions
- Docstrings pour fonctions complexes
- Tests pour nouvelles fonctionnalités
- Respect guide style Node.js

---

##  License

Ce projet est sous licence [MIT](LICENSE).

---

##  Support

### Questions?
- Consultez la [documentation](#documentation)
- Ouvrez une [issue GitHub](https://github.com/yourusername/nolyss/issues)
- Contactez : support@nolyss.com

### Signaler un bug
- Décrivez le problème en détail
- Incluez étapes de reproduction
- Joignez logs si possible
- Indiquez version Node.js et navigateur

---

##  Roadmap

### V1.1 (Q2 2026)
- [ ] 2FA avec TOTP (Google Authenticator)
- [ ] Audit logs persistants
- [ ] Export PDF/Excel rapports
- [ ] Intégrations Slack

### V1.2 (Q3 2026)
- [ ] SSO / OAuth2
- [ ] API Keys pour accès programmatique
- [ ] Webhooks pour intégrations custom
- [ ] Mobile app (React Native)

### V1.3 (Q4 2026)
- [ ] IA pour estimation tâches
- [ ] Planification intelligente
- [ ] Chatbot support client
- [ ] Marketplace intégrations

---

## Crédits

Développé avec  par l'équipe NOLYSS.

**Dépendances** :
- Express.js
- React
- MongoDB
- Socket.io
- Et bien d'autres...

---

**Dernière mise à jour** : 14 février 2026  
**Version** : 1.0.0  
**Statut** : Production Ready 
