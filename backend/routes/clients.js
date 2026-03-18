import express from 'express';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET all clients
router.get('/', authenticate, async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single client
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create client (free tier limit: max 2)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.plan === 'Free') {
      const clientCount = await Client.countDocuments({ userId: req.user.userId });
      if (clientCount >= 2) {
        return res.status(403).json({
          message: 'Free plan allows max 2 clients. Upgrade to Pro for unlimited clients.',
          limitReached: true
        });
      }
    }

    const client = new Client({ ...req.body, userId: req.user.userId });
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update client
router.put('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE client
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
