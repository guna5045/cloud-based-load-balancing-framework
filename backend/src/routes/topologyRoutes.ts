import { Router } from 'express';
import { getTopology } from '../controllers/topologyController';

const router = Router();

router.get('/', getTopology);

export default router;
