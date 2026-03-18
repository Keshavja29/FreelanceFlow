import express from 'express';
import Project from '../models/Project.js';
import TimeLog from '../models/TimeLog.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET all projects (filter by clientId, status)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;

    const projects = await Project.find(filter)
      .populate('clientId', 'name company')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single project with burn rate
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('clientId', 'name company defaultHourlyRate');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const timeLogs = await TimeLog.find({ projectId: project._id, userId: req.user.userId });
    const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const totalSpent = timeLogs.reduce((sum, log) => sum + ((log.duration / 60) * log.hourlyRate), 0);

    res.json({
      ...project.toObject(),
      burnRate: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        budgetRemaining: Math.round((project.budget - totalSpent) * 100) / 100,
        percentUsed: project.budget > 0 ? Math.round((totalSpent / project.budget) * 10000) / 100 : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create project
router.post('/', authenticate, async (req, res) => {
  try {
    const project = new Project({ ...req.body, userId: req.user.userId });
    await project.save();
    const populated = await project.populate('clientId', 'name company');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    ).populate('clientId', 'name company');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
