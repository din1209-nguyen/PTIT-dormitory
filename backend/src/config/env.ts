import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url(),
  SERVER_URL: z.string().url(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),

  MONGODB_URI: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('dev-cookie-secret-change-in-prod'),

  // SMTP — optional until email module
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // VNPay — optional until payment module
  VNPAY_TMN_CODE: z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  VNPAY_URL: z.string().optional(),
  VNPAY_API_URL: z.string().optional(),
  VNPAY_RETURN_URL: z.string().optional(),
  VNPAY_IPN_URL: z.string().optional(),

  // Seed
  SEED_ADMIN_USERNAME: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
