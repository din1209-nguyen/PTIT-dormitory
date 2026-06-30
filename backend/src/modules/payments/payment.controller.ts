import type { Request, Response } from 'express';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { env } from '../../config/env.js';
import * as svc from './payment.service.js';

export async function createVnpayPayment(req: Request, res: Response) {
  const ipAddr = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const result = await svc.createVnpayPayment(req.body, req.user!.id, ipAddr);
  sendCreated(res, result);
}

export async function vnpayReturn(req: Request, res: Response) {
  const result = await svc.handleVnpayReturn(req.query as Record<string, string>);
  const status = result.success ? 'success' : 'failed';
  res.redirect(`${env.CLIENT_URL}/payment/vnpay-return?status=${status}&txnRef=${result.txnRef || ''}`);
}

export async function vnpayIpn(req: Request, res: Response) {
  try {
    const result = await svc.handleVnpayIpn(req.query as Record<string, string>);
    res.json(result);
  } catch {
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
}

export async function checkStatus(req: Request, res: Response) {
  sendSuccess(res, await svc.checkStatus(req.query.txnRef as string));
}

export async function cashConfirm(req: Request, res: Response) {
  sendCreated(res, await svc.confirmCashPayment(req.body, req.user!.id));
}

export async function getByBill(req: Request, res: Response) {
  sendSuccess(res, await svc.getPaymentsByBill(req.params.billId as string));
}
