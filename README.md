# Financy-Web

Application de gestion de patrimoine personnel — inspirée de Finary.

**Stack** : Next.js 14 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · Recharts · React Query

---

## Nouveautés — session du 24 mars 2026 (suite)

### Comparaison vs indices (WealthChart)
- Boutons toggle **S&P 500 / CAC 40 / MSCI World** sur le graphe patrimoine du dashboard
- Données Yahoo Finance (public, sans clé) normalisées en base 100 pour comparaison équitable
- Affichage superposé en pointillés colorés sur le graphe AreaChart existant
- Cache 1h côté serveur · endpoint `/api/benchmark`

### Multi-devise live
- Nouvel onglet **Devises** enrichi avec taux de change en direct (Open Exchange Rates)
- Taux EUR→USD/GBP/CHF/JPY/CAD/AUD affichés en temps réel
- Conversion de chaque exposition en EUR équivalent
- Source affiché + bouton actualiser · endpoint `/api/exchange-rates`

### Sparklines par position
- Mini graphe 30 jours intégré dans chaque carte de position du portefeuille
- Couleur rouge/verte selon la tendance du mois
- Chargement lazy, cache 1h · endpoint `/api/sparkline`

### Calendrier fiscal
- Section **Calendrier fiscal** en bas de la page Rapport fiscal
- Dates clés de l'année : ouverture/clôture déclarations, acomptes PFU, solde IR, IFU courtier
- Code couleur par catégorie : Déclaration (bleu), Paiement (ambre), Info (vert)
- Dates passées grisées, date du jour en alerte

---

## Nouveautés — session du 24 mars 2026

### Recherche globale (Cmd+K)
- Modal de recherche instantanée accessible via `Cmd+K` / `Ctrl+K` depuis n'importe quelle page
- Recherche simultanée dans les actifs, transactions et objectifs de l'utilisateur
- Navigation directe vers la page correspondante au clic

### Répartition sectorielle
- Nouvel onglet **Secteurs** dans le Portefeuille
- Donut chart + tableau avec pourcentage et valeur par secteur
- Mapping de 70+ symboles : Tech, Finance, Luxe, Énergie, ETF, Crypto, etc.

### Milestones patrimoniaux
- Widget **Paliers patrimoniaux** sur le dashboard
- Paliers : 🌱 1k → 💡 5k → ⭐ 10k → 🔥 25k → 💎 50k → 🏆 100k → 🦁 250k → 🚀 500k → 👑 1M
- Barre de progression vers le prochain palier + montant restant à atteindre

### Mode clair / sombre
- Toggle **Mode clair / Mode sombre** dans la sidebar
- Persistance via localStorage, anti-flash au chargement (script inline)
- Couleurs complètes via CSS variables, aucune classe Tailwind `dark:` requise

### Alertes de cours actives
- Vérification automatique des alertes toutes les 60 secondes
- Toast de notification en bas à droite si une alerte est déclenchée
- Marquage automatique en base de données (`triggered: true`)
- Alertes configurables depuis Paramètres → Alertes de cours

### 2FA — Appareils de confiance (30 jours)
- Après validation du 2FA, checkbox "Se souvenir de cet appareil pendant 30 jours"
- Token HMAC signé (NEXTAUTH_SECRET) stocké dans un cookie `financy_trusted`
- Au login suivant sur le même appareil : 2FA automatiquement skipé

---

## Nouveautés — session du 23 mars 2026

### Projection patrimoniale
- Nouveau widget sur le dashboard : courbe interactive "dans X ans, avec Y€/mois et Z% de rendement, tu auras W€"
- Prend le patrimoine réel de l'utilisateur comme point de départ
- Horizons configurables : 5 / 10 / 20 / 30 ans
- Taux prédéfinis (Livret A 3%, ETF World 8%, S&P 500 10%) + taux personnalisé
- Double courbe : capital investi (pointillés) vs patrimoine projeté

### Export PDF
- Bouton "Export PDF" dans le header du dashboard
- Page dédiée `/report` avec mise en page blanche imprimable
- Contenu : allocation, actifs, positions ouvertes, évolution mensuelle
- Utilise `window.print()` — aucune dépendance supplémentaire

### Alertes budget 50/30/20
- Bandeaux d'alerte rouge/orange dans la page Budget quand une catégorie dépasse son objectif
- Badge rouge sur la cloche du header avec le nombre d'alertes actives

### Tags sur les transactions
- Ajout/suppression de tags inline sur chaque transaction
- Tags colorisés automatiquement selon leur nom
- Filtrage par tag dans la toolbar
- PATCH API + mise à jour optimiste
- Nouveau champ `tags` (String) sur le modèle `Transaction` — lancer `npx prisma db push`

### Calculateur d'épargne sur les objectifs
- Chaque carte objectif affiche l'épargne mensuelle nécessaire pour atteindre le but
- Formule PMT a 7%/an : prend en compte le patrimoine actuel + la date cible
- Ex : "A 7%/an, épargnez 432€/mois pour atteindre cet objectif en 48 mois"

### Graphe dividendes mensuel
- Onglet Dividendes du Portefeuille amélioré
- 3 cartes résumé : total cette année / moyenne mensuelle / total historique
- Bar chart des 12 derniers mois
- Tableau historique complet en dessous

### Widget Revenus passifs (dashboard)
- Agrège dividendes (transactions DIVIDEND) + loyers immobiliers
- Loyers lus automatiquement depuis les notes d'un actif : écrire `loyer: 800` dans les notes
- Affiche total annuel, moyenne mensuelle, mini bar chart 6 mois

### Rendement locatif immobilier
- Dans la page Actifs, chaque bien immobilier affiche :
  - Loyer mensuel (lu depuis les notes : `loyer: 800`)
  - Rendement brut annuel (%)
  - Revenu annuel estimé

---

## Features existantes

- **PWA mobile** — installable sur iPhone, bottom navigation, safe-area iOS
- **WealthChart** — graphe patrimoine avec sélecteur de période (1M/3M/6M/1A/MAX)
- **Score de santé** — score 0-100 sur diversification, liquidité, investissements
- **Onboarding** — écran d'accueil animé si aucun actif
- **Dashboard mobile-first** — stat cards 2x2, delta mensuel, padding safe-area
- **Portefeuille** — positions live, performance vs indices (S&P 500 / CAC 40 / MSCI World), devises, rééquilibrage
- **Budget 50/30/20** — Sankey diagram, calendrier de flux, sauvegarde auto
- **Rapport fiscal** — plus-values, dividendes, estimation PFU 30%
- **Simulateur** — intérêts composés avec presets (Livret A, ETF, S&P 500)
- **Objectifs** — jalons patrimoniaux avec barre de progression
- **Import CSV** — import de transactions en masse
- **Alertes de cours** — alerte quand un titre dépasse/descend sous un seuil
- **Assistant IA** — chat flottant basé sur Gemini

---

## Lancer le projet

```bash
npm install
npx prisma db push
npm run dev
```

Variables d'environnement requises (`.env`) :

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GEMINI_API_KEY=
```
