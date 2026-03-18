import express from 'express';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import Invoice from '../models/Invoice.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST load sample data
router.post('/load', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clear existing data
    await Promise.all([
      Client.deleteMany({ userId }),
      Project.deleteMany({ userId }),
      Task.deleteMany({ userId }),
      TimeLog.deleteMany({ userId }),
      Invoice.deleteMany({ userId })
    ]);

    // Sample clients
    const clients = await Client.insertMany([
      { userId, name: 'Acme Corp', email: 'billing@acmecorp.com', phone: '+1-555-0101', company: 'Acme Corporation', defaultHourlyRate: 85, notes: 'Primary enterprise client' },
      { userId, name: 'Stark Industries', email: 'projects@stark.io', phone: '+1-555-0202', company: 'Stark Industries LLC', defaultHourlyRate: 120, notes: 'Tech innovation partner' }
    ]);

    // Sample projects
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const projects = await Project.insertMany([
      { userId, clientId: clients[0]._id, name: 'E-Commerce Platform', description: 'Full-stack e-commerce with payment integration', status: 'Active', budget: 15000, startDate: new Date(now - 30 * day), deadline: new Date(now.getTime() + 60 * day) },
      { userId, clientId: clients[0]._id, name: 'Mobile App Backend', description: 'REST API for mobile apps', status: 'Active', budget: 8000, startDate: new Date(now - 14 * day), deadline: new Date(now.getTime() + 45 * day) },
      { userId, clientId: clients[1]._id, name: 'AI Dashboard', description: 'Real-time analytics with ML', status: 'Active', budget: 25000, startDate: new Date(now - 7 * day), deadline: new Date(now.getTime() + 90 * day) },
      { userId, clientId: clients[1]._id, name: 'Landing Page Redesign', description: 'Modern landing page', status: 'Completed', budget: 3000, startDate: new Date(now - 60 * day), deadline: new Date(now - 10 * day) }
    ]);

    // Sample tasks
    const tasks = await Task.insertMany([
      { userId, projectId: projects[0]._id, title: 'Setup payment gateway', status: 'In Progress', priority: 'High', dueDate: new Date(now.getTime() + 3 * day) },
      { userId, projectId: projects[0]._id, title: 'Design product catalog', status: 'Done', priority: 'Medium', dueDate: new Date(now - 2 * day) },
      { userId, projectId: projects[0]._id, title: 'Implement shopping cart', status: 'To Do', priority: 'High', dueDate: new Date(now.getTime() + 7 * day) },
      { userId, projectId: projects[1]._id, title: 'Build authentication API', status: 'Done', priority: 'High', dueDate: new Date(now - 5 * day) },
      { userId, projectId: projects[1]._id, title: 'Create REST endpoints', status: 'In Progress', priority: 'Medium', dueDate: new Date(now.getTime() + 5 * day) },
      { userId, projectId: projects[2]._id, title: 'Data pipeline setup', status: 'To Do', priority: 'High', dueDate: new Date(now.getTime() + 2 * day) },
      { userId, projectId: projects[2]._id, title: 'Chart component library', status: 'To Do', priority: 'Medium', dueDate: new Date(now.getTime() + 10 * day) },
      { userId, projectId: projects[2]._id, title: 'Real-time WebSocket feed', status: 'To Do', priority: 'Low', dueDate: new Date(now.getTime() + 14 * day) }
    ]);

    // Sample time logs spread over past 6 months
    const timeLogs = [];
    const descriptions = ['Feature development', 'Bug fixes', 'Code review', 'API integration', 'Testing', 'Documentation'];

    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const baseDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
      const entries = 3 + Math.floor(Math.random() * 4);

      for (let j = 0; j < entries; j++) {
        const d = 1 + Math.floor(Math.random() * 25);
        const h = 1 + Math.floor(Math.random() * 6);
        const pIdx = Math.floor(Math.random() * 3);
        const project = projects[pIdx];
        const client = project.clientId.equals(clients[0]._id) ? clients[0] : clients[1];
        const startTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), d, 9, 0);
        const endTime = new Date(startTime.getTime() + h * 3600000);

        timeLogs.push({
          userId, projectId: project._id, startTime, endTime,
          duration: h * 60,
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          billed: monthsAgo > 1,
          hourlyRate: client.defaultHourlyRate
        });
      }
    }
    await TimeLog.insertMany(timeLogs);

    // Sample invoices for billed months
    const invoices = [];
    for (let m = 5; m >= 2; m--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);

      const monthLogs = timeLogs.filter(l => l.startTime >= mStart && l.startTime <= mEnd && l.billed);
      if (monthLogs.length > 0) {
        const totalH = monthLogs.reduce((s, l) => s + l.duration / 60, 0);
        const avgR = monthLogs.reduce((s, l) => s + l.hourlyRate, 0) / monthLogs.length;
        const sub = Math.round(totalH * avgR * 100) / 100;

        invoices.push({
          userId, clientId: clients[m % 2]._id,
          invoiceNumber: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
          dateFrom: mStart, dateTo: mEnd,
          lineItems: [{ description: `Development — ${mStart.toLocaleString('default', { month: 'long' })}`, hours: Math.round(totalH * 100) / 100, rate: avgR, amount: sub }],
          subtotal: sub, taxRate: 10,
          taxAmount: Math.round(sub * 0.1 * 100) / 100,
          total: Math.round(sub * 1.1 * 100) / 100,
          status: m > 3 ? 'Paid' : 'Sent',
          paidDate: m > 3 ? new Date(now.getFullYear(), now.getMonth() - m + 1, 5) : null
        });
      }
    }
    if (invoices.length > 0) await Invoice.insertMany(invoices);

    res.json({
      message: 'Sample data loaded successfully!',
      counts: { clients: clients.length, projects: projects.length, tasks: tasks.length, timeLogs: timeLogs.length, invoices: invoices.length }
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Error loading sample data', error: error.message });
  }
});

export default router;
