# Spécification technique - TaskFlow (TD1 Partie 1)

## 1. Architecture générale et isolation entre entreprises

L'application TaskFlow repose sur deux conteneurs orchestrés par Docker Compose :
- Un conteneur applicatif Node.js (version LTS) avec Express 5 et Mongoose, qui sert à la fois les fichiers statiques compilés de l'interface Vue 3 et l'API REST.
- Un conteneur MongoDB 8 relié à un volume persistant.

### Stratégie d'isolation multi-entreprise

Parmi les trois approches possibles pour séparer les entreprises clientes d'un SaaS (une base par entreprise, une collection par entreprise, ou une base partagée avec un champ discriminant), la solution retenue est une base partagée dans laquelle chaque document métier porte le champ companyId.

Pour éviter tout oubli de filtrage dans une route :
1. Le champ companyId ne provient jamais du client (ni de l'URL, ni du corps de la requête).
2. À la connexion, le serveur génère un jeton JWT stocké dans un cookie httpOnly contenant les champs userId, companyId et role.
3. Chaque requête API traverse les middlewares auth puis tenant avant d'atteindre la route. Le middleware tenant lit le companyId dans le JWT et l'enregistre dans le contexte de la requête.
4. Un plugin Mongoose (server/models/tenantPlugin.js) ajoute automatiquement le filtre companyId sur toutes les opérations de lecture, de modification et de suppression, et force le companyId lors de la validation d'un nouveau document.

Si un utilisateur de l'entreprise A appelle la route d'une ressource appartenant à l'entreprise B, la requête filtrée par companyId ne renvoie aucun document et l'API répond 404.

## 2. Modélisation documentaire : imbrication ou référence

En MongoDB, le choix entre imbriquer une donnée dans le document parent ou la stocker dans sa propre collection dépend de sa taille et de sa fréquence d'accès :

| Relation | Choix | Justification |
| :--- | :--- | :--- |
| Entreprise vers projets | Référence (projects.companyId) | Nombre de projets non borné, consultés et gérés séparément |
| Entreprise vers utilisateurs | Référence (users.companyId) | Nombre d'utilisateurs variable ; un utilisateur est recherché seul à la connexion |
| Projet vers membres | Imbrication d'un tableau d'identifiants (projects.members) | Liste courte et bornée d'identifiants, toujours lue avec le projet |
| Projet vers tâches | Référence (tasks.projectId) | Nombre de tâches non borné ; chaque carte est déplacée individuellement dans le Kanban |
| Tâche vers assigné | Référence (tasks.assigneeId) | L'utilisateur vit indépendamment de la tâche (profil, désactivation, suppression) |
| Tâche vers sous-tâches | Imbrication (tasks.checklist) | Liste courte d'étapes rattachée uniquement à la tâche |
| Tâche vers commentaires | Imbrication (tasks.comments) | Peu nombreux et systématiquement affichés à l'ouverture de la tâche |

## 3. Structures de données JSON des collections

La base de données utilise quatre collections : companies, users, projects et tasks.

### 3.1 Collection companies

```json
{
  "_id": ObjectId("6750a1f0c2a1b3d4e5f60001"),
  "name": "Acme Corp",
  "slug": "acme",
  "plan": "pro",
  "createdAt": ISODate("2026-11-16T10:00:00Z"),
  "updatedAt": ISODate("2026-11-16T10:00:00Z")
}
```

Le champ slug est un identifiant unique normalisé. Le champ plan prend la valeur free, pro ou enterprise.

### 3.2 Collection users

```json
{
  "_id": ObjectId("6750a1f0c2a1b3d4e5f60101"),
  "companyId": ObjectId("6750a1f0c2a1b3d4e5f60001"),
  "email": "alice@acme.fr",
  "passwordHash": "$2a$10$...",
  "firstName": "Alice",
  "lastName": "Martin",
  "role": "company_admin",
  "active": true,
  "createdAt": ISODate("2026-11-16T10:05:00Z")
}
```

Le champ role vaut super_admin (administrateur de la plateforme avec companyId nul), company_admin (administrateur de son entreprise) ou member (membre). Le mot de passe est stocké sous forme d'empreinte bcrypt dans passwordHash.

### 3.3 Collection projects

```json
{
  "_id": ObjectId("6750a1f0c2a1b3d4e5f60201"),
  "companyId": ObjectId("6750a1f0c2a1b3d4e5f60001"),
  "name": "Refonte du site",
  "description": "Nouveau site vitrine pour 2027",
  "notes": "Objectifs du projet et comptes-rendus de réunion...",
  "members": [
    ObjectId("6750a1f0c2a1b3d4e5f60101"),
    ObjectId("6750a1f0c2a1b3d4e5f60102")
  ],
  "status": "active",
  "createdBy": ObjectId("6750a1f0c2a1b3d4e5f60101"),
  "createdAt": ISODate("2026-11-16T10:10:00Z")
}
```

Le tableau members contient les identifiants des utilisateurs de l'entreprise assignés au projet. Le champ notes conserve la page de documentation partagée du projet. Le champ status vaut active ou archived.

### 3.4 Collection tasks

```json
{
  "_id": ObjectId("6750a1f0c2a1b3d4e5f60301"),
  "companyId": ObjectId("6750a1f0c2a1b3d4e5f60001"),
  "projectId": ObjectId("6750a1f0c2a1b3d4e5f60201"),
  "title": "Maquette de la page d'accueil",
  "description": "Version mobile et desktop",
  "status": "in_progress",
  "position": 0,
  "priority": "high",
  "labels": ["Design", "Prioritaire"],
  "checklist": [
    {
      "_id": ObjectId("6750a1f0c2a1b3d4e5f60401"),
      "text": "Bannière principale",
      "done": true
    },
    {
      "_id": ObjectId("6750a1f0c2a1b3d4e5f60402"),
      "text": "Adaptation mobile",
      "done": false
    }
  ],
  "assigneeId": ObjectId("6750a1f0c2a1b3d4e5f60102"),
  "dueDate": ISODate("2026-12-01T00:00:00Z"),
  "comments": [
    {
      "_id": ObjectId("6750a1f0c2a1b3d4e5f60501"),
      "authorId": ObjectId("6750a1f0c2a1b3d4e5f60101"),
      "text": "Penser à mettre en avant le formulaire de contact.",
      "createdAt": ISODate("2026-11-16T11:00:00Z")
    }
  ],
  "createdAt": ISODate("2026-11-16T10:20:00Z"),
  "updatedAt": ISODate("2026-11-16T11:00:00Z")
}
```

Le champ status prend une valeur parmi todo, in_progress, review et done, correspondant aux quatre colonnes du tableau Kanban. Le champ position indique l'ordre de la carte dans sa colonne. À la création ou modification d'une tâche, le serveur vérifie que le projet appartient à la même entreprise et que l'utilisateur assigné fait partie des membres du projet.

## 4. Index et configuration de la connexion

### 4.1 Index créés sur les collections

| Collection | Index | Utilité |
| :--- | :--- | :--- |
| companies | { slug: 1 } unique | Empêcher deux entreprises d'avoir le même identifiant |
| users | { email: 1 } unique | Connexion par adresse e-mail sans doublon |
| users | { companyId: 1, role: 1 } | Lister les utilisateurs d'une entreprise |
| projects | { companyId: 1, createdAt: -1 } | Lister les projets d'une entreprise |
| projects | { companyId: 1, members: 1 } | Lister les projets auxquels participe un membre |
| tasks | { companyId: 1, projectId: 1, status: 1, position: 1 } | Afficher le Kanban d'un projet en une requête triée |
| tasks | { companyId: 1, assigneeId: 1 } | Filtrer les tâches attribuées à un utilisateur |

### 4.2 Connexion externe configurable

La connexion à MongoDB est lue depuis la variable d'environnement MONGO_URI définie dans le fichier .env à la racine du projet. Aucun hôte, port ou nom de base de données n'est inscrit en dur dans le code source de l'application, ce qui permet d'adapter la connexion à une autre topologie MongoDB uniquement en modifiant le fichier .env.
