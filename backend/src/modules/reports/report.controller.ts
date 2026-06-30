import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';
import * as svc from './report.service.js';

export async function residence(req: Request, res: Response) {
  sendSuccess(res, await svc.residenceReport(req.query.semesterId as string | undefined));
}
export async function dormitoryCapacity(req: Request, res: Response) {
  sendSuccess(res, await svc.dormitoryCapacityReport(req.query.semesterId as string | undefined));
}
export async function utility(req: Request, res: Response) {
  sendSuccess(res, await svc.utilityReport(
    req.query.month ? Number(req.query.month) : undefined,
    req.query.year ? Number(req.query.year) : undefined,
  ));
}
export async function payments(req: Request, res: Response) {
  sendSuccess(res, await svc.paymentReport(
    req.query.month ? Number(req.query.month) : undefined,
    req.query.year ? Number(req.query.year) : undefined,
  ));
}
export async function violations(req: Request, res: Response) {
  sendSuccess(res, await svc.violationReport(req.query.semesterId as string | undefined));
}
export async function requests(req: Request, res: Response) {
  sendSuccess(res, await svc.requestReport(req.query.semesterId as string | undefined));
}
export async function trends(req: Request, res: Response) {
  sendSuccess(res, await svc.trendReport(
    req.query.startSemesterId as string | undefined,
    req.query.endSemesterId as string | undefined
  ));
}
