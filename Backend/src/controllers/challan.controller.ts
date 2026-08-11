import { Response } from 'express';
import { createChallanSchema, updateChallanStatusSchema } from '../validators/challan.validator';
import { ChallanService } from '../services/challan.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export class ChallanController {
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createChallanSchema.parse(req.body);
    const createdById = req.user?.id || req.user?.email || 'system';
    const challan = await ChallanService.create(data, createdById);
    res.status(201).json({
      success: true,
      message: 'Challan created successfully',
      challan,
    });
  });

  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = req.query['status'] as string | undefined;
    const page = parseInt((req.query['page'] as string) || '1', 10);
    const limit = parseInt((req.query['limit'] as string) || '10', 10);
    const result = await ChallanService.getAll(status, page, limit);

    res.status(200).json({
      success: true,
      message: 'Challans fetched successfully',
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params['id'] as string;
    const challan = await ChallanService.getById(id);
    res.status(200).json({
      success: true,
      challan,
    });
  });

  static updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params['id'] as string;
    const data = updateChallanStatusSchema.parse(req.body);
    const updatedById = req.user?.id || req.user?.email || 'system';
    const challan = await ChallanService.updateStatus(id, data, updatedById);
    res.status(200).json({
      success: true,
      message: 'Challan status updated successfully',
      challan,
    });
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params['id'] as string;
    const result = await ChallanService.delete(id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}
