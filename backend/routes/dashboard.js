import express from 'express';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET dashboard stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [totalClients, activeProjects, pendingTasks, pendingInvoices, paidInvoices, user] = await Promise.all([
      Client.countDocuments({ userId }),
      Project.countDocuments({ userId, status: 'Active' }),
      Task.countDocuments({ userId, status: { $ne: 'Done' } }),
      Invoice.find({ userId, status: { $in: ['Draft', 'Sent'] } }),
      Invoice.find({ userId, status: 'Paid' }),
      User.findById(userId).select('plan')
    ]);

    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.find({
      userId, dueDate: { $gte: now, $lte: nextWeek }, status: { $ne: 'Done' }
    }).populate('projectId', 'name').sort({ dueDate: 1 }).limit(5);

    const activeTimer = await TimeLog.findOne({ userId, endTime: null }).populate('projectId', 'name');

    res.json({
      totalClients, activeProjects, pendingTasks,
      pendingInvoicesCount: pendingInvoices.length,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      upcomingDeadlines, activeTimer,
      plan: user.plan
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET monthly revenue chart (last 12 months)
router.get('/revenue-chart', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [paidInvs, pendingInvs] = await Promise.all([
        Invoice.find({ userId, status: 'Paid', paidDate: { $gte: monthStart, $lte: monthEnd } }),
        Invoice.find({ userId, status: { $in: ['Sent', 'Draft'] }, createdAt: { $gte: monthStart, $lte: monthEnd } })
      ]);

      months.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        revenue: Math.round(paidInvs.reduce((s, i) => s + i.total, 0) * 100) / 100,
        outstanding: Math.round(pendingInvs.reduce((s, i) => s + i.total, 0) * 100) / 100
      });
    }

    res.json(months);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT upgrade/downgrade plan
router.put('/plan', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['Free', 'Pro'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }
    const user = await User.findByIdAndUpdate(req.user.userId, { plan }, { new: true }).select('plan username email');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
