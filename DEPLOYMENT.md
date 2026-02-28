# 🚀 Guide Déploiement Production - NOLYSS

## Checklist Prédéploiement

### 1. Sécurité ✅
- [ ] JWT_SECRET : minimum 32 caractères aléatoires
- [ ] JWT_REFRESH_SECRET : minimum 32 caractères aléatoires
- [ ] CORS_ORIGIN : domaine production uniquement
- [ ] HTTPS/TLS configuré (certificat valide)
- [ ] NODE_ENV=production configuré
- [ ] Helmet.js ajouté (voir section optionnelle)
- [ ] Variables sensibles en .env (jamais en repo)
- [ ] .gitignore inclut .env et node_modules

### 2. Base de Données ✅
- [ ] MongoDB Atlas ou instance MongoDB sécurisée
- [ ] MONGODB_URI valide et testée
- [ ] Backups automatiques configurés (quotidiens)
- [ ] Réplication/Cluster pour HA (optionnel)
- [ ] Authentification MongoDB activée

### 3. Email ✅
- [ ] SMTP configuré (SendGrid, Mailgun, Gmail SMTP)
- [ ] EMAIL_HOST et EMAIL_PASS valides
- [ ] EMAIL_FROM = domaine valide
- [ ] SPF/DKIM configurés (spam prevention)
- [ ] Templates d'email testés

### 4. Fichiers ✅
- [ ] Cloudinary configuré (ou service équivalent)
- [ ] CLOUDINARY_API_KEY et SECRET valides
- [ ] Quotas de stockage vérifiés

### 5. Frontend ✅
- [ ] Build production : `npm run build`
- [ ] REACT_APP_API_URL pointant vers backend prod
- [ ] Tous les tests passent
- [ ] Console sans erreurs
- [ ] Performance acceptable (Lighthouse)

### 6. Backend ✅
- [ ] Tous les tests API passent
- [ ] Pas de console.log en production (utiliser logger)
- [ ] Error handling robuste
- [ ] Timeouts configurés
- [ ] Monitoring actif

---

## Option 1 : Déploiement avec Vercel + Heroku

### Frontend sur Vercel

```bash
# 1. Push code sur GitHub
git push origin main

# 2. Connecter Vercel à GitHub
# - Aller sur vercel.com/new
# - Importer le repository
# - Configurer build settings:
#   - Framework: Create React App
#   - Build command: npm run build
#   - Output directory: build

# 3. Variables d'environnement dans Vercel
# REACT_APP_API_URL=https://nolyss-api.herokuapp.com
```

### Backend sur Heroku

```bash
# 1. Créer compte Heroku et installer CLI
npm install -g heroku
heroku login

# 2. Créer application Heroku
heroku create nolyss-api

# 3. Ajouter MongoDB Atlas
heroku addons:create mongolab

# 4. Configurer variables d'environnement
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_here_min_32_chars
heroku config:set JWT_REFRESH_SECRET=your_refresh_secret_here
heroku config:set CORS_ORIGIN=https://nolyss.vercel.app
heroku config:set EMAIL_HOST=smtp.sendgrid.net
heroku config:set EMAIL_USER=apikey
heroku config:set EMAIL_PASS=your_sendgrid_key
heroku config:set EMAIL_FROM=noreply@nolyss.com
heroku config:set CLIENT_URL=https://nolyss.vercel.app
heroku config:set CLOUDINARY_NAME=your_name
heroku config:set CLOUDINARY_API_KEY=your_key
heroku config:set CLOUDINARY_API_SECRET=your_secret

# 5. Déployer
git push heroku main

# 6. Vérifier logs
heroku logs --tail
```

---

## Option 2 : Déploiement avec Docker

### Dockerfile Backend

Créer `backend/Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm install --production

# Code source
COPY . .

# Port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error()})"

# Start
CMD ["npm", "start"]
```

Créer `backend/.dockerignore` :

```
node_modules
npm-debug.log
.env
.git
```

### Dockerfile Frontend

Créer `frontend/Dockerfile` :

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

### Docker Compose

Créer `docker-compose.yml` :

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
      MONGO_INITDB_DATABASE: nolyss
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGODB_PASSWORD}@mongodb:27017/nolyss
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: http://localhost:3000
      EMAIL_HOST: ${EMAIL_HOST}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASS: ${EMAIL_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
      CLIENT_URL: ${CLIENT_URL}
      CLOUDINARY_NAME: ${CLOUDINARY_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    depends_on:
      - mongodb
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: ${REACT_APP_API_URL}
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongo_data:
```

### Déployer avec Docker

```bash
# 1. Build images
docker-compose build

# 2. Démarrer services
docker-compose up -d

# 3. Vérifier logs
docker-compose logs -f

# 4. Arrêter
docker-compose down
```

---

## Option 3 : Déploiement VPS (Linux)

### 1. Préparation VPS

```bash
# Update système
sudo apt update && sudo apt upgrade -y

# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Installer Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Installer PM2
sudo npm install -g pm2

# Installer Certbot pour HTTPS
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Configuration Application

```bash
# Cloner repo
cd /home/ubuntu
git clone https://github.com/yourusername/nolyss.git
cd nolyss

# Backend
cd backend
npm install
# Créer .env avec variables production

# Frontend
cd ../frontend
npm install
npm run build
```

### 3. Configuration Nginx

Créer `/etc/nginx/sites-available/nolyss` :

```nginx
# Backend API
upstream backend {
  server localhost:5000;
}

server {
  listen 80;
  server_name api.nolyss.com;
  
  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# Frontend
server {
  listen 80;
  server_name nolyss.com;
  root /home/ubuntu/nolyss/frontend/build;
  
  location / {
    try_files $uri /index.html;
  }
  
  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Activer la config :

```bash
sudo ln -s /etc/nginx/sites-available/nolyss /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. HTTPS avec Let's Encrypt

```bash
sudo certbot --nginx -d nolyss.com -d api.nolyss.com -d www.nolyss.com
```

### 5. Démarrer Application

```bash
# Backend avec PM2
cd /home/ubuntu/nolyss/backend
pm2 start npm --name "nolyss-backend" -- start
pm2 save
pm2 startup

# Logs
pm2 logs nolyss-backend
```

---

## Monitoring & Maintenance

### Monitoringerver Health

```bash
# Ajouter endpoint health
# backend/routes/healthRoutes.js
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

# Vérifier
curl https://api.nolyss.com/health
```

### Logs

```bash
# PM2 logs
pm2 logs nolyss-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backups MongoDB

```bash
# Script backup auto
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://admin:password@localhost:27017/nolyss" \
  --archive=$BACKUP_DIR/nolyss-$(date +%Y%m%d-%H%M%S).archive

# Cron job (quotidien)
0 2 * * * /home/ubuntu/backup.sh
```

---

## Améliorations Sécurité Optionnelles

### Ajouter Helmet.js

```bash
npm install helmet
```

Backend `server.js` :

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### Configurer WAF (Cloudflare)

1. Pointer DNS vers Cloudflare
2. Configurer règles de sécurité
3. Activer DDoS protection
4. Rate limiting global

### Activer 2FA sur Comptes Admin

- Configurer TOTP avec Google Authenticator
- Exiger reset mot de passe admin après déploiement
- Activer audit logs

---

## Commandes Utiles

```bash
# Redémarrer backend
pm2 restart nolyss-backend

# Redéployer depuis Git
cd /home/ubuntu/nolyss
git pull origin main
cd backend && npm install && pm2 restart nolyss-backend
cd ../frontend && npm install && npm run build

# Vérifier espace disque
df -h

# Vérifier usage mémoire
free -h

# Vérifier status services
sudo systemctl status mongod
sudo systemctl status nginx
pm2 list
```

---

## Troubleshooting

### Backend ne démarre pas
```bash
pm2 logs nolyss-backend
# Vérifier variables .env
# Vérifier connexion MongoDB
```

### Erreurs CORS
```bash
# Vérifier CORS_ORIGIN dans .env
# Doit être URL frontend exacte
CORS_ORIGIN=https://nolyss.com
```

### Emails non reçus
```bash
# Vérifier config SMTP
# Vérifier logs backend
pm2 logs

# Tester SMTP
telnet smtp.gmail.com 587
```

---

**Dernière mise à jour** : 14 février 2026  
**Version** : 1.0.0
