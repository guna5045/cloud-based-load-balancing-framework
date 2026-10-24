import { Router } from 'express';
import { getMetrics, getMonitoringHistory } from '../controllers/metricsController';

const router = Router();

router.get('/', getMetrics);
router.get('/history', getMonitoringHistory);

export default router;

