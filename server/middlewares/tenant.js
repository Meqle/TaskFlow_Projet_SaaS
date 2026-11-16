const { tenantStorage } = require('../models/tenantPlugin');

/**
 * Middleware 2 : Extrait le companyId du JWT (jamais du client)
 * et active le contexte Mongoose d'isolation automatique pour toute la requête.
 */
function tenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  const isSuperAdmin = req.user.role === 'super_admin';
  const companyId = req.user.companyId;

  if (!isSuperAdmin && !companyId) {
    return res.status(403).json({ error: 'Aucune entreprise rattachée à ce compte' });
  }

  // Parade contre l'injection de companyId dans le corps de la requête
  if (!isSuperAdmin && req.body && typeof req.body === 'object') {
    req.body.companyId = companyId;
  }

  req.companyId = companyId;

  tenantStorage.run(
    {
      companyId,
      role: req.user.role,
      bypassTenant: isSuperAdmin
    },
    () => next()
  );
}

module.exports = tenant;

