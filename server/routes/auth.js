const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Company = require('../models/Company');
const { tenantStorage } = require('../models/tenantPlugin');
const auth = require('../middlewares/auth');

const router = express.Router();

function parseDurationMs(str) {
  const match = /^(\d+)([smhd])$/.exec(str || '8h');
  if (!match) return 8 * 3600 * 1000;
  const val = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return val * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 3600 * 1000;
  if (unit === 'd') return val * 86400 * 1000;
  return 8 * 3600 * 1000;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Adresse e-mail et mot de passe requis' });
    }

    const user = await tenantStorage.run({ bypassTenant: true }, () =>
      User.findOne({ email: email.toLowerCase().trim() })
    );

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Identifiants invalides ou compte désactivé' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
      if (!company) {
        return res.status(401).json({ error: 'Entreprise introuvable' });
      }
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        companyId: user.companyId ? user.companyId.toString() : null,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: parseDurationMs(config.jwtExpiresIn)
    });

    return res.json({
      user: user.toJSON(),
      company
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await tenantStorage.run({ bypassTenant: true }, () =>
      User.findById(req.user.userId)
    );
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
    }

    return res.json({
      user: user.toJSON(),
      company
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

