import { Router } from 'express';
import { getServers, getServerById } from '../controllers/serverController';

const router = Router();

router.get('/', getServers);
router.get('/:id', getServerById);

export default router;
