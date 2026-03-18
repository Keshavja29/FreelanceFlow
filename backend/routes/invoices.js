import express from 'express';
import Invoice from '../models/Invoice.js';
import TimeLog from '../models/TimeLog.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.clientId) filter.clientId = req.query.clientId;

    const invoices = await Invoice.find(filter)
      .populate('clientId', 'name company email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single invoice
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('clientId', 'name company email phone');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create invoice from unbilled time logs
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.plan === 'Free') {
      return res.status(403).json({
        message: 'PDF Invoicing is a Pro feature. Upgrade to create invoices.',
        upgradeRequired: true
      });
    }

    const { clientId, dateFrom, dateTo, taxRate = 0, notes = '' } = req.body;

    const projects = await Project.find({ clientId, userId: req.user.userId });
    const projectIds = projects.map(p => p._id);

    const timeLogs = await TimeLog.find({
      userId: req.user.userId,
      projectId: { $in: projectIds },
      billed: false,
      endTime: { $ne: null },
      startTime: { $gte: new Date(dateFrom), $lte: new Date(dateTo) }
    }).populate('projectId', 'name');

    if (timeLogs.length === 0) {
      return res.status(400).json({ message: 'No unbilled time logs found for this period' });
    }

    // Group by project for line items
    const projectGroups = {};
    timeLogs.forEach(log => {
      const projName = log.projectId.name;
      if (!projectGroups[projName]) {
        projectGroups[projName] = { hours: 0, rate: log.hourlyRate, descriptions: [] };
      }
      projectGroups[projName].hours += log.duration / 60;
      if (log.description) projectGroups[projName].descriptions.push(log.description);
    });

    const lineItems = Object.entries(projectGroups).map(([name, data]) => ({
      description: `${name}${data.descriptions.length > 0 ? ' — ' + [...new Set(data.descriptions)].join(', ') : ''}`,
      hours: Math.round(data.hours * 100) / 100,
      rate: data.rate,
      amount: Math.round(data.hours * data.rate * 100) / 100
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const invoiceCount = await Invoice.countDocuments({ userId: req.user.userId });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = new Invoice({
      userId: req.user.userId,
      clientId, invoiceNumber,
      dateFrom: new Date(dateFrom), dateTo: new Date(dateTo),
      lineItems, subtotal: Math.round(subtotal * 100) / 100,
      taxRate, taxAmount, total, notes
    });

    await invoice.save();

    // Mark time logs as billed
    await TimeLog.updateMany(
      { _id: { $in: timeLogs.map(l => l._id) } },
      { billed: true, invoiceId: invoice._id }
    );

    const populated = await invoice.populate('clientId', 'name company email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update invoice status
router.put('/:id', authenticate, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.status === 'Paid' && !updateData.paidDate) {
      updateData.paidDate = new Date();
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updateData,
      { new: true }
    ).populate('clientId', 'name company email');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE invoice (unbill the time logs)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    await TimeLog.updateMany(
      { invoiceId: invoice._id },
      { billed: false, invoiceId: null }
    );

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
