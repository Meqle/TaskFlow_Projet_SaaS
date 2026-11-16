const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * Stockage de contexte par requête HTTP permettant d'injecter automatiquement
 * le companyId issu du JWT dans toutes les opérations Mongoose.
 */
const tenantStorage = new AsyncLocalStorage();

function getTenantContext() {
  return tenantStorage.getStore() || null;
}

/**
 * Plugin Mongoose d'isolation multi-entreprise.
 * Ajoute automatiquement le filtre { companyId } sur toutes les lectures,
 * modifications et suppressions dès qu'un utilisateur d'entreprise est connecté.
 */
function tenantPlugin(schema) {
  const queryHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments'
  ];

  queryHooks.forEach((hook) => {
    schema.pre(hook, function () {
      const ctx = getTenantContext();
      if (!ctx || ctx.bypassTenant) return;

      // Si l'utilisateur appartient à une entreprise, on force companyId dans le filtre
      if (ctx.companyId) {
        this.where({ companyId: ctx.companyId });
      }
    });
  });

  schema.pre('validate', function () {
    const ctx = getTenantContext();
    if (!ctx || ctx.bypassTenant) return;

    // Écrase systématiquement companyId avec celui du jeton JWT
    if (ctx.companyId) {
      this.companyId = ctx.companyId;
    }
  });
}

module.exports = {
  tenantStorage,
  getTenantContext,
  tenantPlugin
};

