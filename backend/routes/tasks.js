import express from 'express';
import Task from '../models/Task.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET all tasks (filter by projectId, status)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter)
      .populate('projectId', 'name')
      .sort({ dueDate: 1, priority: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET upcoming deadlines (next 7 days)
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tasks = await Task.find({
      userId: req.user.userId,
      dueDate: { $gte: now, $lte: nextWeek },
      status: { $ne: 'Done' }
    }).populate('projectId', 'name').sort({ dueDate: 1 }).limit(10);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create task
router.post('/', authenticate, async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user.userId });
    await task.save();
    const populated = await task.populate('projectId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    ).populate('projectId', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
