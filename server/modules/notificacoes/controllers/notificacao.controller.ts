import type { Request, Response } from 'express';
import notificacaoService from '../services/notificacao.service.js';
import {
  idNotificacaoSchema,
  listaNotificacaoSchema,
  novaNotificacaoSchema,
} from '../schemas/notificacao.schemas.js';

const notificacaoController = {
  listar: async (req: Request, res: Response) => {
    const { query } = listaNotificacaoSchema.parse({ query: req.query });
    const { itens, naoLidas } = await notificacaoService.listar(query.limite);
    return res.json({ dados: itens, naoLidas });
  },

  marcarLida: async (req: Request, res: Response) => {
    const { params } = idNotificacaoSchema.parse({ params: req.params });
    await notificacaoService.marcarLida(params.id);
    return res.json({ ok: true });
  },

  marcarTodas: async (_req: Request, res: Response) => {
    await notificacaoService.marcarTodas();
    return res.json({ ok: true });
  },

  criar: async (req: Request, res: Response) => {
    const { body } = novaNotificacaoSchema.parse({ body: req.body });
    await notificacaoService.criar(body);
    return res.status(201).json({ ok: true });
  },
};

export default notificacaoController;
