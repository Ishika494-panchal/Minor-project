import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access denied. Authorization Bearer token is missing.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError(401, 'Access denied. Token is empty.');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token.');
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      throw new ApiError(
        403,
        `Forbidden: Role '${req.user.role}' is not authorized. Allowed roles: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};
