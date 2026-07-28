# Plateforme de Gestion des Ressources — Compagnie de Phosphate de Gafsa

Application interne pour suivre la consommation quotidienne de ressources (eau, énergie,
réactifs, etc.), avec tableaux de bord graphiques et export de rapports PDF.

**Stack** : React (Vite) + Node.js/Express + Supabase (PostgreSQL + Auth + MFA)

---

## 1. Fonctionnalités

- Comptes **pré-créés uniquement** par un administrateur (pas d'inscription publique)
- **Double authentification obligatoire** (TOTP — Google/Microsoft Authenticator) à la
  première connexion, via le système MFA natif de Supabase (norme AAL2)
- Gestion des catégories de ressources (CRUD)
- Gestion des ressources par catégorie, avec unité et **seuil d'alerte** (CRUD)
- Saisie, modification et suppression des valeurs de consommation quotidienne
- Tableau de bord avec histogrammes, courbe de tendance et répartition par catégorie
  (recharts)
- Export PDF d'un **rapport général** (période + catégories filtrables) ou d'un
  **graphique isolé**, générés côté serveur avec en-tête officiel
- **Journal d'audit** complet (qui a créé/modifié/supprimé quoi, et quand)
- Gestion des comptes utilisateurs par l'admin (créer, activer/désactiver, réinitialiser
  la MFA en cas de perte de téléphone)

---

## 2. Sécurité (important en environnement industriel)

- **RLS (Row Level Security)** activée sur toutes les tables — aucun accès aux données
  sans policy explicite
- **MFA obligatoire** avant tout accès aux données (vérifié à la fois côté frontend et
  côté backend via le niveau `aal2`)
- Séparation stricte des clés : `service_role` (secrète) uniquement côté backend,
  jamais exposée au navigateur
- `helmet` (en-têtes HTTP sécurisés), `express-rate-limit` (anti brute-force, limite
  stricte sur la création de comptes), CORS restreint à l'origine du frontend
- Validation stricte des entrées API avec `zod`
- Comptes désactivables par un administrateur sans suppression des données historiques
- Journal d'audit horodaté et non modifiable par les utilisateurs (accessible en
  lecture seule aux administrateurs)
- Aucune stack trace ni détail d'erreur interne renvoyé au client

---

## 3. Structure du projet

```
phosphate-platform/
├── supabase/
│   ├── schema.sql          # Tables, triggers, audit automatique
│   └── rls_policies.sql    # Politiques de sécurité (RLS)
├── backend/                # API Node/Express (création de comptes + PDF)
│   └── src/
├── frontend/                # Application React (Vite + Tailwind)
│   └── src/
└── README.md
```

---

## 4. Mise en place — Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter dans l'ordre :
   1. `supabase/schema.sql`
   2. `supabase/rls_policies.sql`
3. Dans **Authentication → Providers** : désactiver les inscriptions publiques
   (les comptes sont créés uniquement via le backend admin)
4. Dans **Authentication → Multi-Factor** : activer **TOTP**
5. Dans **Authentication → URL Configuration** : définir le `Site URL` vers l'URL de
   votre frontend déployé (ex. `https://phosphate-gafsa.vercel.app`), pour que les
   emails d'invitation redirigent correctement
6. Créer le premier compte administrateur manuellement :
   - **Authentication → Users → Invite user**, avec en `raw_user_meta_data` :
     `{"full_name": "Votre nom", "role": "admin"}`
   - Ou exécuter, une fois `SUPABASE_SERVICE_ROLE_KEY` configurée côté backend :
     un simple appel POST à `/api/admin/users` nécessite déjà un admin — pour le tout
     premier compte, passez par le Dashboard Supabase.
7. Récupérer dans **Project Settings → API** : `Project URL`, clé `anon`, clé
   `service_role`

---

## 5. Lancement en local

### Backend
```bash
cd backend
cp .env.example .env   # renseigner les clés Supabase
npm install
npm run dev             # http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env   # renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # http://localhost:5173
```

---

## 6. Déploiement

- **Frontend** : Vercel ou Netlify (build `npm run build`, dossier `dist`). Définir les
  variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (URL du
  backend déployé).
- **Backend** : nécessite un serveur Node persistant (Puppeteer n'est pas adapté aux
  fonctions serverless classiques) — Render, Railway ou Fly.io fonctionnent bien.
  Définir toutes les variables de `.env.example`, en particulier
  `SUPABASE_SERVICE_ROLE_KEY` (à garder strictement secrète) et `FRONTEND_ORIGIN`
  (URL exacte du frontend, pour le CORS).
- **Base de données** : gérée entièrement par Supabase (aucune action supplémentaire).

---

## 7. Idées d'évolutions possibles

- **Alertes automatiques par email** quand une valeur dépasse le seuil défini pour
  une ressource (déjà stocké en base — reste à brancher un envoi d'email, ex. via
  Supabase Edge Functions + Resend/SendGrid)
- **Export Excel/CSV** en plus du PDF, pour l'exploitation dans d'autres outils
- **Comparaison période sur période** (ex. ce mois-ci vs mois précédent) sur le
  tableau de bord
- **Prévisions simples** (moyenne mobile, tendance linéaire) pour anticiper les
  besoins d'approvisionnement
- **Rôle "superviseur"** intermédiaire (accès lecture/écriture sur ses catégories
  uniquement, sans droits d'administration complets)
- **Mode sombre** pour les équipes en salle de contrôle
- **Application mobile / PWA** pour la saisie terrain hors bureau
- **Historique des connexions** par utilisateur (dates, IP) affiché à l'admin, en
  plus du journal d'audit des données
- **Signature électronique** ou validation à deux niveaux avant clôture d'un rapport
  mensuel officiel
- **Multi-sites** si la plateforme doit un jour couvrir plusieurs unités de
  production (le schéma peut être étendu avec une table `sites` et une colonne
  `site_id` sur les ressources)

---

## 8. Notes

- Tous les textes de l'interface sont en français.
- Les identifiants de connexion des employés sont créés uniquement par un
  administrateur ; les employés ne peuvent pas s'inscrire eux-mêmes.
- En cas de perte du téléphone d'un employé, un administrateur peut réinitialiser
  sa MFA depuis la page **Administration → Utilisateurs**.
