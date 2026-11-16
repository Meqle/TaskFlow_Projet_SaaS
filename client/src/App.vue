<template>
  <!-- Écran de connexion -->
  <div v-if="!user" class="login-wrapper">
    <div class="login-card">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 18px; font-weight: 600; color: #0f172a;">TaskFlow</h1>
        <p style="font-size: 13px; color: #64748b; margin-top: 2px;">
          Connexion à votre espace de gestion de projets
        </p>
      </div>

      <div v-if="authError" class="alert-error">{{ authError }}</div>

      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>Adresse e-mail</label>
          <input v-model="loginForm.email" type="email" class="input" required placeholder="nom@entreprise.fr" />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input v-model="loginForm.password" type="password" class="input" required placeholder="••••••••" />
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 4px;" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>

    <div class="login-help">
      <div style="font-weight: 600; color: #334155; margin-bottom: 6px;">Comptes de démonstration (clic pour remplir) :</div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <a href="#" @click.prevent="fillLogin('admin@taskflow.local', 'admin123')" style="color: #2563eb; text-decoration: none;">
          Super-admin plateforme : admin@taskflow.local / admin123
        </a>
        <a href="#" @click.prevent="fillLogin('alice@acme.fr', 'acme123')" style="color: #2563eb; text-decoration: none;">
          Acme Corp (Admin) : alice@acme.fr / acme123
        </a>
        <a href="#" @click.prevent="fillLogin('bob@acme.fr', 'acme123')" style="color: #2563eb; text-decoration: none;">
          Acme Corp (Membre) : bob@acme.fr / acme123
        </a>
        <a href="#" @click.prevent="fillLogin('david@globex.fr', 'globex123')" style="color: #2563eb; text-decoration: none;">
          Globex (Admin) : david@globex.fr / globex123
        </a>
      </div>
    </div>
  </div>

  <!-- Application principale -->
  <div v-else>
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">
          <span>TaskFlow</span>
          <span class="tenant-tag">
            {{ user.role === 'super_admin' ? 'Administration Plateforme' : (company?.name || 'Entreprise') }}
          </span>
        </div>

        <!-- Onglets Super-Admin -->
        <nav v-if="user.role === 'super_admin'" class="nav-tabs">
          <button class="nav-tab" :class="{ active: activeTab === 'companies' }" @click="switchTab('companies')">
            Entreprises
          </button>
          <button class="nav-tab" :class="{ active: activeTab === 'users' }" @click="switchTab('users')">
            Utilisateurs
          </button>
        </nav>

        <!-- Onglets Entreprise (Admin / Membre) -->
        <nav v-else class="nav-tabs">
          <button class="nav-tab" :class="{ active: activeTab === 'kanban' }" @click="switchTab('kanban')">
            Projets & Tâches
          </button>
          <button class="nav-tab" :class="{ active: activeTab === 'dashboard' }" @click="switchTab('dashboard')">
            Tableau de bord
          </button>
          <button v-if="user.role === 'company_admin'" class="nav-tab" :class="{ active: activeTab === 'users' }" @click="switchTab('users')">
            Utilisateurs
          </button>
          <button v-if="user.role === 'company_admin'" class="nav-tab" :class="{ active: activeTab === 'company_settings' }" @click="switchTab('company_settings')">
            Entreprise
          </button>
        </nav>
      </div>

      <div class="topbar-right">
        <span style="color: #475569;">
          <strong>{{ user.firstName }} {{ user.lastName }}</strong>
          <span style="color: #94a3b8; font-size: 12px; margin-left: 6px;">({{ formatRole(user.role) }})</span>
        </span>
        <button class="btn btn-sm" @click="openProfileModal">Mon profil</button>
        <button class="btn btn-sm" @click="handleLogout">Déconnexion</button>
      </div>
    </header>

    <!-- ================================================================= -->
    <!-- VUE SUPER-ADMIN : GESTION DES ENTREPRISES                         -->
    <!-- ================================================================= -->
    <div v-if="user.role === 'super_admin' && activeTab === 'companies'" class="content-area" style="max-width: 1100px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <div>
          <h2 style="font-size: 16px; font-weight: 600;">Entreprises clientes</h2>
          <p style="font-size: 13px; color: #64748b;">Création, modification et suppression en cascade des entreprises.</p>
        </div>
        <button class="btn btn-primary" @click="openCompanyModal()">Nouvelle entreprise</button>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Identifiant (slug)</th>
              <th>Offre</th>
              <th>Utilisateurs</th>
              <th>Projets</th>
              <th>Tâches</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in companies" :key="c._id">
              <td style="font-weight: 500;">{{ c.name }}</td>
              <td><code>{{ c.slug }}</code></td>
              <td style="text-transform: uppercase; font-size: 12px; color: #475569;">{{ c.plan }}</td>
              <td>{{ c.usersCount ?? 0 }}</td>
              <td>{{ c.projectsCount ?? 0 }}</td>
              <td>{{ c.tasksCount ?? 0 }}</td>
              <td style="text-align: right;">
                <button class="btn btn-sm" style="margin-right: 6px;" @click="openCompanyModal(c)">Modifier</button>
                <button class="btn btn-sm btn-danger" @click="deleteCompany(c)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="companies.length === 0">
              <td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">Aucune entreprise enregistrée.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- VUE PROJETS, KANBAN, LISTE & NOTES (ENTREPRISE)                   -->
    <!-- ================================================================= -->
    <div v-if="user.role !== 'super_admin' && activeTab === 'kanban'" class="main-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>Projets</span>
          <button v-if="user.role === 'company_admin'" class="btn btn-sm" @click="openProjectModal()">+ Créer</button>
        </div>

        <div v-if="projects.length === 0" style="font-size: 12px; color: #64748b; padding: 8px 6px;">
          Aucun projet disponible.
        </div>

        <button
          v-for="p in projects"
          :key="p._id"
          class="project-item"
          :class="{ active: currentProject && currentProject._id === p._id }"
          @click="selectProject(p)"
        >
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ p.name }}</span>
          <span v-if="p.status === 'archived'" style="font-size: 10px; color: #94a3b8;">Archivé</span>
        </button>
      </aside>

      <main class="content-area">
        <div v-if="!currentProject" style="padding: 40px 0; text-align: center; color: #64748b;">
          Sélectionnez ou créez un projet pour afficher ses tâches.
        </div>

        <div v-else>
          <div class="kanban-header">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="font-size: 17px; font-weight: 600;">{{ currentProject.name }}</h2>
                <span v-if="currentProject.status === 'archived'" class="badge badge-low">Archivé</span>
              </div>
              <p style="font-size: 13px; color: #64748b; margin-top: 2px;">
                {{ currentProject.description || 'Aucune description' }}
                — Membres : {{ (currentProject.members || []).map(m => m.firstName + ' ' + m.lastName).join(', ') || 'Aucun' }}
              </p>

              <!-- Sélecteur de vue (Kanban / Liste / Notes du projet façon Notion & ClickUp) -->
              <div style="display: flex; gap: 6px; margin-top: 12px;">
                <button
                  class="btn btn-sm"
                  :class="{ 'btn-primary': projectViewMode === 'kanban' }"
                  @click="switchProjectView('kanban')"
                >
                  Tableau Kanban
                </button>
                <button
                  class="btn btn-sm"
                  :class="{ 'btn-primary': projectViewMode === 'list' }"
                  @click="switchProjectView('list')"
                >
                  Vue Liste
                </button>
                <button
                  class="btn btn-sm"
                  :class="{ 'btn-primary': projectViewMode === 'notes' }"
                  @click="switchProjectView('notes')"
                >
                  Notes du projet
                </button>
              </div>
            </div>

            <div v-if="projectViewMode !== 'notes'" class="kanban-filters">
              <input
                v-model="filters.search"
                type="text"
                class="input"
                style="width: 170px;"
                placeholder="Rechercher..."
              />

              <select v-model="filters.assigneeId" class="select" style="width: auto;">
                <option value="">Tous les assignés</option>
                <option :value="user._id">Mes tâches uniquement</option>
                <option value="unassigned">Non attribuées</option>
                <option v-for="m in currentProject.members" :key="m._id" :value="m._id">
                  {{ m.firstName }} {{ m.lastName }}
                </option>
              </select>

              <select v-model="filters.priority" class="select" style="width: auto;">
                <option value="">Toutes les priorités</option>
                <option value="high">Priorité haute</option>
                <option value="medium">Priorité moyenne</option>
                <option value="low">Priorité basse</option>
              </select>

              <button v-if="user.role === 'company_admin'" class="btn" @click="openProjectModal(currentProject)">
                Gérer le projet
              </button>
              <button class="btn btn-primary" @click="openTaskModal()">
                Nouvelle tâche
              </button>
            </div>
          </div>

          <!-- MODE 1 : GRILLE KANBAN 4 COLONNES -->
          <div v-if="projectViewMode === 'kanban'" class="kanban-grid">
            <div v-for="col in columns" :key="col.key" class="kanban-col">
              <div class="kanban-col-header">
                <span>{{ col.label }}</span>
                <span>{{ tasksByColumn(col.key).length }}</span>
              </div>

              <div
                class="kanban-list"
                :data-status="col.key"
                :ref="el => setColumnRef(col.key, el)"
              >
                <div
                  v-for="t in tasksByColumn(col.key)"
                  :key="t._id"
                  :data-id="t._id"
                  class="kanban-card"
                  @click="openTaskModal(t)"
                >
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 500; color: #0f172a; line-height: 1.35;">{{ t.title }}</span>
                    <span class="badge" :class="'badge-' + t.priority">{{ formatPriority(t.priority) }}</span>
                  </div>

                  <p v-if="t.description" style="font-size: 12px; color: #64748b; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    {{ t.description }}
                  </p>

                  <!-- Étiquettes (Labels) -->
                  <div v-if="t.labels && t.labels.length > 0" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
                    <span
                      v-for="lbl in t.labels"
                      :key="lbl"
                      style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"
                    >
                      {{ lbl }}
                    </span>
                  </div>

                  <!-- Avancement Checklist (Sous-tâches) -->
                  <div v-if="t.checklist && t.checklist.length > 0" style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 3px;">
                      <span>Sous-tâches</span>
                      <span>{{ checklistDoneCount(t) }}/{{ t.checklist.length }}</span>
                    </div>
                    <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                      <div
                        style="height: 100%; background: #475569;"
                        :style="{ width: Math.round((checklistDoneCount(t) / t.checklist.length) * 100) + '%' }"
                      ></div>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                    <span>
                      {{ t.assigneeId ? (t.assigneeId.firstName + ' ' + t.assigneeId.lastName) : 'Non attribuée' }}
                    </span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span v-if="t.dueDate" :class="{ 'badge badge-overdue': isOverdue(t) }">
                        {{ formatDate(t.dueDate) }}
                      </span>
                      <span v-if="t.comments && t.comments.length > 0" style="font-size: 11px; color: #64748b;">
                        {{ t.comments.length }} comm.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- MODE 2 : VUE LISTE TABULAIRE (FAÇON CLICKUP / NOTION) -->
          <div v-else-if="projectViewMode === 'list'" class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Étiquettes</th>
                  <th>Sous-tâches</th>
                  <th>Assigné</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in tasks"
                  :key="t._id"
                  style="cursor: pointer;"
                  @click="openTaskModal(t)"
                >
                  <td style="font-weight: 500;">{{ t.title }}</td>
                  <td>{{ formatStatus(t.status) }}</td>
                  <td><span class="badge" :class="'badge-' + t.priority">{{ formatPriority(t.priority) }}</span></td>
                  <td>{{ (t.labels || []).join(', ') || '-' }}</td>
                  <td>{{ t.checklist && t.checklist.length ? `${checklistDoneCount(t)}/${t.checklist.length}` : '-' }}</td>
                  <td>{{ t.assigneeId ? (t.assigneeId.firstName + ' ' + t.assigneeId.lastName) : 'Non attribuée' }}</td>
                  <td>
                    <span v-if="t.dueDate" :class="{ 'badge badge-overdue': isOverdue(t) }">
                      {{ formatDate(t.dueDate) }}
                    </span>
                    <span v-else>-</span>
                  </td>
                </tr>
                <tr v-if="tasks.length === 0">
                  <td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">Aucune tâche pour ces critères.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MODE 3 : NOTES & DOCUMENTATION DU PROJET (FAÇON NOTION) -->
          <div v-else-if="projectViewMode === 'notes'" class="table-card" style="padding: 20px; max-width: 860px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <h3 style="font-size: 15px; font-weight: 600;">Documentation et notes du projet</h3>
                <p style="font-size: 12px; color: #64748b;">
                  Espace de prise de notes partagé entre les membres du projet {{ currentProject.name }}.
                </p>
              </div>
              <button class="btn btn-primary" @click="saveProjectNotes">Enregistrer les notes</button>
            </div>
            <textarea
              v-model="projectNotesText"
              rows="14"
              class="textarea"
              style="font-size: 13px; line-height: 1.6;"
              placeholder="Rédigez ici le cahier des charges, les comptes-rendus de réunion ou les consignes du projet..."
            ></textarea>
          </div>
        </div>
      </main>
    </div>

    <!-- ================================================================= -->
    <!-- VUE TABLEAU DE BORD D'ENTREPRISE                                  -->
    <!-- ================================================================= -->
    <div v-if="user.role !== 'super_admin' && activeTab === 'dashboard'" class="content-area" style="max-width: 1100px; margin: 0 auto;">
      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 16px; font-weight: 600;">Tableau de bord — {{ company?.name }}</h2>
        <p style="font-size: 13px; color: #64748b;">Synthèse de l'avancement des tâches de l'entreprise.</p>
      </div>

      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Projets</div>
          <div class="stat-value">{{ stats.projectsCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Utilisateurs</div>
          <div class="stat-value">{{ stats.usersCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">À faire</div>
          <div class="stat-value">{{ stats.byStatus?.todo || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En cours</div>
          <div class="stat-value">{{ stats.byStatus?.in_progress || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En revue</div>
          <div class="stat-value">{{ stats.byStatus?.review || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Terminé</div>
          <div class="stat-value">{{ stats.byStatus?.done || 0 }}</div>
        </div>
      </div>

      <div v-if="stats" class="table-card">
        <div style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px;">
          Tâches en retard ({{ stats.overdueCount || 0 }})
        </div>
        <table>
          <thead>
            <tr>
              <th>Tâche</th>
              <th>Projet</th>
              <th>Assigné</th>
              <th>Statut</th>
              <th>Échéance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in stats.overdueTasks" :key="t._id">
              <td style="font-weight: 500;">{{ t.title }}</td>
              <td>{{ t.projectId?.name || '-' }}</td>
              <td>{{ t.assigneeId ? (t.assigneeId.firstName + ' ' + t.assigneeId.lastName) : 'Non attribuée' }}</td>
              <td>{{ formatStatus(t.status) }}</td>
              <td style="color: #dc2626; font-weight: 500;">{{ formatDate(t.dueDate) }}</td>
            </tr>
            <tr v-if="!stats.overdueTasks || stats.overdueTasks.length === 0">
              <td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">Aucune tâche en retard.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- VUE UTILISATEURS (COMPANY_ADMIN OU SUPER_ADMIN)                   -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'users'" class="content-area" style="max-width: 1100px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <div>
          <h2 style="font-size: 16px; font-weight: 600;">Gestion des utilisateurs</h2>
          <p style="font-size: 13px; color: #64748b;">
            {{ user.role === 'super_admin' ? 'Tous les comptes de la plateforme' : `Collaborateurs rattachés à ${company?.name}` }}
          </p>
        </div>
        <button class="btn btn-primary" @click="openUserModal()">Nouvel utilisateur</button>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom complet</th>
              <th>Adresse e-mail</th>
              <th>Rôle</th>
              <th>État</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u._id">
              <td style="font-weight: 500;">{{ u.firstName }} {{ u.lastName }}</td>
              <td>{{ u.email }}</td>
              <td>{{ formatRole(u.role) }}</td>
              <td>
                <span class="badge" :class="u.active ? 'badge-low' : 'badge-high'">
                  {{ u.active ? 'Actif' : 'Désactivé' }}
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-sm" style="margin-right: 6px;" @click="openUserModal(u)">Modifier</button>
                <button v-if="u._id !== user._id" class="btn btn-sm btn-danger" @click="deleteUser(u)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- VUE PARAMÈTRES DE L'ENTREPRISE (COMPANY_ADMIN)                    -->
    <!-- ================================================================= -->
    <div v-if="user.role === 'company_admin' && activeTab === 'company_settings'" class="content-area" style="max-width: 640px; margin: 0 auto;">
      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 16px; font-weight: 600;">Paramètres de l'entreprise</h2>
        <p style="font-size: 13px; color: #64748b;">Modification des informations de votre entreprise.</p>
      </div>

      <div class="table-card" style="padding: 20px;">
        <form @submit.prevent="saveOwnCompany">
          <div class="field">
            <label>Nom de l'entreprise</label>
            <input v-model="ownCompanyForm.name" class="input" required />
          </div>
          <div class="field">
            <label>Identifiant (slug)</label>
            <input v-model="ownCompanyForm.slug" class="input" required />
          </div>
          <div class="field">
            <label>Offre</label>
            <select v-model="ownCompanyForm.plan" class="select">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODALE ENTREPRISE (SUPER-ADMIN)                                   -->
    <!-- ================================================================= -->
    <div v-if="companyModal.open" class="modal-backdrop" @click.self="companyModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ companyModal.isEdit ? "Modifier l'entreprise" : 'Nouvelle entreprise' }}</span>
          <button class="btn btn-sm" @click="companyModal.open = false">Fermer</button>
        </div>
        <div v-if="modalError" class="alert-error">{{ modalError }}</div>
        <form @submit.prevent="saveCompany">
          <div class="field">
            <label>Nom de l'entreprise *</label>
            <input v-model="companyModal.form.name" class="input" required />
          </div>
          <div class="field">
            <label>Slug (identifiant unique)</label>
            <input v-model="companyModal.form.slug" class="input" placeholder="ex: acme" />
          </div>
          <div class="field">
            <label>Offre</label>
            <select v-model="companyModal.form.plan" class="select">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <template v-if="!companyModal.isEdit">
            <div style="margin: 16px 0 10px; font-weight: 600; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              Compte administrateur initial de l'entreprise (optionnel)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="field">
                <label>Prénom</label>
                <input v-model="companyModal.form.adminFirstName" class="input" />
              </div>
              <div class="field">
                <label>Nom</label>
                <input v-model="companyModal.form.adminLastName" class="input" />
              </div>
            </div>
            <div class="field">
              <label>E-mail de l'administrateur</label>
              <input v-model="companyModal.form.adminEmail" type="email" class="input" />
            </div>
            <div class="field">
              <label>Mot de passe initial</label>
              <input v-model="companyModal.form.adminPassword" type="password" class="input" />
            </div>
          </template>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="btn" @click="companyModal.open = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODALE UTILISATEUR                                                -->
    <!-- ================================================================= -->
    <div v-if="userModal.open" class="modal-backdrop" @click.self="userModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ userModal.isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur' }}</span>
          <button class="btn btn-sm" @click="userModal.open = false">Fermer</button>
        </div>
        <div v-if="modalError" class="alert-error">{{ modalError }}</div>
        <form @submit.prevent="saveUser">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="field">
              <label>Prénom *</label>
              <input v-model="userModal.form.firstName" class="input" required />
            </div>
            <div class="field">
              <label>Nom *</label>
              <input v-model="userModal.form.lastName" class="input" required />
            </div>
          </div>
          <div class="field">
            <label>Adresse e-mail *</label>
            <input v-model="userModal.form.email" type="email" class="input" required />
          </div>
          <div class="field">
            <label>Mot de passe {{ userModal.isEdit ? '(laisser vide pour conserver)' : '*' }}</label>
            <input v-model="userModal.form.password" type="password" class="input" :required="!userModal.isEdit" />
          </div>
          <div v-if="user.role === 'super_admin' && !userModal.isEdit" class="field">
            <label>Entreprise</label>
            <select v-model="userModal.form.companyId" class="select" required>
              <option v-for="c in companies" :key="c._id" :value="c._id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Rôle</label>
            <select v-model="userModal.form.role" class="select">
              <option value="member">Membre</option>
              <option value="company_admin">Admin d'entreprise</option>
            </select>
          </div>
          <div v-if="userModal.isEdit && userModal.form._id !== user._id" class="field">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" v-model="userModal.form.active" />
              Compte actif
            </label>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="btn" @click="userModal.open = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODALE MON PROFIL                                                 -->
    <!-- ================================================================= -->
    <div v-if="profileModal.open" class="modal-backdrop" @click.self="profileModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Mon profil</span>
          <button class="btn btn-sm" @click="profileModal.open = false">Fermer</button>
        </div>
        <div v-if="modalError" class="alert-error">{{ modalError }}</div>
        <form @submit.prevent="saveProfile">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="field">
              <label>Prénom *</label>
              <input v-model="profileModal.form.firstName" class="input" required />
            </div>
            <div class="field">
              <label>Nom *</label>
              <input v-model="profileModal.form.lastName" class="input" required />
            </div>
          </div>
          <div class="field">
            <label>Nouveau mot de passe (optionnel)</label>
            <input v-model="profileModal.form.password" type="password" class="input" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="btn" @click="profileModal.open = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODALE PROJET & MEMBRES                                           -->
    <!-- ================================================================= -->
    <div v-if="projectModal.open" class="modal-backdrop" @click.self="projectModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ projectModal.isEdit ? 'Gérer le projet' : 'Nouveau projet' }}</span>
          <button class="btn btn-sm" @click="projectModal.open = false">Fermer</button>
        </div>
        <div v-if="modalError" class="alert-error">{{ modalError }}</div>
        <form @submit.prevent="saveProject">
          <div class="field">
            <label>Nom du projet *</label>
            <input v-model="projectModal.form.name" class="input" required />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea v-model="projectModal.form.description" rows="2" class="textarea"></textarea>
          </div>
          <div class="field">
            <label>Statut</label>
            <select v-model="projectModal.form.status" class="select">
              <option value="active">Actif</option>
              <option value="archived">Archivé</option>
            </select>
          </div>
          <div class="field">
            <label>Membres assignés au projet</label>
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; max-height: 150px; overflow-y: auto;">
              <label
                v-for="u in users"
                :key="u._id"
                style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 400; cursor: pointer;"
              >
                <input type="checkbox" :value="u._id" v-model="projectModal.form.members" />
                <span>{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</span>
              </label>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
            <button v-if="projectModal.isEdit" type="button" class="btn btn-danger" @click="deleteProject">
              Supprimer le projet
            </button>
            <div style="display: flex; gap: 8px; margin-left: auto;">
              <button type="button" class="btn" @click="projectModal.open = false">Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODALE TÂCHE, CHECKLIST & COMMENTAIRES                            -->
    <!-- ================================================================= -->
    <div v-if="taskModal.open" class="modal-backdrop" @click.self="taskModal.open = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ taskModal.isEdit ? 'Détail de la tâche' : 'Nouvelle tâche' }}</span>
          <button class="btn btn-sm" @click="taskModal.open = false">Fermer</button>
        </div>
        <div v-if="modalError" class="alert-error">{{ modalError }}</div>
        <form @submit.prevent="saveTask">
          <div class="field">
            <label>Titre *</label>
            <input v-model="taskModal.form.title" class="input" required />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea v-model="taskModal.form.description" rows="2" class="textarea"></textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="field">
              <label>Statut</label>
              <select v-model="taskModal.form.status" class="select">
                <option v-for="c in columns" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Priorité</label>
              <select v-model="taskModal.form.priority" class="select">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="field">
              <label>Assigné (membre du projet)</label>
              <select v-model="taskModal.form.assigneeId" class="select">
                <option value="">Non attribuée</option>
                <option v-for="m in (currentProject?.members || [])" :key="m._id" :value="m._id">
                  {{ m.firstName }} {{ m.lastName }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>Date d'échéance</label>
              <input v-model="taskModal.form.dueDate" type="date" class="input" />
            </div>
          </div>

          <div class="field">
            <label>Étiquettes (séparées par des virgules)</label>
            <input v-model="taskModal.form.labelsText" class="input" placeholder="ex: Design, Backend, Prioritaire" />
          </div>

          <!-- Sous-tâches / Checklist -->
          <div class="field">
            <label>Sous-tâches (Checklist)</label>
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc;">
              <div
                v-for="(item, idx) in taskModal.form.checklist"
                :key="idx"
                style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;"
              >
                <label style="display: flex; align-items: center; gap: 8px; margin: 0; font-weight: 400; cursor: pointer; flex: 1;">
                  <input type="checkbox" v-model="item.done" />
                  <span :style="{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? '#94a3b8' : '#0f172a' }">
                    {{ item.text }}
                  </span>
                </label>
                <button type="button" class="btn btn-sm" @click="removeChecklistItem(idx)">Retirer</button>
              </div>
              <div style="display: flex; gap: 6px; margin-top: 6px;">
                <input
                  v-model="taskModal.newChecklistText"
                  class="input"
                  placeholder="Nouvelle sous-tâche..."
                  @keydown.enter.prevent="addChecklistItem"
                />
                <button type="button" class="btn" @click="addChecklistItem">Ajouter</button>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
            <button v-if="taskModal.isEdit" type="button" class="btn btn-danger" @click="deleteTask">
              Supprimer
            </button>
            <div style="display: flex; gap: 8px; margin-left: auto;">
              <button type="button" class="btn" @click="taskModal.open = false">Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </form>

        <!-- Commentaires de la tâche -->
        <div v-if="taskModal.isEdit" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px;">
            Commentaires ({{ (taskModal.comments || []).length }})
          </div>
          <div style="max-height: 150px; overflow-y: auto; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px;">
            <div
              v-for="c in taskModal.comments"
              :key="c._id"
              style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 12px;"
            >
              <div style="display: flex; justify-content: space-between; color: #64748b; margin-bottom: 2px;">
                <strong>{{ c.authorId ? (c.authorId.firstName + ' ' + c.authorId.lastName) : 'Utilisateur' }}</strong>
                <span>{{ formatDate(c.createdAt) }}</span>
              </div>
              <div>{{ c.text }}</div>
            </div>
            <div v-if="!taskModal.comments || taskModal.comments.length === 0" style="font-size: 12px; color: #94a3b8;">
              Aucun commentaire.
            </div>
          </div>

          <form @submit.prevent="addComment" style="display: flex; gap: 8px;">
            <input v-model="taskModal.newComment" class="input" placeholder="Ajouter un commentaire..." />
            <button type="submit" class="btn">Envoyer</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import Sortable from 'sortablejs';
import { api } from './api';

const columns = [
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'review', label: 'En revue' },
  { key: 'done', label: 'Terminé' }
];

const user = ref(null);
const company = ref(null);
const loading = ref(false);
const authError = ref('');
const modalError = ref('');

const activeTab = ref('kanban');
const projectViewMode = ref('kanban');
const projectNotesText = ref('');

const companies = ref([]);
const users = ref([]);
const projects = ref([]);
const currentProject = ref(null);
const tasks = ref([]);
const stats = ref(null);

const loginForm = reactive({ email: '', password: '' });
const filters = reactive({ assigneeId: '', priority: '', search: '' });
const ownCompanyForm = reactive({ name: '', slug: '', plan: 'free' });

const columnRefs = {};
let sortableInstances = [];

function setColumnRef(key, el) {
  if (el) columnRefs[key] = el;
}

const companyModal = reactive({
  open: false,
  isEdit: false,
  id: null,
  form: { name: '', slug: '', plan: 'free', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' }
});

const userModal = reactive({
  open: false,
  isEdit: false,
  form: { _id: null, firstName: '', lastName: '', email: '', password: '', role: 'member', companyId: '', active: true }
});

const profileModal = reactive({
  open: false,
  form: { firstName: '', lastName: '', password: '' }
});

const projectModal = reactive({
  open: false,
  isEdit: false,
  id: null,
  form: { name: '', description: '', status: 'active', members: [] }
});

const taskModal = reactive({
  open: false,
  isEdit: false,
  id: null,
  form: {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    labelsText: '',
    checklist: [],
    assigneeId: '',
    dueDate: ''
  },
  newChecklistText: '',
  comments: [],
  newComment: ''
});

function fillLogin(email, password) {
  loginForm.email = email;
  loginForm.password = password;
}

function formatRole(role) {
  if (role === 'super_admin') return 'Super-admin';
  if (role === 'company_admin') return 'Admin entreprise';
  return 'Membre';
}

function formatPriority(p) {
  if (p === 'high') return 'Haute';
  if (p === 'low') return 'Basse';
  return 'Moyenne';
}

function formatStatus(s) {
  const found = columns.find((c) => c.key === s);
  return found ? found.label : s;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR');
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'done') return false;
  return new Date(task.dueDate) < new Date();
}

function checklistDoneCount(task) {
  return (task.checklist || []).filter((item) => item.done).length;
}

onMounted(async () => {
  try {
    const res = await api('/auth/me');
    user.value = res.user;
    company.value = res.company;
    await initAfterAuth();
  } catch {
    user.value = null;
  }
});

async function handleLogin() {
  loading.value = true;
  authError.value = '';
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginForm)
    });
    user.value = res.user;
    company.value = res.company;
    await initAfterAuth();
  } catch (err) {
    authError.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  user.value = null;
  company.value = null;
  projects.value = [];
  currentProject.value = null;
  tasks.value = [];
}

async function initAfterAuth() {
  if (user.value.role === 'super_admin') {
    activeTab.value = 'companies';
    await Promise.all([loadCompanies(), loadUsers()]);
  } else {
    activeTab.value = 'kanban';
    if (company.value) {
      ownCompanyForm.name = company.value.name;
      ownCompanyForm.slug = company.value.slug;
      ownCompanyForm.plan = company.value.plan;
    }
    await Promise.all([loadProjects(), loadUsers(), loadStats()]);
  }
}

async function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'companies') await loadCompanies();
  if (tab === 'users') await loadUsers();
  if (tab === 'dashboard') await loadStats();
  if (tab === 'kanban' && currentProject.value) {
    await loadTasks(currentProject.value._id);
  }
}

async function switchProjectView(mode) {
  projectViewMode.value = mode;
  if (mode === 'kanban') {
    await nextTick();
    setupSortable();
  }
}

async function loadCompanies() {
  companies.value = await api('/companies');
}

async function loadUsers() {
  users.value = await api('/users');
}

async function loadStats() {
  stats.value = await api('/stats');
}

async function loadProjects() {
  projects.value = await api('/projects');
  if (projects.value.length > 0) {
    const stillExists = currentProject.value && projects.value.find((p) => p._id === currentProject.value._id);
    await selectProject(stillExists || projects.value[0]);
  } else {
    currentProject.value = null;
    tasks.value = [];
  }
}

async function selectProject(project) {
  currentProject.value = project;
  projectNotesText.value = project.notes || '';
  await loadTasks(project._id);
}

async function saveProjectNotes() {
  if (!currentProject.value) return;
  try {
    const updated = await api(`/projects/${currentProject.value._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: projectNotesText.value })
    });
    currentProject.value = updated;
    const idx = projects.value.findIndex((p) => p._id === updated._id);
    if (idx !== -1) projects.value[idx] = updated;
    alert('Notes du projet enregistrées.');
  } catch (err) {
    alert(err.message);
  }
}

async function loadTasks(projectId) {
  const params = new URLSearchParams();
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString() ? `?${params.toString()}` : '';
  tasks.value = await api(`/projects/${projectId}/tasks${qs}`);
  await nextTick();
  if (projectViewMode.value === 'kanban') {
    setupSortable();
  }
}

watch(
  () => [filters.assigneeId, filters.priority, filters.search],
  () => {
    if (currentProject.value) {
      loadTasks(currentProject.value._id);
    }
  }
);

function tasksByColumn(statusKey) {
  return tasks.value
    .filter((t) => t.status === statusKey)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function setupSortable() {
  sortableInstances.forEach((inst) => inst.destroy());
  sortableInstances = [];

  columns.forEach((col) => {
    const el = columnRefs[col.key];
    if (!el) return;
    const instance = Sortable.create(el, {
      group: 'kanban',
      animation: 150,
      ghostClass: 'sortable-ghost',
      onEnd: async (evt) => {
        const taskId = evt.item?.dataset?.id;
        const targetStatus = evt.to?.dataset?.status;
        const newIndex = evt.newIndex ?? 0;
        if (!taskId || !targetStatus) return;

        try {
          await api(`/tasks/${taskId}/move`, {
            method: 'PATCH',
            body: JSON.stringify({ status: targetStatus, position: newIndex })
          });
          await loadTasks(currentProject.value._id);
        } catch (err) {
          alert(err.message);
          await loadTasks(currentProject.value._id);
        }
      }
    });
    sortableInstances.push(instance);
  });
}

// Actions Entreprises
function openCompanyModal(comp = null) {
  modalError.value = '';
  companyModal.isEdit = !!comp;
  companyModal.id = comp ? comp._id : null;
  companyModal.form = {
    name: comp ? comp.name : '',
    slug: comp ? comp.slug : '',
    plan: comp ? comp.plan : 'free',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: ''
  };
  companyModal.open = true;
}

async function saveCompany() {
  modalError.value = '';
  try {
    if (companyModal.isEdit) {
      await api(`/companies/${companyModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyModal.form.name,
          slug: companyModal.form.slug,
          plan: companyModal.form.plan
        })
      });
    } else {
      await api('/companies', {
        method: 'POST',
        body: JSON.stringify(companyModal.form)
      });
    }
    companyModal.open = false;
    await loadCompanies();
  } catch (err) {
    modalError.value = err.message;
  }
}

async function deleteCompany(comp) {
  if (!confirm(`Confirmer la suppression de "${comp.name}" et de tous ses projets, tâches et utilisateurs ?`)) {
    return;
  }
  await api(`/companies/${comp._id}`, { method: 'DELETE' });
  await loadCompanies();
}

async function saveOwnCompany() {
  try {
    const updated = await api(`/companies/${company.value._id}`, {
      method: 'PATCH',
      body: JSON.stringify(ownCompanyForm)
    });
    company.value = updated;
    alert('Informations enregistrées.');
  } catch (err) {
    alert(err.message);
  }
}

// Actions Utilisateurs
function openUserModal(u = null) {
  modalError.value = '';
  userModal.isEdit = !!u;
  userModal.form = {
    _id: u ? u._id : null,
    firstName: u ? u.firstName : '',
    lastName: u ? u.lastName : '',
    email: u ? u.email : '',
    password: '',
    role: u ? u.role : 'member',
    companyId: u ? u.companyId : (companies.value[0]?._id || ''),
    active: u ? u.active : true
  };
  userModal.open = true;
}

async function saveUser() {
  modalError.value = '';
  try {
    if (userModal.isEdit) {
      await api(`/users/${userModal.form._id}`, {
        method: 'PATCH',
        body: JSON.stringify(userModal.form)
      });
    } else {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(userModal.form)
      });
    }
    userModal.open = false;
    await loadUsers();
  } catch (err) {
    modalError.value = err.message;
  }
}

async function deleteUser(u) {
  if (!confirm(`Supprimer l'utilisateur ${u.firstName} ${u.lastName} ?`)) return;
  await api(`/users/${u._id}`, { method: 'DELETE' });
  await loadUsers();
}

function openProfileModal() {
  modalError.value = '';
  profileModal.form = {
    firstName: user.value.firstName,
    lastName: user.value.lastName,
    password: ''
  };
  profileModal.open = true;
}

async function saveProfile() {
  modalError.value = '';
  try {
    const updated = await api(`/users/${user.value._id}`, {
      method: 'PATCH',
      body: JSON.stringify(profileModal.form)
    });
    user.value = updated;
    profileModal.open = false;
  } catch (err) {
    modalError.value = err.message;
  }
}

// Actions Projets
function openProjectModal(proj = null) {
  modalError.value = '';
  projectModal.isEdit = !!proj;
  projectModal.id = proj ? proj._id : null;
  projectModal.form = {
    name: proj ? proj.name : '',
    description: proj ? proj.description : '',
    status: proj ? proj.status : 'active',
    members: proj ? (proj.members || []).map((m) => m._id || m) : [user.value._id]
  };
  projectModal.open = true;
}

async function saveProject() {
  modalError.value = '';
  try {
    if (projectModal.isEdit) {
      const updated = await api(`/projects/${projectModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify(projectModal.form)
      });
      currentProject.value = updated;
    } else {
      const created = await api('/projects', {
        method: 'POST',
        body: JSON.stringify(projectModal.form)
      });
      currentProject.value = created;
    }
    projectModal.open = false;
    await loadProjects();
  } catch (err) {
    modalError.value = err.message;
  }
}

async function deleteProject() {
  if (!confirm('Supprimer ce projet ainsi que toutes ses tâches ?')) return;
  await api(`/projects/${projectModal.id}`, { method: 'DELETE' });
  projectModal.open = false;
  currentProject.value = null;
  await loadProjects();
}

// Actions Tâches
function openTaskModal(task = null) {
  modalError.value = '';
  taskModal.isEdit = !!task;
  taskModal.id = task ? task._id : null;
  taskModal.form = {
    title: task ? task.title : '',
    description: task ? task.description : '',
    status: task ? task.status : 'todo',
    priority: task ? task.priority : 'medium',
    labelsText: task && Array.isArray(task.labels) ? task.labels.join(', ') : '',
    checklist: task && Array.isArray(task.checklist)
      ? task.checklist.map((item) => ({ text: item.text, done: Boolean(item.done) }))
      : [],
    assigneeId: task && task.assigneeId ? (task.assigneeId._id || task.assigneeId) : '',
    dueDate: task && task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
  };
  taskModal.newChecklistText = '';
  taskModal.comments = task ? task.comments || [] : [];
  taskModal.newComment = '';
  taskModal.open = true;
}

function addChecklistItem() {
  const txt = (taskModal.newChecklistText || '').trim();
  if (!txt) return;
  taskModal.form.checklist.push({ text: txt, done: false });
  taskModal.newChecklistText = '';
}

function removeChecklistItem(idx) {
  taskModal.form.checklist.splice(idx, 1);
}

async function saveTask() {
  modalError.value = '';
  try {
    const labels = (taskModal.form.labelsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: taskModal.form.title,
      description: taskModal.form.description,
      status: taskModal.form.status,
      priority: taskModal.form.priority,
      labels,
      checklist: taskModal.form.checklist,
      assigneeId: taskModal.form.assigneeId || null,
      dueDate: taskModal.form.dueDate || null
    };

    if (taskModal.isEdit) {
      await api(`/tasks/${taskModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    } else {
      await api(`/projects/${currentProject.value._id}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    taskModal.open = false;
    await loadTasks(currentProject.value._id);
  } catch (err) {
    modalError.value = err.message;
  }
}

async function deleteTask() {
  if (!confirm('Supprimer cette tâche ?')) return;
  await api(`/tasks/${taskModal.id}`, { method: 'DELETE' });
  taskModal.open = false;
  await loadTasks(currentProject.value._id);
}

async function addComment() {
  if (!taskModal.newComment.trim()) return;
  try {
    const updated = await api(`/tasks/${taskModal.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: taskModal.newComment })
    });
    taskModal.comments = updated.comments || [];
    taskModal.newComment = '';
    await loadTasks(currentProject.value._id);
  } catch (err) {
    modalError.value = err.message;
  }
}
</script>
