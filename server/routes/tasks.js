const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');

const router = express.Router();

async function verifyTaskAccess(user, taskId) {
  const task = await Task.findOne({ _id: taskId });
  if (!task) return { task: null, project: null };

  const project = await Project.findOne({ _id: task.projectId, companyId: task.companyId }).lean();
  if (!project) return { task: null, project: null };

  if (user.role === 'member') {
    const isMember = (project.members || []).some((m) => m.toString() === user.userId);
    if (!isMember) return { task: null, project: null };
  }

  return { task, project };
}

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { task } = await verifyTaskAccess(req.user, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    const populated = await Task.findOne({ _id: task._id })
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(404).json({ error: 'Tâche introuvable' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const { task, project } = await verifyTaskAccess(req.user, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    const { title, description, status, priority, labels, checklist, assigneeId, dueDate } = req.body;

    if (title && title.trim()) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status && ['todo', 'in_progress', 'review', 'done'].includes(status)) {
      task.status = status;
    }
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      task.priority = priority;
    }
    if (dueDate !== undefined) {
      task.dueDate = dueDate || null;
    }

    if (labels !== undefined) {
      task.labels = Array.isArray(labels)
        ? labels.map((l) => String(l).trim()).filter(Boolean)
        : typeof labels === 'string'
        ? labels.split(',').map((l) => l.trim()).filter(Boolean)
        : [];
    }

    if (Array.isArray(checklist)) {
      task.checklist = checklist
        .filter((item) => item && item.text && String(item.text).trim())
        .map((item) => ({ text: String(item.text).trim(), done: Boolean(item.done) }));
    }

    if (assigneeId !== undefined) {
      if (!assigneeId) {
        task.assigneeId = null;
      } else {
        const isMember = (project.members || []).some(
          (m) => m.toString() === assigneeId.toString()
        );
        if (!isMember) {
          return res.status(400).json({ error: "L'utilisateur assigné doit être membre du projet" });
        }
        task.assigneeId = assigneeId;
      }
    }

    await task.save();

    const populated = await Task.findOne({ _id: task._id })
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/move
router.patch('/:id/move', async (req, res) => {
  try {
    const { task } = await verifyTaskAccess(req.user, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    const { status, position } = req.body;
    const targetStatus = ['todo', 'in_progress', 'review', 'done'].includes(status)
      ? status
      : task.status;
    const targetPos = typeof position === 'number' && position >= 0 ? position : 0;

    task.status = targetStatus;
    task.position = targetPos;
    await task.save();

    const siblings = await Task.find({
      companyId: task.companyId,
      projectId: task.projectId,
      status: targetStatus,
      _id: { $ne: task._id }
    }).sort({ position: 1, updatedAt: 1 });

    siblings.splice(targetPos, 0, task);

    await Promise.all(
      siblings.map((item, idx) =>
        Task.updateOne({ _id: item._id, companyId: task.companyId }, { $set: { position: idx } })
      )
    );

    const populated = await Task.findOne({ _id: task._id })
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .lean();

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const { task } = await verifyTaskAccess(req.user, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Le texte du commentaire est requis' });
    }

    task.comments.push({
      authorId: req.user.userId,
      text: text.trim(),
      createdAt: new Date()
    });
    await task.save();

    const populated = await Task.findOne({ _id: task._id })
      .populate('assigneeId', 'firstName lastName email role')
      .populate('comments.authorId', 'firstName lastName email')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { task } = await verifyTaskAccess(req.user, req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    await Task.deleteOne({ _id: task._id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
