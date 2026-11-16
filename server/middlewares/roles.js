/**
 * Middleware 3 : Contrôle du rôle minimum requis sur une route.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Droits insuffisants pour cette action' });
    }
    next();
  };
}

module.exports = { requireRole };

