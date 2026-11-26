import type { Request, Response } from 'express';
import configService from '../services/config.service.js';
import { salvarConfigSchema } from '../schemas/config.schemas.js';

const configController = {
  atual: async (_req: Request, res: Response) => {
    const config = await configService.atual();
    return res.json(config);
  },

  salvar: async (req: Request, res: Response) => {
    const { body } = salvarConfigSchema.parse({ body: req.body });
    const config = await configService.salvar(body);
    return res.json(config);
  },
};

export default configController;
