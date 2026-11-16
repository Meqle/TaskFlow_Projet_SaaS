const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { tenantStorage } = require('../models/tenantPlugin');

/**
 * Middleware 1 : Vérifie le JWT stocké dans le cookie httpOnly.
 */
async function auth(req, res, next) {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const payload = jwt.verify(token, config.jwtSecret);

    // Vérification en base hors filtre tenant que le compte existe et est actif
    const user = await tenantStorage.run({ bypassTenant: true }, () =>
      User.findById(payload.userId).lean()
    );

    if (!user || !user.active) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'Session invalide ou compte désactivé' });
    }

    req.user = {
      userId: user._id.toString(),
      companyId: user.companyId ? user.companyId.toString() : null,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Jeton invalide ou expiré' });
  }
}

module.exports = auth;

