import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';

export class RoleController {
  static getAdminDashboard(req: AuthRequest, res: Response): void {
    sendSuccess(res, 'Welcome to the Admin Dashboard', {
      user: req.user,
      access: 'FULL_ADMIN_ACCESS',
      modules: ['User Management', 'System Settings', 'Reports', 'Audit Logs'],
    });
  }

  static getSalesDashboard(req: AuthRequest, res: Response): void {
    sendSuccess(res, 'Welcome to the Sales Module', {
      user: req.user,
      access: 'SALES_ACCESS',
      modules: ['Leads', 'Quotations', 'Sales Orders', 'Customers'],
    });
  }

  static getWarehouseDashboard(req: AuthRequest, res: Response): void {
    sendSuccess(res, 'Welcome to the Warehouse Module', {
      user: req.user,
      access: 'WAREHOUSE_ACCESS',
      modules: ['Inventory', 'Stock Movement', 'Purchase Orders', 'Dispatch'],
    });
  }

  static getAccountsDashboard(req: AuthRequest, res: Response): void {
    sendSuccess(res, 'Welcome to the Accounts Module', {
      user: req.user,
      access: 'ACCOUNTS_ACCESS',
      modules: ['Invoices', 'Payments', 'Ledger', 'Financial Reports'],
    });
  }
}
