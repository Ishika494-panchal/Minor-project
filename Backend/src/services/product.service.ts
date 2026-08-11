import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { CreateProductInput, UpdateProductInput, StockAdjustmentInput } from '../validators/product.validator';

export class ProductService {
  static async create(data: CreateProductInput) {
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      throw new ApiError(409, `Product with SKU '${data.sku}' already exists`);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        unitPrice: data.unitPrice,
        currentStock: data.currentStock,
        minStockAlert: data.minStockAlert,
        location: data.location || null,
      },
    });

    return product;
  }

  static async getAll(search?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return product;
  }

  static async update(id: string, data: UpdateProductInput) {
    await ProductService.getById(id);

    if (data.sku) {
      const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existing && existing.id !== id) {
        throw new ApiError(409, `Product with SKU '${data.sku}' already exists`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    return updated;
  }

  static async adjustStock(productId: string, data: StockAdjustmentInput, createdById: string) {
    const product = await ProductService.getById(productId);

    if (data.type === 'OUT' && product.currentStock < data.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for '${product.name}'. Available: ${product.currentStock}, requested reduction: ${data.quantity}`
      );
    }

    const newStock =
      data.type === 'IN'
        ? product.currentStock + data.quantity
        : product.currentStock - data.quantity;

    if (newStock < 0) {
      throw new ApiError(400, 'Stock cannot be reduced below zero.');
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId,
          quantity: data.quantity,
          type: data.type,
          reason: data.reason || `Manual stock adjustment (${data.type})`,
          createdById,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
    ]);

    return movement;
  }

  static async delete(id: string) {
    await ProductService.getById(id);
    await prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  static async getStockMovements(productId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = productId ? { productId } : {};

    const [items, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
