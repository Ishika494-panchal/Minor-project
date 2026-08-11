import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import protectedRoutes from './protected.routes';
import customerRoutes from './customer.routes';
import productRoutes from './product.routes';
import challanRoutes from './challan.routes';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, 'Mini ERP API Base Endpoint', {
    status: 'online',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (Protected)',
      },
      modules: {
        admin: 'GET /api/modules/admin (ADMIN)',
        sales: 'GET /api/modules/sales (ADMIN, SALES)',
        warehouse: 'GET /api/modules/warehouse (ADMIN, WAREHOUSE)',
        accounts: 'GET /api/modules/accounts (ADMIN, ACCOUNTS)',
      },
      customers: {
        create: 'POST /api/customers',
        list: 'GET /api/customers?search=name&page=1&limit=10',
        detail: 'GET /api/customers/:id',
        update: 'PUT /api/customers/:id',
        delete: 'DELETE /api/customers/:id',
        followup: 'POST /api/customers/:id/followup',
      },
      products: {
        create: 'POST /api/products',
        list: 'GET /api/products?search=name&page=1&limit=10',
        detail: 'GET /api/products/:id',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id',
        stock: 'POST /api/products/:id/stock',
      },
      challans: {
        create: 'POST /api/challans',
        list: 'GET /api/challans?status=CONFIRMED&page=1&limit=10',
        detail: 'GET /api/challans/:id',
        updateStatus: 'PATCH /api/challans/:id/status',
        delete: 'DELETE /api/challans/:id',
      },
    },
  });
});

router.use('/auth', authRoutes);
router.use('/modules', protectedRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/challans', challanRoutes);

export default router;
