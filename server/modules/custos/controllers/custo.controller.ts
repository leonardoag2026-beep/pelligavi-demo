import type { Request, Response } from 'express';
import custoService from '../services/custo.service.js';
import {
  compraSchema,
  comprasQuerySchema,
  contaParamSchema,
  novaContaSchema,
} from '../schemas/custo.schemas.js';

const custoController = {
  listarContas: async (_req: Request, res: Response) => {
    const contas = await custoService.listarContas();
    return res.json(contas);
  },

  criarConta: async (req: Request, res: Response) => {
    const { body } = novaContaSchema.parse({ body: req.body });
    const conta = await custoService.criarConta({
      ...body,
      intervaloDias: body.intervaloDias ?? null,
    });
    return res.status(201).json(conta);
  },

  atualizarConta: async (req: Request, res: Response) => {
    const { params } = contaParamSchema.parse({ params: req.params });
    const { body } = novaContaSchema.parse({ body: req.body });
    const conta = await custoService.atualizarConta(params.id, body as never);
    return res.json(conta);
  },

  removerConta: async (req: Request, res: Response) => {
    const { params } = contaParamSchema.parse({ params: req.params });
    await custoService.removerConta(params.id);
    return res.json({ ok: true });
  },

  listarCompras: async (req: Request, res: Response) => {
    const { query } = comprasQuerySchema.parse({ query: req.query });
    const compras = await custoService.listarCompras(query.limite);
    return res.json(compras);
  },

  registrarCompra: async (req: Request, res: Response) => {
    const { body } = compraSchema.parse({ body: req.body });
    const resultado = await custoService.registrarCompra({
      slug: body.slug,
      gramas: body.gramas,
      valorTotal: body.valorTotal,
      fornecedor: body.fornecedor ?? null,
      compradaEm: body.compradaEm ?? null,
    });
    return res.status(201).json(resultado);
  },

  resumo: async (_req: Request, res: Response) => {
    const resumo = await custoService.resumo();
    return res.json(resumo);
  },
};

export default custoController;
