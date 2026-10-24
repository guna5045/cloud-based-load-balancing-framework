import { Router } from 'express';
import { getRequests, submitRequest } from '../controllers/requestController';

const router = Router();

router.get('/', getRequests);
router.post('/', submitRequest);

export default router;
