const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Company = require('../models/Company');
const { requireRole } = require('../middlewares/roles');

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'super_admin' && req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    const users = await User.find(filter).sort({ createdAt: 1 });
    return res.json(users.map((u) => u.toJSON()));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users (super_admin ou company_admin)
router.post('/', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, companyId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Prénom, nom, e-mail et mot de passe sont obligatoires' });
    }

    const targetCompanyId = req.user.role === 'super_admin' ? companyId || null : req.companyId;
    const allowedRoles =
      req.user.role === 'super_admin'
        ? ['super_admin', 'company_admin', 'member']
        : ['company_admin', 'member'];
    const finalRole = allowedRoles.includes(role) ? role : 'member';

    if (finalRole !== 'super_admin' && !targetCompanyId) {
      return res.status(400).json({ error: "L'utilisateur doit être rattaché à une entreprise" });
    }

    if (targetCompanyId) {
      const comp = await Company.findById(targetCompanyId);
      if (!comp) {
        return res.status(404).json({ error: 'Entreprise cible introuvable' });
      }
    }

    const existing = await User.collection.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      companyId: finalRole === 'super_admin' ? null : targetCompanyId,
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: finalRole,
      active: true
    });

    return res.status(201).json(user.toJSON());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  try {
    const isSelf = req.params.id === req.user.userId;
    const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre profil' });
    }

    // Le plugin Mongoose filtre automatiquement par companyId pour les non super_admin
    const user = await User.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const { firstName, lastName, email, password, role, active } = req.body;

    if (firstName && firstName.trim()) user.firstName = firstName.trim();
    if (lastName && lastName.trim()) user.lastName = lastName.trim();

    if (email && email.toLowerCase().trim() !== user.email) {
      const dup = await User.collection.findOne({ email: email.toLowerCase().trim() });
      if (dup) {
        return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (password && password.trim()) {
      user.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (isAdmin) {
      if (role) {
        const allowed =
          req.user.role === 'super_admin'
            ? ['super_admin', 'company_admin', 'member']
            : ['company_admin', 'member'];
        if (allowed.includes(role)) user.role = role;
      }
      if (typeof active === 'boolean' && !isSelf) {
        user.active = active;
      }
    }

    await user.save();
    return res.json(user.toJSON());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte actif' });
    }

    const user = await User.findOneAndDelete({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    await Promise.all([
      Project.updateMany({ members: user._id }, { $pull: { members: user._id } }),
      Task.updateMany({ assigneeId: user._id }, { $set: { assigneeId: null } })
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

