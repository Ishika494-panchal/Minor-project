import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  // Handle Prisma unique constraint violations (P2002)
  if (err?.code === 'P2002') {
    const target = err?.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target) : 'Field';
    res.status(409).json({
      success: false,
      message: `Conflict: Unique constraint violated on ${target}`,
      details: err.meta,
    });
    return;
  }

  console.error('[Unhandled Error]:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
};
