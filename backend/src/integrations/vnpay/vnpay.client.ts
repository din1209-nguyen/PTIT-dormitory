import { env } from '../../config/env.js';
import { createSecureHash } from './vnpay.signature.js';

interface CreatePaymentUrlParams {
  amount: number;
  orderId: string;
  orderInfo: string;
  ipAddr: string;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function createPaymentUrl(params: CreatePaymentUrlParams): string {
  const tmnCode = env.VNPAY_TMN_CODE;
  const hashSecret = env.VNPAY_HASH_SECRET;
  const vnpUrl = env.VNPAY_URL;
  const returnUrl = env.VNPAY_RETURN_URL;

  if (!tmnCode || !hashSecret || !vnpUrl || !returnUrl) {
    throw new Error('VNPay configuration is missing');
  }

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(params.amount * 100),
    vnp_CreateDate: formatDate(new Date()),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddr,
    vnp_Locale: 'vn',
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: params.orderId,
  };

  const secureHash = createSecureHash(vnpParams, hashSecret);
  vnpParams.vnp_SecureHash = secureHash;

  const query = Object.keys(vnpParams)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(vnpParams[k])).replace(/%20/g, '+')}`)
    .join('&');

  return `${vnpUrl}?${query}`;
}
