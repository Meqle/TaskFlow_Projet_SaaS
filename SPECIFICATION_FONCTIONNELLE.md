# Spécification fonctionnelle - TaskFlow (TD1 Partie 1)

## 1. Présentation de l'application

TaskFlow est une application web de gestion de projets en mode SaaS multi-entreprise. Elle permet de gérer plusieurs entreprises clientes de façon strictement isolée, d'administrer leurs utilisateurs et leurs projets, et d'organiser les tâches dans un tableau Kanban.

## 2. Rôles et droits d'accès

Trois rôles sont présents dans l'application :

| Action | Super-admin plateforme | Admin d'entreprise | Membre |
| :--- | :--- | :--- | :--- |
| Créer, modifier ou supprimer une entreprise | Oui | Modifier la sienne | Non |
| Créer, modifier, désactiver ou supprimer un utilisateur | Oui, partout | Oui, dans son entreprise | Non (modifier son profil uniquement) |
| Créer, modifier ou supprimer un projet | Oui | Oui | Non |
| Ajouter ou retirer des membres d'un projet | Oui | Oui | Non |
| Voir un projet | Tous | Tous ceux de l'entreprise | Ceux dont il est membre |
| Créer ou modifier une tâche | Oui | Oui | Oui, dans ses projets |
| Supprimer une tâche | Oui | Oui | Oui, dans ses projets |
| Déplacer une tâche dans le Kanban | Oui | Oui | Oui, dans ses projets |

## 3. Fonctionnalités obligatoires du sujet

- Entreprises : création d'une entreprise (avec création optionnelle de son administrateur initial), consultation, modification et suppression avec suppression en cascade de ses projets, tâches et utilisateurs après confirmation.
- Utilisateurs : création par un administrateur avec mot de passe initial, modification, désactivation et suppression. Rattachement obligatoire à une entreprise.
- Projets : création, modification, archivage et suppression au sein d'une entreprise ; assignation des utilisateurs de l'entreprise comme membres du projet.
- Tâches : création au sein d'un projet avec titre, description, utilisateur assigné et statut ; modification et suppression.
- Tableau Kanban : affichage en 4 colonnes (À faire, En cours, En revue, Terminé), déplacement des cartes par glisser-déposer entre les colonnes et au sein d'une même colonne avec sauvegarde immédiate.
- Isolation : aucune donnée d'une entreprise n'est visible ni modifiable depuis le compte d'une autre entreprise, aussi bien dans l'interface que via l'API.

## 4. Fonctionnalités complémentaires ajoutées (inspirées de Trello, Notion et ClickUp)

Pour enrichir l'usage quotidien de l'application, les fonctionnalités suivantes ont été intégrées :

| Fonctionnalité | Inspiration | Description |
| :--- | :--- | :--- |
| Sous-tâches (Checklist) sur chaque tâche | Trello / ClickUp | Liste d'étapes à cocher à l'intérieur d'une tâche avec barre de progression visible directement sur la carte Kanban |
| Étiquettes (Labels) sur les tâches | Trello / Notion | Ajout de mots-clés sur les tâches (par exemple Design, Backend, Prioritaire) affichés sur les cartes |
| Niveau de priorité et date d'échéance | ClickUp / Trello | Priorité (Basse, Moyenne, Haute) et mise en évidence automatique des tâches dont l'échéance est dépassée |
| Vue Liste tabulaire en complément du Kanban | Notion / ClickUp | Possibilité de basculer à tout moment entre le tableau Kanban et une vue en tableau listant toutes les tâches du projet |
| Page de notes et documentation par projet | Notion | Espace de texte partagé rattaché à chaque projet pour rédiger les objectifs, comptes-rendus de réunion et consignes |
| Commentaires sur les tâches | Trello / Notion | Fil de discussion horodaté permettant aux membres du projet d'échanger sur une tâche |
| Filtres multicritères et recherche | ClickUp / Trello | Filtrage instantané par membre assigné, raccourci Mes tâches uniquement, tâches non attribuées, priorité et recherche par mot-clé |
| Tableau de bord d'entreprise | ClickUp | Synthèse affichant le nombre de tâches par statut et la liste des tâches en retard de l'entreprise |

## 5. Parcours type d'utilisation

1. Le super-admin se connecte avec le compte initial (admin@taskflow.local) et consulte les entreprises clientes (Acme Corp et Globex) ou crée une nouvelle entreprise avec son administrateur.
2. L'administrateur d'Acme Corp (alice@acme.fr) se connecte, gère les membres de son entreprise, crée un projet et y assigne des utilisateurs.
3. Un membre d'Acme Corp (bob@acme.fr) ouvre un projet dont il est membre, consulte les notes du projet, crée ou modifie une tâche, coche une sous-tâche et glisse la carte de la colonne À faire vers En cours.
4. Un utilisateur de l'entreprise Globex (david@globex.fr) se connecte : il ne voit que les projets et tâches de Globex et reçoit une erreur 404 s'il tente d'interroger l'identifiant d'une ressource d'Acme Corp.

## 6. Routes de l'API REST

Toutes les routes sont préfixées par /api et, hors connexion et route de santé, nécessitent un jeton JWT valide.

| Méthode et route | Rôle minimum | Effet |
| :--- | :--- | :--- |
| POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me | Public / Connecté | Gestion de la session utilisateur |
| GET /api/companies, POST /api/companies, PATCH /api/companies/:id, DELETE /api/companies/:id | Super-admin | CRUD des entreprises et suppression en cascade |
| GET /api/users, POST /api/users, PATCH /api/users/:id, DELETE /api/users/:id | Admin d'entreprise | CRUD des utilisateurs de son entreprise |
| GET /api/projects, POST /api/projects, GET /api/projects/:id, PATCH /api/projects/:id, DELETE /api/projects/:id | Membre (lecture et notes) / Admin (CRUD) | Gestion des projets et des notes de projet |
| POST /api/projects/:id/members/:userId, DELETE /api/projects/:id/members/:userId | Admin d'entreprise | Ajout et retrait des membres d'un projet |
| GET /api/projects/:id/tasks, POST /api/projects/:id/tasks | Membre du projet | Liste des tâches du projet et création |
| GET /api/tasks/:id, PATCH /api/tasks/:id, DELETE /api/tasks/:id | Membre du projet | Détail, modification et suppression d'une tâche |
| PATCH /api/tasks/:id/move | Membre du projet | Déplacement d'une carte (statut et position) |
| POST /api/tasks/:id/comments | Membre du projet | Ajout d'un commentaire sur une tâche |
| GET /api/stats | Membre / Admin d'entreprise | Statistiques du tableau de bord |
| GET /api/health | Public | État de l'application et de la base MongoDB |
