import { Router } from 'express';
import { getMetrics, getMonitoringHistory, getScalingHistory } from '../controllers/metricsController';

const router = Router();

router.get('/', getMetrics);
router.get('/history', getMonitoringHistory);
router.get('/scaling/history', getScalingHistory);

export default router;

