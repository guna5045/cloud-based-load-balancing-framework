import { Router } from 'express';
import {
  getServers,
  getServerById,
  createServer,
  deleteServer,
} from '../controllers/serverController';

const router = Router();

router.get('/', getServers);
router.post('/', createServer);
router.get('/:id', getServerById);
router.delete('/:id', deleteServer);

export default router;
