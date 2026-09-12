import express from 'express';
import { Alert } from './models/Alert.js';
import {
  getCurrentFeedState,
  setSimulationStage,
  advanceSimulationStage,
  resetSimulationStage,
} from './services/feedReplayService.js';

export function alertsRouter({ requireAuth, requireRole } = {}) {
  const router = express.Router();

  // Public/Citizen route: List active alerts
  router.get('/alerts', async (req, res) => {
    try {
      const activeAlerts = await Alert.find({ active: true }).sort({ issuedAt: -1 }).lean();
      
      // If DB has no active alerts, also check feed state
      const feed = getCurrentFeedState();
      res.json({
        alerts: activeAlerts.length > 0 ? activeAlerts : feed.alerts.map((a, i) => ({
          _id: `feed-alert-${i}`,
          ...a,
          active: true,
          issuedAt: feed.timestamp,
        })),
        isSimulated: true,
        disclaimer: 'SIMULATED HYDROLOGICAL ALERT - For demonstration only. Not monitored for emergency response.',
      });
    } catch (err) {
      // Fallback if DB is disconnected
      const feed = getCurrentFeedState();
      res.json({
        alerts: feed.alerts.map((a, i) => ({
          _id: `feed-alert-${i}`,
          ...a,
          active: true,
          issuedAt: feed.timestamp,
        })),
        isSimulated: true,
        disclaimer: 'SIMULATED HYDROLOGICAL ALERT - For demonstration only. Not monitored for emergency response.',
      });
    }
  });

  // Public route: Get current hydrological/weather feed status
  router.get('/feed/status', (req, res) => {
    res.json(getCurrentFeedState());
  });

  // Staff route: Advance simulation stage
  const guard = (requireAuth && requireRole) ? [requireAuth, requireRole(['officer', 'admin'])] : [];

  router.post('/feed/step', ...guard, async (req, res) => {
    try {
      const targetStage = req.body && typeof req.body.stage === 'number' ? req.body.stage : undefined;
      const updated = targetStage !== undefined
        ? await setSimulationStage(targetStage)
        : await advanceSimulationStage();
      res.json({ success: true, feed: updated });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Staff route: Reset simulation feed
  router.post('/feed/reset', ...guard, async (req, res) => {
    try {
      const updated = await resetSimulationStage();
      res.json({ success: true, feed: updated });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
