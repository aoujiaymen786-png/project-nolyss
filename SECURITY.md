# ARCHITECTURE SÉCURITÉ - NOLYSS

## Suite de Sécurité Implémentée

### 1. Authentification & Autorisation

#### Authentification
- **Chiffrement des mots de passe** : bcryptjs avec salt (10 rounds)
- **JWT pour tokens** : 
  - Access Token : durée de vie courte (15 minutes)
  - Refresh Token : durée de vie longue (7 jours)
- **Rotation de refresh tokens** : nouveau refresh token émis à chaque utilisation
- **Tokens stockés en localStorage** (considérer sessionStorage en prod)

#### Protection contre les attaques
- **Rate limiting** : 5 tentatives de connexion/mot de passe oublié en 15 minutes
- **Brute force protection** : verrouillage du compte après 5 tentatives (15 minutes)
- **HTTPS obligatoire** en production

### 2. Gestion de Session

- **Session automatique** : 
  - Refresh token automatique toutes les 10 minutes
  - Fallback automatique si access token expiré
- **Logout** : invalidation du refresh token côté serveur
- **Expiration** : logout automatique si refresh échoue

### 3. Vérification Email

- **Verification Token** : généré lors de l'inscription
- **Email de vérification** : envoyé si SMTP configuré
- **Token unique** : lien de vérification personnalisé
- **Mode développement** : token retourné dans la réponse si email non configuré

### 4. Réinitialisation Mot de Passe

- **Password Reset Token** : généré et expirant après 1 heure
- **Email de réinitialisation** : envoyé si SMTP configuré
- **Lien sécurisé** : token non stocké en clair, hachage MD5 stocké
- **Mode développement** : token retourné dans la réponse si email non configuré

### 5. Gestion des Rôles et Permissions

Rôles avec permissions granulaires :

#### Administrateur
- Création/modification/suppression utilisateurs
- Attribution des rôles et permissions
- Configuration système complète
- Audit et logs d'activité
- Gestion intégrations

#### Directeur
- Vision stratégique des projets
- Validation budgets/devis > seuil
- Rapports financiers consolidés
- Accès lecture à tous les projets
- Gestion stratégique clients

#### Coordinatrice
- Création/configuration projets
- Affectation des ressources
- Planification sprints
- Suivi avancement et livrables
- Interface équipe/clients

#### Chef de Projet
- Gestion de projets spécifiques
- Création/modification tâches
- Suivi temps et ressources
- Assignation d'équipe

#### Membre d'Équipe
- Exécution des tâches assignées
- Suivi du temps passé
- Communication/collaboration
- Consultation documents

#### Client
- Consultation statut projets
- Validation livrables
- Lecture documents/devis/factures
- Communication

### 6. Audit et Conformité

- **Logs d'activité** : enregistrement des actions sensibles
- **Logs de connexion** : historique des tentatives de connexion
- **RGPD** : suppression de données utilisateurs respectée
- **Export comptable** : traçabilité factures/devis

### 7. Validation et Sanitization

- **Express Validator** : validation côté serveur de tous les inputs
- **CORS** : restriction des origines autorisées
- **Headers de sécurité** : (à ajouter : Helmet.js)

### 8. Configuration Email (Optionnelle)

Variables d'environnement SMTP :
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@nolyss.com
CLIENT_URL=http://localhost:3000
```

Si non configurée : les tokens sont retournés en réponse (développement seulement)

## Flux d'Authentification

```
1. Inscription
   - Validation email/mot de passe
   - Hachage bcrypt du mot de passe
   - Génération verification token
   - Envoi email (ou token en réponse)

2. Vérification Email
   - Token valide = isVerified true
   - Token expiré/invalide = erreur

3. Connexion
   - Email/mot de passe valide
   - Vérification pas de verrouillage
   - Génération access + refresh token
   - Rotation ref token automatique

4. Session Active
   - Access token = autorise requêtes (15 min)
   - Expiration access = utilise refresh (automatique)
   - Refresh token invalide = logout

5. Mot de Passe Oublié
   - Génération reset token (1h)
   - Envoi email avec lien reset
   - Validation token + nouveau mot de passe
   - Réinitialisation et update

6. Logout
   - Invalidation refresh token côté serveur
   - Suppression tokens localStorage
   - Redirect login
```

## Checkpoints de Sécurité

### Avant Production
- [ ] Configurer JWT_SECRET et JWT_REFRESH_SECRET (min 32 chars)
- [ ] Configurer HTTPS/TLS
- [ ] Configurer CORS avec domaines spécifiques
- [ ] Ajouter Helmet.js pour sécurité headers
- [ ] Configurer SMTP pour emails (ou utiliser SendGrid/Mailgun)
- [ ] Implémenter 2FA optionnel
- [ ] Ajouter rate limiting sur autres endpoints sensibles
- [ ] Configurer logging centralisé
- [ ] Implémenter session Redis (optionnel, meilleure perfs)
- [ ] Tester attaques CSRF/XSS/SQL Injection

### En Production
- [ ] Activer NODE_ENV=production
- [ ] Activer HTTPS obligatoire
- [ ] Ajouter WAF (Web Application Firewall)
- [ ] Monitoring et alertes actifs
- [ ] Backups quotidiens base de données
- [ ] Audit logs exportés régulièrement
- [ ] Penetration testing régulier

## Endpoints Sécurisés

```
POST /api/auth/register          - Public, validation input
POST /api/auth/login             - Rate limited (5/15min)
POST /api/auth/verify-email      - Public, token validation
POST /api/auth/forgot-password   - Rate limited (5/15min)
POST /api/auth/reset-password    - Public, token expiration
POST /api/auth/refresh-token     - Rotation automatique
POST /api/auth/logout            - Protect, invalidation serveur
GET  /api/auth/me                - Protect, données utilisateur

Tous les autres endpoints : Protect + autorisation rôle
```

## Prochaines Étapes

1. **2FA (Two-Factor Authentication)** : implémenter TOTP avec authenticator
2. **SSO** : OpenID Connect / OAuth2
3. **Audit Logs** : enregistrement complet des actions
4. **Session Redis** : meilleure gestion sessions distribués
5. **Webhook signatures** : pour intégrations tierces
6. **API Keys** : pour accès programmatique sécurisé
