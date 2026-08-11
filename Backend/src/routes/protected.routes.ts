import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/admin', authorizeRoles('ADMIN'), RoleController.getAdminDashboard);
router.get('/sales', authorizeRoles('ADMIN', 'SALES'), RoleController.getSalesDashboard);
router.get('/warehouse', authorizeRoles('ADMIN', 'WAREHOUSE'), RoleController.getWarehouseDashboard);
router.get('/accounts', authorizeRoles('ADMIN', 'ACCOUNTS'), RoleController.getAccountsDashboard);

export default router;
