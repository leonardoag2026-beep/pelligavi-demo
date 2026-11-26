import type { Request, Response } from 'express';
import relatorioService from '../services/relatorio.service.js';
import { relatorioQuerySchema } from '../schemas/relatorio.schemas.js';

const relatorioController = {
  resumo: async (req: Request, res: Response) => {
    const { query } = relatorioQuerySchema.parse({ query: req.query });
    const relatorio = await relatorioService.resumo(query.de ?? null, query.ate ?? null, query.itens);
    return res.json(relatorio);
  },
};

export default relatorioController;
