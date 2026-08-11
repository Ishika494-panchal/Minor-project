import { ChallanStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { CreateChallanInput, UpdateChallanStatusInput } from '../validators/challan.validator';

async function generateChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.challan.count();
  const sequence = String(count + 1).padStart(5, '0');
  return `CH-${currentYear}-${sequence}`;
}

export class ChallanService {
  static async create(data: CreateChallanInput, createdById: string) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new ApiError(404, 'Customer not found');
    }

    // 2. Fetch products and validate existence
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== new Set(productIds).size) {
      throw new ApiError(404, 'One or more referenced products were not found');
    }

    const challanNumber = await generateChallanNumber();
    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

    // Build line items snapshots
    const itemsData = data.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId)!;
      return {
        productId: prod.id,
        productNameSnap: prod.name,
        skuSnap: prod.sku,
        unitPriceSnap: prod.unitPrice,
        quantity: item.quantity,
      };
    });

    // 3. Perform creation & stock deduction inside a single atomic $transaction
    return prisma.$transaction(async (tx) => {
      // If status is CONFIRMED, check stock for EVERY line item BEFORE making any changes
      if (data.status === 'CONFIRMED') {
        // Fetch latest product stock inside transaction
        const txProducts = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        for (const item of data.items) {
          const product = txProducts.find((p) => p.id === item.productId)!;
          if (product.currentStock < item.quantity) {
            throw new ApiError(
              400,
              `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, requested: ${item.quantity}`
            );
          }
        }
      }

      // Create Challan & Items
      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          totalQuantity,
          status: data.status,
          createdById,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      // If status is CONFIRMED, reduce product stock & record StockMovement OUT
      if (data.status === 'CONFIRMED') {
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: 'OUT',
              reason: `Challan ${challanNumber} created & confirmed`,
              createdById,
            },
          });
        }
      }

      return challan;
    });
  }

  static async getAll(status?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as ChallanStatus } : {};

    const [items, total] = await prisma.$transaction([
      prisma.challan.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              mobile: true,
              businessName: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.challan.count({ where }),
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
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!challan) {
      throw new ApiError(404, 'Challan not found');
    }

    return challan;
  }

  static async updateStatus(id: string, data: UpdateChallanStatusInput, updatedById: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new ApiError(404, 'Challan not found');
    }

    // Only DRAFT challans can be confirmed or cancelled; CONFIRMED challans are final
    if (challan.status !== 'DRAFT') {
      throw new ApiError(
        400,
        `Cannot change status of a '${challan.status}' challan. Only DRAFT challans can be updated.`
      );
    }

    if (data.status === 'DRAFT') {
      return challan;
    }

    if (data.status === 'CANCELLED') {
      const updated = await prisma.challan.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { customer: true, items: true },
      });
      return updated;
    }

    // Confirming a DRAFT challan
    return prisma.$transaction(async (tx) => {
      const productIds = challan.items.map((i) => i.productId);
      const txProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      // 1. Check stock for every line item BEFORE making any changes
      for (const item of challan.items) {
        const product = txProducts.find((p) => p.id === item.productId);
        if (!product) {
          throw new ApiError(404, `Product '${item.productNameSnap}' not found`);
        }
        if (product.currentStock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, requested: ${item.quantity}`
          );
        }
      }

      // 2. Reduce product stock & write StockMovement records (type OUT)
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: 'OUT',
            reason: `Challan ${challan.challanNumber} confirmed`,
            createdById: updatedById,
          },
        });
      }

      // 3. Update status to CONFIRMED
      const updatedChallan = await tx.challan.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { customer: true, items: true },
      });

      return updatedChallan;
    });
  }

  static async delete(id: string) {
    const challan = await ChallanService.getById(id);
    if (challan.status === 'CONFIRMED') {
      throw new ApiError(400, 'Cannot delete a CONFIRMED challan');
    }
    await prisma.challan.delete({ where: { id } });
    return { message: 'Challan deleted successfully' };
  }
}
