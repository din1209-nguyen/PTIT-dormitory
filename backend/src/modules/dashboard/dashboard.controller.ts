import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';
import * as svc from './dashboard.service.js';


export async function admin(_req: Request, res: Response) {
  sendSuccess(res, await svc.getAdminStats());
}
export async function student(req: Request, res: Response) {
  sendSuccess(res, await svc.getStudentStats(req.user!.id));
}
