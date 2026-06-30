import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';
import * as configService from './config.service.js';

export async function listConfigs(_req: Request, res: Response) {
  const configs = await configService.listConfigs();
  sendSuccess(res, configs);
}

export async function getConfig(req: Request, res: Response) {
  const config = await configService.getConfig(req.params.key as string);
  sendSuccess(res, config);
}

export async function updateConfig(req: Request, res: Response) {
  const config = await configService.updateConfig(req.params.key as string, req.body.value, req.user!.id);
  sendSuccess(res, config, 'Đã cập nhật cấu hình');
}

export async function getFaculties(_req: Request, res: Response) {
  const faculties = await configService.getFaculties();
  sendSuccess(res, faculties);
}
