import { Router } from 'express';
import { ChallanController } from '../controllers/challan.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'SALES'), ChallanController.create);
router.get('/', authorize('ADMIN', 'SALES', 'WAREHOUSE'), ChallanController.getAll);
router.get('/:id', authorize('ADMIN', 'SALES', 'WAREHOUSE'), ChallanController.getById);
router.patch('/:id/status', authorize('ADMIN', 'SALES', 'WAREHOUSE'), ChallanController.updateStatus);
router.delete('/:id', authorize('ADMIN', 'SALES'), ChallanController.delete);

export default router;
