import { Router } from 'express';
import healthRoutes from './healthRoutes';
import serverRoutes from './serverRoutes';
import topologyRoutes from './topologyRoutes';
import requestRoutes from './requestRoutes';
import metricsRoutes from './metricsRoutes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/servers', serverRoutes);
router.use('/topology', topologyRoutes);
router.use('/requests', requestRoutes);
router.use('/metrics', metricsRoutes);

export default router;
