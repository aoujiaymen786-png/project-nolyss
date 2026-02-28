# ⚡ DÉMARRAGE RAPIDE - NOLYSS

Vous êtes impatient ? Voici comment tester les modifications en 5 minutes !

## 1️⃣ Démarrer Backend (Terminal 1)

```bash
cd backend
npm install  # (si pas déjà fait)
npm run dev
```

Vous verrez : `Server running on port 5000`

## 2️⃣ Démarrer Frontend (Terminal 2)

```bash
cd frontend
npm install  # (si pas déjà fait)
npm start
```

Auto-open : http://localhost:3000

## 3️⃣ Tester l'App

### Page 1 : Register (Nouvelle page moderne ✨)
```
http://localhost:3000/register
- Entrez un email (ex: test@example.com)
- Mot de passe : votrePass123
- Rôle : Membre d'équipe
- Cliquez "S'inscrire"
```

### Page 2 : Verify Email (Nouvelle page ✨)
```
- Vous verrez un token de vérification en réponse
- Copier le token
- Aller à http://localhost:3000/verify-email?token=VOTRE_TOKEN_ICI
- Vous verrez ✅ Email vérifié
```

### Page 3 : Login (Page modernisée)
```
http://localhost:3000/login
- Email : test@example.com
- Password : votrePass123
- Cliquez "Se connecter"
- Vous êtes redirigé vers Dashboard
```

### Page 4 : Forgot Password (Nouvelle page ✨)
```
- Cliquez sur "Mot de passe oublié ?" depuis Login
- Entrez : test@example.com
- Vous recevrez token de reset
- Copier le token
- Aller à http://localhost:3000/reset-password?token=VOTRE_TOKEN_ICI
- Entrez nouveau mot de passe
- Cliquez "Réinitialiser"
```

### Page 5 : Logout
```
- Cliquez sur votre nom en haut à droite
- Cliquez "Déconnexion"
- Vous êtes redirigé vers Login
```

## 4️⃣ Tester l'API Directement

```bash
# Dans un 3e terminal
bash test-api.sh
```

Vous verrez tous les tests API avec status ✅ ou ❌

## 5️⃣ Points à Observer

### UI/UX Moderna
- ✨ **Glassmorphism** : Cards avec effet translucide
- 🎨 **Palette moderne** : Bleu, cyan, rouge
- 📱 **Responsive** : Ouvrez DevTools (F12) et réglez à mobile
- ✨ **Google Fonts** : Typographie élégante (Inter)
- 🔄 **Transitions** : Smooth hover effects

### Sécurité
- 🔐 **Access Token** : 15 min (ancien : 30 jours)
- 🔄 **Refresh Token** : Rotation auto
- 🔒 **Email Verification** : Obligatoire
- 🔑 **Password Reset** : 1h expiration
- 🚫 **Brute Force** : 5 tentatives = verrouillage 15min

### Tests de Sécurité
```bash
# Tenter 5 logins échoués avec bash test-api.sh
# Vous verrez account lock message
```

---

## 📖 Où Trouver L'Info ?

| Besoin | Fichier |
|--------|---------|
| **Vue d'ensemble** | `README.md` |
| **Questions sécurité** | `SECURITY.md` |
| **Ce qui a changé** | `FIXES_AND_IMPROVEMENTS.md` |
| **Guide utilisateur** | `USER_GUIDE_AUTH.md` |
| **Déployer en prod** | `DEPLOYMENT.md` |
| **Résumé complet** | `RAPPORT_FINAL.md` |
| **Tous les changements** | `CHANGELOG.md` |

---

## 🆘 Problèmes ?

### "Port 5000 déjà utilisé"
```bash
# Trouvez le process
lsof -i :5000
# Tuez-le
kill -9 <PID>
```

### "npm not found"
```bash
# Installez Node.js
# https://nodejs.org (LTS)
```

### "Cannot find module"
```bash
# Réinstallez dépendances
rm -rf node_modules package-lock.json
npm install
```

### "ECONNREFUSED Backend"
```bash
# Assurez-vous backend sur port 5000
# Vérifiez : http://localhost:5000/health
```

---

## 🎯 Checklist Rapide

- [ ] Backend `npm run dev` fonctionne
- [ ] Frontend `npm start` se lance
- [ ] Register page charge (UI moderne ✨)
- [ ] Créer utilisateur possible
- [ ] Login page marche (UI moderne ✨)
- [ ] Se connecter possible
- [ ] Forgot password fonctionne (page ✨ nouveaute)
- [ ] Reset password fonctionne (page ✨ nouveaute)
- [ ] Verify email fonctionne (page ✨ nouvelle)
- [ ] Logout invalide session

---

## 💡 Pro Tips

1. **DevTools** : F12 pour voir console
2. **Network** : Tab Network pour voir les calls API
3. **Storage** : Tab Application → Cookies/localStorage pour voir tokens
4. **Mobile** : Ctrl+Shift+M ou Cmd+Shift+M pour toggle mobile view
5. **Tokens** : Tokens dans localStorage sobrevivent au refresh
6. **Logs Backend** : Regardez le terminal node pour DB errors

---

## 🎉 Prochaines Étapes

1. **Explorer code** : Lisez les commentaires nouveaux
2. **Tests** : Lancez `bash test-api.sh` pour endpoints
3. **Sécurité** : Lisez `SECURITY.md` pour détails implémentation
4. **Déployer** : Suivez `DEPLOYMENT.md` pour production
5. **Équipe** : Partagez `USER_GUIDE_AUTH.md` avec users

---

**Version** : 1.0.0  
**Date** : 14 février 2026  
**Statut** : ✅ Production Ready

Happy coding! 🚀
