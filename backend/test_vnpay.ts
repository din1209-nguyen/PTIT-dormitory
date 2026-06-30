import { createPaymentUrl } from './src/integrations/vnpay/vnpay.client.js';
import dotenv from 'dotenv';
dotenv.config();

const url = createPaymentUrl({
  amount: 9823,
  orderId: "test_9823_123",
  orderInfo: "Thanh toan test",
  ipAddr: "127.0.0.1"
});

console.log("Generated URL:");
console.log(url);

const parsedUrl = new URL(url);
console.log("vnp_Amount in URL:", parsedUrl.searchParams.get("vnp_Amount"));
