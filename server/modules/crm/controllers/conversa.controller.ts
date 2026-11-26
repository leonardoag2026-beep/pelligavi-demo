import type { Request, Response } from 'express';
import conversaService from '../services/conversa.service.js';
import {
  conversaParamSchema,
  listarConversasSchema,
  responderSchema,
} from '../schemas/conversa.schemas.js';

const conversaController = {
  listar: async (req: Request, res: Response) => {
    const { query } = listarConversasSchema.parse({ query: req.query });
    const conversas = await conversaService.listar(query.status);
    return res.json(conversas);
  },

  resumo: async (_req: Request, res: Response) => {
    const resumo = await conversaService.resumo();
    return res.json(resumo);
  },

  porCodigo: async (req: Request, res: Response) => {
    const { params } = conversaParamSchema.parse({ params: req.params });
    const conversa = await conversaService.porCodigo(params.codigo);
    return res.json(conversa);
  },

  responder: async (req: Request, res: Response) => {
    const { params, body } = responderSchema.parse({ params: req.params, body: req.body });
    const conversa = await conversaService.responder(params.codigo, body.texto);
    return res.status(201).json(conversa);
  },

  marcarLida: async (req: Request, res: Response) => {
    const { params } = conversaParamSchema.parse({ params: req.params });
    await conversaService.marcarLida(params.codigo);
    return res.json({ ok: true });
  },

  resolver: async (req: Request, res: Response) => {
    const { params } = conversaParamSchema.parse({ params: req.params });
    await conversaService.resolver(params.codigo);
    return res.json({ ok: true });
  },
};

export default conversaController;
