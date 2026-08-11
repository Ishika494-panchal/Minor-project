import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_mini_erp_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
};
