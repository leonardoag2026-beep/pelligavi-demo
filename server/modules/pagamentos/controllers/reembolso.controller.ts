import type { Request, Response } from 'express';
import reembolsoService from '../services/reembolso.service.js';
import { listaReembolsoSchema, novoReembolsoSchema } from '../schemas/reembolso.schemas.js';

const reembolsoController = {
  listar: async (req: Request, res: Response) => {
    const { query } = listaReembolsoSchema.parse({ query: req.query });
    const de = query.de ?? null;
    const ate = query.ate ?? null;
    const [dados, total] = await Promise.all([
      reembolsoService.listar(de, ate),
      reembolsoService.total(de, ate),
    ]);
    return res.json({ dados, ...total });
  },

  criar: async (req: Request, res: Response) => {
    const { body } = novoReembolsoSchema.parse({ body: req.body });
    const criado = await reembolsoService.criar(body);
    return res.status(201).json(criado);
  },
};

export default reembolsoController;
