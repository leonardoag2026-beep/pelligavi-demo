import type { Request, Response } from 'express';
import caixaService from '../services/caixa.service.js';
import { abrirCaixaSchema, fecharCaixaSchema } from '../schemas/caixa.schemas.js';

const caixaController = {
  estado: async (_req: Request, res: Response) => {
    const estado = await caixaService.estado();
    return res.json(estado);
  },

  abrir: async (req: Request, res: Response) => {
    const { body } = abrirCaixaSchema.parse({ body: req.body });
    const estado = await caixaService.abrir(body.valorInicial);
    return res.status(201).json(estado);
  },

  fechar: async (req: Request, res: Response) => {
    const { body } = fecharCaixaSchema.parse({ body: req.body });
    const estado = await caixaService.fechar(body.valorContado, body.observacao ?? '');
    return res.json(estado);
  },
};

export default caixaController;
