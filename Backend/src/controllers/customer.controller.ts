import { Request, Response } from 'express';
import { createCustomerSchema, updateCustomerSchema, addFollowUpSchema } from '../validators/customer.validator';
import { CustomerService } from '../services/customer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export class CustomerController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createCustomerSchema.parse(req.body);
    const customer = await CustomerService.create(data);
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer,
    });
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const search = req.query['search'] as string | undefined;
    const page = parseInt((req.query['page'] as string) || '1', 10);
    const limit = parseInt((req.query['limit'] as string) || '10', 10);
    const result = await CustomerService.getAll(search, page, limit);

    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const customer = await CustomerService.getById(id);
    res.status(200).json({
      success: true,
      customer,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const data = updateCustomerSchema.parse(req.body);
    const customer = await CustomerService.update(id, data);
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer,
    });
  });

  static addFollowUp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params['id'] as string;
    const data = addFollowUpSchema.parse(req.body);
    const createdById = req.user?.id || req.user?.email || 'system';
    const followUp = await CustomerService.addFollowUp(id, data, createdById);
    res.status(201).json({
      success: true,
      message: 'Follow-up note added',
      followUp,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const result = await CustomerService.delete(id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}
