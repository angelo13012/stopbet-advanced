# StopBet Advanced 🚀

Application mobile-first pour arrêter les paris sportifs.

## Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Firebase (Auth + Firestore)
- Anthropic Claude API (AI Coach)
- Recharts

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Remplir .env avec vos clés Firebase + Anthropic

# 4. Lancer en développement
npm run dev
```

## Configuration Firebase

1. Créer un projet sur https://console.firebase.google.com
2. Activer Authentication (Email/Password + Google)
3. Créer une base Firestore
4. Copier les clés dans `.env`

## Configuration AI Coach (optionnel)

1. Créer une clé sur https://console.anthropic.com
2. Ajouter `VITE_ANTHROPIC_API_KEY=sk-ant-...` dans `.env`
3. Sans clé : messages de motivation locaux (fonctionne quand même)

## Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /bets/{betId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /goals/{goalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Fonctionnalités

### Gratuit
- 🔥 Streak journalier
- 📊 Dashboard budget
- ⚠️ Intervention IA avant rechute
- 🎯 Objectifs d'épargne
- ⚡ XP + Niveaux (1→10)
- 🏆 Badges débloquables
- 📅 Heatmap 30 jours

### Premium
- 🧠 AI Coach Claude — analyse des patterns de rechute
- 📋 Historique complet
- 💬 Messages IA personnalisés illimités
