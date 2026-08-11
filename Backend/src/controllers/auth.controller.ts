import { Request, Response } from 'express';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  });

  static register = asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const user = await AuthService.register(data);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
    });
  });

  static me = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  });
}
