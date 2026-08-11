import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'WAREHOUSE'), ProductController.create);
router.get('/', authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'), ProductController.getAll);
router.get('/stock-movements', authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'), ProductController.getStockMovements);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'), ProductController.getById);
router.put('/:id', authorize('ADMIN', 'WAREHOUSE'), ProductController.update);
router.delete('/:id', authorize('ADMIN', 'WAREHOUSE'), ProductController.delete);
router.post('/:id/stock', authorize('ADMIN', 'WAREHOUSE'), ProductController.adjustStock);

export default router;
