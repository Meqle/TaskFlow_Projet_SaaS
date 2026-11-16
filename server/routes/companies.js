const express = require('express');
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { tenantStorage } = require('../models/tenantPlugin');
const { requireRole } = require('../middlewares/roles');

const router = express.Router();

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// GET /api/companies
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      const companies = await Company.find().sort({ createdAt: -1 }).lean();
      const enriched = await Promise.all(
        companies.map(async (c) => {
          const [usersCount, projectsCount, tasksCount] = await tenantStorage.run(
            { bypassTenant: true },
            () =>
              Promise.all([
                User.countDocuments({ companyId: c._id }),
                Project.countDocuments({ companyId: c._id }),
                Task.countDocuments({ companyId: c._id })
              ])
          );
          return { ...c, usersCount, projectsCount, tasksCount };
        })
      );
      return res.json(enriched);
    }

    const company = await Company.findById(req.companyId).lean();
    if (!company) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }
    return res.json([company]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/companies (super_admin uniquement)
router.post('/', requireRole('super_admin'), async (req, res) => {
  try {
    const {
      name,
      slug,
      plan,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom de l'entreprise est requis" });
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);
    if (!finalSlug) {
      return res.status(400).json({ error: 'Identifiant (slug) invalide' });
    }

    const existingSlug = await Company.findOne({ slug: finalSlug });
    if (existingSlug) {
      return res.status(409).json({ error: 'Une entreprise avec ce slug existe déjà' });
    }

    if (adminEmail) {
      const existingUser = await tenantStorage.run({ bypassTenant: true }, () =>
        User.findOne({ email: adminEmail.toLowerCase().trim() })
      );
      if (existingUser) {
        return res.status(409).json({ error: "L'adresse e-mail de l'administrateur est déjà utilisée" });
      }
    }

    const company = await Company.create({
      name: name.trim(),
      slug: finalSlug,
      plan: ['free', 'pro', 'enterprise'].includes(plan) ? plan : 'free'
    });

    let createdAdmin = null;
    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      createdAdmin = await tenantStorage.run({ bypassTenant: true }, () =>
        User.create({
          companyId: company._id,
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          firstName: (adminFirstName || 'Admin').trim(),
          lastName: (adminLastName || company.name).trim(),
          role: 'company_admin',
          active: true
        })
      );
    }

    return res.status(201).json({
      company,
      admin: createdAdmin ? createdAdmin.toJSON() : null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/companies/:id (super_admin ou company_admin sur sa propre entreprise)
router.patch('/:id', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    if (req.user.role !== 'super_admin' && req.params.id !== req.companyId) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    const { name, slug, plan } = req.body;
    if (name && name.trim()) company.name = name.trim();
    if (slug && slug.trim()) {
      const newSlug = slugify(slug);
      const duplicate = await Company.findOne({ slug: newSlug, _id: { $ne: company._id } });
      if (duplicate) {
        return res.status(409).json({ error: 'Ce slug est déjà utilisé' });
      }
      company.slug = newSlug;
    }
    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) {
      company.plan = plan;
    }

    await company.save();
    return res.json(company);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/companies/:id (suppression en cascade)
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    await tenantStorage.run({ bypassTenant: true }, () =>
      Promise.all([
        Task.deleteMany({ companyId: company._id }),
        Project.deleteMany({ companyId: company._id }),
        User.deleteMany({ companyId: company._id }),
        Company.findByIdAndDelete(company._id)
      ])
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

