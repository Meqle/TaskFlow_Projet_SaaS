const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

// GET /api/stats (Tableau de bord d'entreprise)
router.get('/', async (req, res) => {
  try {
    const targetCompanyId =
      req.user.role === 'super_admin' ? req.query.companyId || null : req.companyId;

    if (!targetCompanyId && req.user.role === 'super_admin') {
      const [companiesCount, usersCount, projectsCount, tasksCount] = await Promise.all([
        Company.countDocuments(),
        User.countDocuments(),
        Project.countDocuments(),
        Task.countDocuments()
      ]);
      return res.json({
        scope: 'platform',
        companiesCount,
        usersCount,
        projectsCount,
        tasksCount
      });
    }

    const filter = { companyId: targetCompanyId };
    const [usersCount, projectsCount, tasks] = await Promise.all([
      User.countDocuments(filter),
      Project.countDocuments(filter),
      Task.find(filter)
        .populate('projectId', 'name')
        .populate('assigneeId', 'firstName lastName')
        .lean()
    ]);

    const byStatus = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0
    };

    const now = new Date();
    const overdueTasks = [];

    tasks.forEach((t) => {
      if (byStatus[t.status] !== undefined) {
        byStatus[t.status] += 1;
      }
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'done') {
        overdueTasks.push(t);
      }
    });

    return res.json({
      scope: 'company',
      usersCount,
      projectsCount,
      tasksCount: tasks.length,
      byStatus,
      overdueCount: overdueTasks.length,
      overdueTasks: overdueTasks.slice(0, 10)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

