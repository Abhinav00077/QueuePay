import { Router, Request, Response } from 'express';
import { getSqliteDb } from '../database';

const router = Router();

// Update network status
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { isOnline } = req.body;
    const db = getSqliteDb();

    await db.run(
      'INSERT INTO network_status (is_online) VALUES (?)',
      [isOnline]
    );

    res.json({ success: true, isOnline });
  } catch (error) {
    console.error('Error updating network status:', error);
    res.status(500).json({ success: false, error: 'Failed to update network status' });
  }
});

// Get current network status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    const status = await db.get(
      'SELECT * FROM network_status ORDER BY last_checked DESC LIMIT 1'
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error fetching network status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch network status' });
  }
});

export const networkRoutes = router; 