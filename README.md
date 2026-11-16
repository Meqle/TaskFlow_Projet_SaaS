# TaskFlow - Outil de gestion de projet SaaS (TD1 Partie 1)

Application web multi-entreprise de gestion de projets et de tâches avec tableau Kanban, développée avec Node.js (Express 5 et Mongoose), Vue 3 (Vite et SortableJS) et MongoDB 8.

## 1. Prérequis

Docker et Docker Compose doivent être installés sur la machine. Aucune installation locale de Node.js ou de MongoDB n'est nécessaire.

## 2. Lancement de l'application

À la racine du projet, exécutez la commande suivante :

```bash
docker compose up -d --build
```

Lors du premier lancement :
1. Le Dockerfile multi-étapes compile l'interface Vue 3 puis construit l'image du serveur Express.
2. Le conteneur MongoDB 8 démarre et valide son test de disponibilité (healthcheck).
3. Le serveur crée les index MongoDB et insère automatiquement un jeu de données de démonstration si la base est vide.

L'application est ensuite accessible à l'adresse :

http://localhost:3000

Pour arrêter l'application :

```bash
docker compose down
```

## 3. Comptes de démonstration créés au démarrage

| Rôle | Entreprise | Adresse e-mail | Mot de passe |
| :--- | :--- | :--- | :--- |
| Super-admin plateforme | Plateforme globale | admin@taskflow.local | admin123 |
| Admin d'entreprise | Acme Corp | alice@acme.fr | acme123 |
| Membre | Acme Corp | bob@acme.fr | acme123 |
| Membre | Acme Corp | claire@acme.fr | acme123 |
| Membre | Acme Corp | maxime@acme.fr | acme123 |
| Admin d'entreprise | Globex | david@globex.fr | globex123 |
| Membre | Globex | emma@globex.fr | globex123 |
| Membre | Globex | thomas@globex.fr | globex123 |

## 4. Configuration de la connexion à la base de données

La configuration de l'application passe par le fichier .env situé à la racine du projet (un modèle commenté est fourni dans .env.example) :

| Variable | Valeur par défaut | Description |
| :--- | :--- | :--- |
| MONGO_URI | mongodb://mongo:27017/taskflow | Adresse complète de connexion à MongoDB |
| PORT | 3000 | Port d'écoute HTTP de l'application |
| JWT_SECRET | chaîne aléatoire | Clé de signature des jetons JWT |
| JWT_EXPIRES_IN | 8h | Durée de validité de la session |
| SEED_ON_START | true | Création automatique des données de démo si la base est vide |
| ADMIN_EMAIL | admin@taskflow.local | Adresse e-mail du compte super-admin initial |
| ADMIN_PASSWORD | admin123 | Mot de passe du compte super-admin initial |

L'application lit l'adresse MongoDB exclusivement depuis la variable MONGO_URI sans aucune adresse ni port écrits en dur dans le code source, ce qui permet de faire évoluer la topologie MongoDB uniquement depuis le fichier .env.

## 5. Organisation des fichiers

```text
├── compose.yml                     Services Docker Compose (app + mongo:8)
├── Dockerfile                      Build multi-étapes (Vue 3 puis serveur Express)
├── .env                            Fichier de configuration actif
├── .env.example                    Modèle de configuration commenté
├── README.md                       Instructions de lancement et comptes de test
├── server/                         API Express 5 et Mongoose
│   ├── config.js                   Lecture des variables d'environnement
│   ├── index.js                    Point d'entrée du serveur
│   ├── seed.js                     Données de démonstration
│   ├── models/                     Schémas Mongoose et plugin d'isolation
│   ├── middlewares/                Vérification JWT, contexte entreprise et rôles
│   └── routes/                     Routes REST de l'application
└── client/                         Interface Vue 3, Vite et SortableJS
```
