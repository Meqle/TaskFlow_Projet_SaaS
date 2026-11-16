const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { requireRole } = require('../middlewares/roles');

const router = express.Router();

function canAccessProject(user, project) {
  if (!project) return false;
  if (user.role === 'super_admin') return true;
  if (project.companyId.toString() !== user.companyId) return false;
  if (user.role === 'company_admin') return true;
  return (project.members || []).some((m) => (m._id || m).toString() === user.userId);
}

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'super_admin' && req.query.companyId) {
      filter.companyId = req.query.companyId;
    } else if (req.user.role === 'member') {
      filter.members = req.user.userId;
    }

    const projects = await Project.find(filter)
      .populate('members', 'firstName lastName email role active')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(projects);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id })
      .populate('members', 'firstName lastName email role active')
      .lean();

    if (!canAccessProject(req.user, project)) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    return res.json(project);
  } catch (err) {
    return res.status(404).json({ error: 'Projet introuvable' });
  }
});

// POST /api/projects
router.post('/', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const { name, description, notes, members, status, companyId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du projet est obligatoire' });
    }

    const targetCompanyId = req.user.role === 'super_admin' ? companyId || req.companyId : req.companyId;
    if (!targetCompanyId) {
      return res.status(400).json({ error: 'Identifiant entreprise requis' });
    }

    let validMembers = [];
    if (Array.isArray(members) && members.length > 0) {
      const users = await User.find({
        _id: { $in: members },
        companyId: targetCompanyId
      }).select('_id');
      validMembers = users.map((u) => u._id);
    } else if (req.user.companyId === targetCompanyId) {
      validMembers = [req.user.userId];
    }

    const project = await Project.create({
      companyId: targetCompanyId,
      name: name.trim(),
      description: description ? description.trim() : '',
      notes: notes ? String(notes) : '',
      members: validMembers,
      status: ['active', 'archived'].includes(status) ? status : 'active',
      createdBy: req.user.userId
    });

    const populated = await Project.findOne({ _id: project._id })
      .populate('members', 'firstName lastName email role active')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/projects/:id
router.patch('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id });
    if (!canAccessProject(req.user, project)) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);
    const { name, description, notes, status, members } = req.body;

    // Les membres du projet peuvent éditer la page de notes partagée du projet
    if (notes !== undefined) {
      project.notes = String(notes);
    }

    if (isAdmin) {
      if (name && name.trim()) project.name = name.trim();
      if (description !== undefined) project.description = description.trim();
      if (status && ['active', 'archived'].includes(status)) project.status = status;

      if (Array.isArray(members)) {
        const validUsers = await User.find({
          _id: { $in: members },
          companyId: project.companyId
        }).select('_id');
        project.members = validUsers.map((u) => u._id);
      }
    } else if (name !== undefined || status !== undefined || members !== undefined) {
      return res.status(403).json({ error: 'Seul un administrateur peut modifier la structure du projet' });
    }

    await project.save();

    const populated = await Project.findOne({ _id: project._id })
      .populate('members', 'firstName lastName email role active')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    await Task.deleteMany({ companyId: project.companyId, projectId: project._id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/members/:userId
router.post('/:id/members/:userId', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const targetUser = await User.findOne({
      _id: req.params.userId,
      companyId: project.companyId
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable dans cette entreprise' });
    }

    if (!project.members.some((m) => m.toString() === targetUser._id.toString())) {
      project.members.push(targetUser._id);
      await project.save();
    }

    const populated = await Project.findOne({ _id: project._id })
      .populate('members', 'firstName lastName email role active')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    project.members = project.members.filter((m) => m.toString() !== req.params.userId);
    await project.save();

    await Task.updateMany(
      { companyId: project.companyId, projectId: project._id, assigneeId: req.params.userId },
      { $set: { assigneeId: null } }
    );

    const populated = await Project.findOne({ _id: project._id })
      .populate('members', 'firstName lastName email role active')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id }).lean();
    if (!canAccessProject(req.user, project)) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const filter = {
      companyId: project.companyId,
      projectId: project._id
    };

    if (req.query.assigneeId) {
      filter.assigneeId = req.query.assigneeId === 'unassigned' ? null : req.query.assigneeId;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { labels: { $regex: q, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .sort({ status: 1, position: 1, createdAt: 1 })
      .lean();

    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id }).lean();
    if (!canAccessProject(req.user, project)) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const { title, description, status, priority, labels, checklist, assigneeId, dueDate } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre de la tâche est obligatoire' });
    }

    const targetStatus = ['todo', 'in_progress', 'review', 'done'].includes(status) ? status : 'todo';

    let validAssigneeId = null;
    if (assigneeId) {
      const isProjectMember = (project.members || []).some(
        (m) => m.toString() === assigneeId.toString()
      );
      if (!isProjectMember) {
        return res.status(400).json({ error: "L'utilisateur assigné doit être membre du projet" });
      }
      validAssigneeId = assigneeId;
    }

    const parsedLabels = Array.isArray(labels)
      ? labels.map((l) => String(l).trim()).filter(Boolean)
      : typeof labels === 'string' && labels.trim()
      ? labels.split(',').map((l) => l.trim()).filter(Boolean)
      : [];

    const parsedChecklist = Array.isArray(checklist)
      ? checklist
          .filter((item) => item && item.text && String(item.text).trim())
          .map((item) => ({ text: String(item.text).trim(), done: Boolean(item.done) }))
      : [];

    const countInColumn = await Task.countDocuments({
      companyId: project.companyId,
      projectId: project._id,
      status: targetStatus
    });

    const task = await Task.create({
      companyId: project.companyId,
      projectId: project._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: targetStatus,
      position: countInColumn,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      labels: parsedLabels,
      checklist: parsedChecklist,
      assigneeId: validAssigneeId,
      dueDate: dueDate || null,
      comments: []
    });

    const populated = await Task.findOne({ _id: task._id })
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
