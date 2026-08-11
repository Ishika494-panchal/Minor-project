import prisma from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { CreateCustomerInput, UpdateCustomerInput, AddFollowUpInput } from '../validators/customer.validator';

export class CustomerService {
  static async create(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        businessName: data.businessName || null,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address || null,
        status: data.status,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes || null,
      },
    });
    return customer;
  }

  static async getAll(search?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { mobile: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { businessName: { contains: search, mode: 'insensitive' as const } },
            { gstNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { date: 'desc' },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw new ApiError(404, 'Customer not found');
    }

    return customer;
  }

  static async update(id: string, data: UpdateCustomerInput) {
    await CustomerService.getById(id);

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email !== undefined ? (data.email || null) : undefined,
        businessName: data.businessName !== undefined ? (data.businessName || null) : undefined,
        gstNumber: data.gstNumber !== undefined ? (data.gstNumber || null) : undefined,
        address: data.address !== undefined ? (data.address || null) : undefined,
        notes: data.notes !== undefined ? (data.notes || null) : undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : data.followUpDate === null ? null : undefined,
      },
    });
    return updated;
  }

  static async addFollowUp(customerId: string, data: AddFollowUpInput, createdById: string) {
    await CustomerService.getById(customerId);

    const followUp = await prisma.followUp.create({
      data: {
        customerId,
        note: data.note,
        date: data.date ? new Date(data.date) : new Date(),
        createdById,
      },
    });

    // Also update followUpDate on customer if date provided
    if (data.date) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { followUpDate: new Date(data.date) },
      });
    }

    return followUp;
  }

  static async delete(id: string) {
    await CustomerService.getById(id);
    await prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }
}
