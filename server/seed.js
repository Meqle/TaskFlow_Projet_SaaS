const bcrypt = require('bcryptjs');
const config = require('./config');
const Company = require('./models/Company');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const { tenantStorage } = require('./models/tenantPlugin');

async function seedIfEmpty() {
  return tenantStorage.run({ bypassTenant: true }, async () => {
    const count = await Company.countDocuments();
    if (count > 0) {
      return;
    }

    console.log('Initialisation des données de démonstration...');

    const [adminHash, acmeHash, globexHash] = await Promise.all([
      bcrypt.hash(config.adminPassword, 10),
      bcrypt.hash('acme123', 10),
      bcrypt.hash('globex123', 10)
    ]);

    // 1. Compte super-admin plateforme (companyId nul)
    await User.create({
      companyId: null,
      email: config.adminEmail.toLowerCase(),
      passwordHash: adminHash,
      firstName: 'Lukas',
      lastName: 'Admin',
      role: 'super_admin',
      active: true
    });

    // 2. Entreprise 1 : Acme Corp
    const acme = await Company.create({
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'pro'
    });

    const [alice, bob, claire, maxime] = await User.create([
      {
        companyId: acme._id,
        email: 'alice@acme.fr',
        passwordHash: acmeHash,
        firstName: 'Alice',
        lastName: 'Martin',
        role: 'company_admin',
        active: true
      },
      {
        companyId: acme._id,
        email: 'bob@acme.fr',
        passwordHash: acmeHash,
        firstName: 'Bob',
        lastName: 'Dupont',
        role: 'member',
        active: true
      },
      {
        companyId: acme._id,
        email: 'claire@acme.fr',
        passwordHash: acmeHash,
        firstName: 'Claire',
        lastName: 'Moreau',
        role: 'member',
        active: true
      },
      {
        companyId: acme._id,
        email: 'maxime@acme.fr',
        passwordHash: acmeHash,
        firstName: 'Maxime',
        lastName: 'Laurent',
        role: 'member',
        active: true
      }
    ]);

    const [projSite, projMobile, projApi] = await Project.create([
      {
        companyId: acme._id,
        name: 'Refonte du site',
        description: 'Nouveau site vitrine et espace client pour 2027',
        notes: [
          'Objectifs du projet :',
          '- Moderniser la présentation des offres commerciales.',
          '- Réduire le temps de chargement des pages sous 1,5 seconde.',
          '- Mettre en conformité le bandeau de consentement et les mentions légales.',
          '',
          'Points actés en réunion :',
          '- La maquette desktop a été validée par Alice et Claire.',
          '- Les tests sur environnement de pré-production commenceront dès que le serveur de staging sera prêt.'
        ].join('\n'),
        members: [alice._id, bob._id, claire._id, maxime._id],
        status: 'active',
        createdBy: alice._id
      },
      {
        companyId: acme._id,
        name: 'Application mobile',
        description: 'Portail client iOS et Android',
        notes: [
          'Périmètre de la version 1.0 :',
          '- Authentification par e-mail et conservation de la session.',
          '- Consultation de l’historique des commandes et téléchargement des factures PDF.',
          '- Notifications lors du changement de statut d’un dossier.'
        ].join('\n'),
        members: [alice._id, bob._id, maxime._id],
        status: 'active',
        createdBy: alice._id
      },
      {
        companyId: acme._id,
        name: 'API Partenaires B2B',
        description: 'Interface REST pour la synchronisation des catalogues fournisseurs',
        notes: [
          'Spécifications techniques :',
          '- Authentification par jeton et limitation du débit par partenaire.',
          '- Documentation OpenAPI fournie aux intégrateurs externes.'
        ].join('\n'),
        members: [alice._id, bob._id],
        status: 'active',
        createdBy: alice._id
      }
    ]);

    await Task.create([
      // Projet 1 : Refonte du site (7 tâches)
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Validation de la charte graphique',
        description: 'Définir la typographie, la palette de couleurs et les composants de base.',
        status: 'done',
        position: 0,
        priority: 'medium',
        labels: ['Design', 'UI'],
        checklist: [
          { text: 'Choisir la police principale', done: true },
          { text: 'Définir les contrastes d’accessibilité', done: true },
          { text: 'Exporter la bibliothèque de composants', done: true }
        ],
        assigneeId: claire._id,
        dueDate: new Date(Date.now() - 5 * 86400000),
        comments: [
          {
            authorId: alice._id,
            text: 'Charte validée en réunion lundi matin.',
            createdAt: new Date(Date.now() - 4 * 86400000)
          }
        ]
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Architecture des routes et navigation',
        description: 'Structurer l’arborescence des pages publiques et de l’espace client.',
        status: 'done',
        position: 1,
        priority: 'low',
        labels: ['Frontend'],
        checklist: [
          { text: 'Plan du site validé', done: true },
          { text: 'Redirections des anciennes URL', done: true }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() - 3 * 86400000),
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: "Maquette de la page d'accueil",
        description: 'Version mobile et desktop avec présentation des trois offres.',
        status: 'in_progress',
        position: 0,
        priority: 'high',
        labels: ['Design', 'Prioritaire'],
        checklist: [
          { text: 'Bannière principale et appel à l’action', done: true },
          { text: 'Section témoignages clients', done: true },
          { text: 'Adaptation responsive mobile', done: false }
        ],
        assigneeId: claire._id,
        dueDate: new Date(Date.now() + 4 * 86400000),
        comments: [
          {
            authorId: alice._id,
            text: 'Penser à bien mettre en avant le formulaire de contact.',
            createdAt: new Date(Date.now() - 3600000)
          },
          {
            authorId: claire._id,
            text: 'C’est noté, j’ajoute un bouton d’accès rapide dans l’en-tête.',
            createdAt: new Date(Date.now() - 1800000)
          }
        ]
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Développement du formulaire de demande de devis',
        description: 'Validation des champs côté client et envoi vers le service commercial.',
        status: 'in_progress',
        position: 1,
        priority: 'medium',
        labels: ['Frontend', 'Backend'],
        checklist: [
          { text: 'Découpage du formulaire en 3 étapes', done: true },
          { text: 'Vérification du numéro SIRET', done: false },
          { text: 'Enregistrement en base de données', done: false }
        ],
        assigneeId: maxime._id,
        dueDate: new Date(Date.now() + 6 * 86400000),
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Intégration de la grille tarifaire',
        description: 'Tableau comparatif des offres Free, Pro et Enterprise.',
        status: 'review',
        position: 0,
        priority: 'medium',
        labels: ['Frontend'],
        checklist: [
          { text: 'Affichage mensuel / annuel', done: true },
          { text: ' Infobulles sur les fonctionnalités incluses', done: true }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() + 2 * 86400000),
        comments: [
          {
            authorId: bob._id,
            text: 'Prêt pour relecture sur la branche principale.',
            createdAt: new Date(Date.now() - 7200000)
          }
        ]
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Configuration du serveur de staging',
        description: 'Mise en place des conteneurs Docker pour la validation interne.',
        status: 'todo',
        position: 0,
        priority: 'high',
        labels: ['Infra', 'Docker'],
        checklist: [
          { text: 'Préparer le fichier compose.yml', done: true },
          { text: 'Configurer le certificat SSL interne', done: false }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() - 86400000), // En retard
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projSite._id,
        title: 'Rédaction des mentions légales et politique RGPD',
        description: 'Mise à jour des textes réglementaires avec le cabinet juridique.',
        status: 'todo',
        position: 1,
        priority: 'low',
        labels: ['Juridique'],
        checklist: [
          { text: 'Lister les sous-traitants hébergeurs', done: false },
          { text: 'Préciser la durée de conservation des comptes', done: false }
        ],
        assigneeId: alice._id,
        dueDate: new Date(Date.now() + 10 * 86400000),
        comments: []
      },

      // Projet 2 : Application mobile (3 tâches)
      {
        companyId: acme._id,
        projectId: projMobile._id,
        title: 'Écran de connexion utilisateur',
        description: 'Formulaire e-mail / mot de passe et gestion des messages d’erreur.',
        status: 'in_progress',
        position: 0,
        priority: 'high',
        labels: ['Mobile', 'Auth'],
        checklist: [
          { text: 'Validation du format d’adresse e-mail', done: true },
          { text: ' Stockage sécurisé du jeton de session', done: false }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() + 5 * 86400000),
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projMobile._id,
        title: 'Vue récapitulative des commandes',
        description: 'Liste paginée avec filtre par statut de livraison.',
        status: 'todo',
        position: 0,
        priority: 'medium',
        labels: ['Mobile'],
        checklist: [],
        assigneeId: maxime._id,
        dueDate: new Date(Date.now() + 12 * 86400000),
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projMobile._id,
        title: 'Initialisation du dépôt et configuration CI',
        description: 'Compilation automatique de l’application à chaque commit.',
        status: 'done',
        position: 0,
        priority: 'low',
        labels: ['Infra'],
        checklist: [
          { text: 'Script de build Android', done: true },
          { text: 'Vérification du linter', done: true }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() - 6 * 86400000),
        comments: []
      },

      // Projet 3 : API Partenaires B2B (2 tâches)
      {
        companyId: acme._id,
        projectId: projApi._id,
        title: 'Définition du schéma JSON des catalogues produits',
        description: 'Normalisation des références, tarifs HT et stocks disponibles.',
        status: 'review',
        position: 0,
        priority: 'high',
        labels: ['API', 'Backend'],
        checklist: [
          { text: 'Valider les champs obligatoires', done: true },
          { text: 'Rédiger un exemple de payload JSON', done: true }
        ],
        assigneeId: bob._id,
        dueDate: new Date(Date.now() + 3 * 86400000),
        comments: []
      },
      {
        companyId: acme._id,
        projectId: projApi._id,
        title: 'Tests d’isolation entre comptes partenaires',
        description: 'Vérifier qu’un partenaire ne peut lire que son propre catalogue.',
        status: 'todo',
        position: 0,
        priority: 'high',
        labels: ['Sécurité', 'API'],
        checklist: [],
        assigneeId: alice._id,
        dueDate: new Date(Date.now() + 8 * 86400000),
        comments: []
      }
    ]);

    // 3. Entreprise 2 : Globex
    const globex = await Company.create({
      name: 'Globex',
      slug: 'globex',
      plan: 'free'
    });

    const [david, emma, thomas] = await User.create([
      {
        companyId: globex._id,
        email: 'david@globex.fr',
        passwordHash: globexHash,
        firstName: 'David',
        lastName: 'Bernard',
        role: 'company_admin',
        active: true
      },
      {
        companyId: globex._id,
        email: 'emma@globex.fr',
        passwordHash: globexHash,
        firstName: 'Emma',
        lastName: 'Petit',
        role: 'member',
        active: true
      },
      {
        companyId: globex._id,
        email: 'thomas@globex.fr',
        passwordHash: globexHash,
        firstName: 'Thomas',
        lastName: 'Richard',
        role: 'member',
        active: true
      }
    ]);

    const [projErp, projLogistique] = await Project.create([
      {
        companyId: globex._id,
        name: 'Migration ERP',
        description: 'Bascule des données de facturation vers le nouveau serveur',
        notes: [
          'Planning de bascule :',
          '- Gel des saisies comptables le vendredi à 18h.',
          '- Exécution des scripts de migration le samedi matin.',
          '- Vérification des balances par Emma et David avant réouverture.'
        ].join('\n'),
        members: [david._id, emma._id, thomas._id],
        status: 'active',
        createdBy: david._id
      },
      {
        companyId: globex._id,
        name: 'Suivi des stocks entrepôt Nord',
        description: 'Inventaire informatisé et étiquetage code-barres',
        notes: 'Déploiement prévu sur les trois quais de chargement.',
        members: [david._id, thomas._id],
        status: 'active',
        createdBy: david._id
      }
    ]);

    await Task.create([
      {
        companyId: globex._id,
        projectId: projErp._id,
        title: 'Export des écritures comptables 2025',
        description: 'Vérifier la cohérence des fichiers CSV exportés depuis l’ancien logiciel.',
        status: 'done',
        position: 0,
        priority: 'high',
        labels: ['Comptabilité', 'Données'],
        checklist: [
          { text: 'Extraction du grand livre', done: true },
          { text: 'Contrôle des totaux débit / crédit', done: true }
        ],
        assigneeId: emma._id,
        dueDate: new Date(Date.now() - 2 * 86400000),
        comments: []
      },
      {
        companyId: globex._id,
        projectId: projErp._id,
        title: 'Import des fiches fournisseurs',
        description: 'Script de reprise des coordonnées bancaires et comptes tiers.',
        status: 'in_progress',
        position: 0,
        priority: 'medium',
        labels: ['Données'],
        checklist: [
          { text: 'Nettoyage des doublons', done: true },
          { text: 'Import sur la base de test', done: false }
        ],
        assigneeId: david._id,
        dueDate: new Date(Date.now() + 4 * 86400000),
        comments: []
      },
      {
        companyId: globex._id,
        projectId: projErp._id,
        title: 'Paramétrage des taux de TVA',
        description: 'Configurer les règles de calcul par famille de produits.',
        status: 'review',
        position: 0,
        priority: 'medium',
        labels: ['Comptabilité'],
        checklist: [],
        assigneeId: emma._id,
        dueDate: new Date(Date.now() + 2 * 86400000),
        comments: []
      },
      {
        companyId: globex._id,
        projectId: projErp._id,
        title: 'Recette avec le service comptabilité',
        description: 'Tests complets sur un échantillon de 50 factures clients.',
        status: 'todo',
        position: 0,
        priority: 'high',
        labels: ['Recette'],
        checklist: [
          { text: 'Préparer le cahier de tests', done: false },
          { text: 'Valider l’édition PDF des factures', done: false }
        ],
        assigneeId: thomas._id,
        dueDate: new Date(Date.now() + 9 * 86400000),
        comments: []
      },
      {
        companyId: globex._id,
        projectId: projLogistique._id,
        title: 'Commande des lecteurs codes-barres',
        description: 'Validation du devis pour 10 terminaux portables.',
        status: 'done',
        position: 0,
        priority: 'medium',
        labels: ['Matériel'],
        checklist: [],
        assigneeId: david._id,
        dueDate: new Date(Date.now() - 4 * 86400000),
        comments: []
      },
      {
        companyId: globex._id,
        projectId: projLogistique._id,
        title: 'Étiquetage des travées de stockage',
        description: 'Pose des étiquettes sur les zones A, B et C de l’entrepôt.',
        status: 'in_progress',
        position: 0,
        priority: 'low',
        labels: ['Terrain'],
        checklist: [
          { text: 'Zone A terminée', done: true },
          { text: 'Zone B en cours', done: false },
          { text: 'Zone C à planifier', done: false }
        ],
        assigneeId: thomas._id,
        dueDate: new Date(Date.now() + 6 * 86400000),
        comments: []
      }
    ]);

    console.log('Données de démonstration créées (super-admin, Acme Corp, Globex).');
  });
}

module.exports = { seedIfEmpty };
