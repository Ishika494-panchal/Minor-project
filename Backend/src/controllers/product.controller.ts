import { Request, Response } from 'express';
import { createProductSchema, updateProductSchema, stockAdjustmentSchema } from '../validators/product.validator';
import { ProductService } from '../services/product.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export class ProductController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);
    const product = await ProductService.create(data);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const search = req.query['search'] as string | undefined;
    const page = parseInt((req.query['page'] as string) || '1', 10);
    const limit = parseInt((req.query['limit'] as string) || '10', 10);
    const result = await ProductService.getAll(search, page, limit);

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const product = await ProductService.getById(id);
    res.status(200).json({
      success: true,
      product,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const data = updateProductSchema.parse(req.body);
    const product = await ProductService.update(id, data);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  });

  static adjustStock = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params['id'] as string;
    const data = stockAdjustmentSchema.parse(req.body);
    const createdById = req.user?.id || req.user?.email || 'system';
    const movement = await ProductService.adjustStock(id, data, createdById);
    res.status(201).json({
      success: true,
      message: 'Stock adjustment recorded successfully',
      movement,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const result = await ProductService.delete(id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  static getStockMovements = asyncHandler(async (req: Request, res: Response) => {
    const productId = req.query['productId'] as string | undefined;
    const page = parseInt((req.query['page'] as string) || '1', 10);
    const limit = parseInt((req.query['limit'] as string) || '20', 10);
    const result = await ProductService.getStockMovements(productId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Stock movement logs fetched successfully',
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });
}
