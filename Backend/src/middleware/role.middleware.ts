import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized. Please login first.', 401);
      return;
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
        403
      );
      return;
    }

    next();
  };
};
