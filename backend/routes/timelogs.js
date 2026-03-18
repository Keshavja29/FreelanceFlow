import express from 'express';
import TimeLog from '../models/TimeLog.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET all time logs (filter by projectId, date range, billed)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.billed !== undefined) filter.billed = req.query.billed === 'true';
    if (req.query.from || req.query.to) {
      filter.startTime = {};
      if (req.query.from) filter.startTime.$gte = new Date(req.query.from);
      if (req.query.to) filter.startTime.$lte = new Date(req.query.to);
    }

    const logs = await TimeLog.find(filter)
      .populate('projectId', 'name')
      .populate('taskId', 'title')
      .sort({ startTime: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET unbilled time logs for a client (for invoice wizard)
router.get('/unbilled/:clientId', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { from, to } = req.query;

    const projects = await Project.find({ clientId, userId: req.user.userId });
    const projectIds = projects.map(p => p._id);

    const filter = {
      userId: req.user.userId,
      projectId: { $in: projectIds },
      billed: false,
      endTime: { $ne: null }
    };

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const logs = await TimeLog.find(filter)
      .populate('projectId', 'name')
      .populate('taskId', 'title')
      .sort({ startTime: -1 });

    const totalMinutes = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalAmount = logs.reduce((sum, log) => sum + ((log.duration / 60) * log.hourlyRate), 0);

    res.json({
      logs,
      summary: {
        totalEntries: logs.length,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST start timer
router.post('/start', authenticate, async (req, res) => {
  try {
    const { projectId, taskId, description } = req.body;

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const client = await Client.findById(project.clientId);
    const hourlyRate = client ? client.defaultHourlyRate : 0;

    const timeLog = new TimeLog({
      userId: req.user.userId,
      projectId,
      taskId: taskId || null,
      startTime: new Date(),
      description: description || '',
      hourlyRate
    });

    await timeLog.save();
    const populated = await timeLog.populate('projectId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT stop timer
router.put('/stop/:id', authenticate, async (req, res) => {
  try {
    const timeLog = await TimeLog.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!timeLog) return res.status(404).json({ message: 'Time log not found' });

    const endTime = new Date();
    const duration = Math.round((endTime - timeLog.startTime) / 60000);

    timeLog.endTime = endTime;
    timeLog.duration = duration;
    if (req.body.description) timeLog.description = req.body.description;
    await timeLog.save();

    res.json(timeLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST manual time entry
router.post('/manual', authenticate, async (req, res) => {
  try {
    const { projectId, taskId, date, hours, description } = req.body;

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const client = await Client.findById(project.clientId);
    const hourlyRate = client ? client.defaultHourlyRate : 0;

    const startTime = new Date(date);
    const durationMinutes = Math.round(hours * 60);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const timeLog = new TimeLog({
      userId: req.user.userId,
      projectId,
      taskId: taskId || null,
      startTime, endTime,
      duration: durationMinutes,
      description: description || '',
      hourlyRate
    });

    await timeLog.save();
    const populated = await timeLog.populate([
      { path: 'projectId', select: 'name' },
      { path: 'taskId', select: 'title' }
    ]);
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE time log
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const timeLog = await TimeLog.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!timeLog) return res.status(404).json({ message: 'Time log not found' });
    res.json({ message: 'Time log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
