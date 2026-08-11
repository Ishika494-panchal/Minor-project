import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'SALES'), CustomerController.create);
router.get('/', authorize('ADMIN', 'SALES'), CustomerController.getAll);
router.get('/:id', authorize('ADMIN', 'SALES'), CustomerController.getById);
router.put('/:id', authorize('ADMIN', 'SALES'), CustomerController.update);
router.delete('/:id', authorize('ADMIN', 'SALES'), CustomerController.delete);
router.post('/:id/followup', authorize('ADMIN', 'SALES'), CustomerController.addFollowUp);

export default router;
