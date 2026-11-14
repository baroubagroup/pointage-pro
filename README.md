# Application Mobile de Pointage (100% Logiciel & Sécurisée)

Ce dossier centralise l'ensemble du projet : l'application mobile Flutter, le tableau de bord web d'administration, les scripts de base de données PostgreSQL / Supabase, et le cahier des charges fonctionnel.

---

## 📁 Structure du Projet

```
Application Mobile de Pointage/
│
├── cahier_des_charges.md        # Spécifications complètes & règles anti-fraude
│
├── admin_dashboard/             # Tableau de bord Web Manager / RH (Intéractif)
│   └── index.html               # Supervision en direct, alertes, graphiques & export paie
│
├── backend_database/
│   └── schema.sql               # Schéma SQL PostgreSQL/PostGIS, règles d'alerte & purge 24h
│
└── mobile_app/                  # Code source Flutter (Android & iOS)
    ├── pubspec.yaml             # Dépendances (geolocator, sqflite, local_auth, etc.)
    └── lib/
        ├── main.dart            # Point d'entrée de l'application
        ├── models/
        │   └── punch_model.dart # Modèle de données du pointage
        ├── services/
        │   ├── security_service.dart     # GPS satellite, anti-faux GPS, Wi-Fi, biométrie
        │   └── offline_sync_service.dart # File SQLite locale & synchro automatique
        └── ui/
            └── clock_in_screen.dart      # Interface employé 1-clic avec horloge
```

---

## 🚀 Utilisation & Démarrage

### 1. Tableau de bord Manager (`admin_dashboard`)
- Double-cliquez simplement sur `admin_dashboard/index.html` pour l'ouvrir dans votre navigateur web (Chrome, Edge, Firefox).
- Vous avez accès en direct à :
  - La liste des présents / retards du jour.
  - Les alertes signalées (ex: 📱 Nouvel appareil, 📍 Tolérance de distance).
  - Le graphique d'assiduité hebdomadaire.
  - Le bouton d'export paie en format CSV/Excel.

### 2. Base de données (`backend_database`)
- Exécutez le script `backend_database/schema.sql` dans votre console Supabase ou votre instance PostgreSQL.
- Il active automatiquement l'extension **PostGIS**, configure le calcul de distance et le traitement des alertes.

### 3. Application Mobile (`mobile_app`)
- Ouvrez le dossier `mobile_app` dans votre éditeur (VS Code ou Android Studio).
- Exécutez :
  ```bash
  flutter pub get
  flutter run
  ```
