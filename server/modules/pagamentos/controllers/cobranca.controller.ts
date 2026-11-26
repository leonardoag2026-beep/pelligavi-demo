import type { Request, Response } from 'express';
import cobrancaService from '../services/cobranca.service.js';
import {
  cobrancaParamSchema,
  novaCobrancaSchema,
  pagarCobrancaSchema,
} from '../schemas/cobranca.schemas.js';

const cobrancaController = {
  listar: async (req: Request, res: Response) => {
    const limite = Math.min(200, Math.max(1, Number(req.query.limite) || 50));
    const cobrancas = await cobrancaService.listar(limite);
    return res.json(cobrancas);
  },

  porCodigo: async (req: Request, res: Response) => {
    const { params } = cobrancaParamSchema.parse({ params: req.params });
    const cobranca = await cobrancaService.porCodigo(params.codigo);
    return res.json(cobranca);
  },

  criar: async (req: Request, res: Response) => {
    const { body } = novaCobrancaSchema.parse({ body: req.body });
    const cobranca = await cobrancaService.criar({
      codigo: body.codigo,
      tipo: body.tipo,
      metodo: body.metodo,
      nomeCliente: body.cliente.nome,
      telefone: body.cliente.telefone ?? null,
      endereco: body.endereco ?? null,
      contaRef: body.contaRef ?? null,
      clienteRef: body.clienteRef ?? null,
      itens: body.itens,
      avulsa: body.avulsa,
    });
    return res.status(201).json(cobranca);
  },

  pagar: async (req: Request, res: Response) => {
    const { params, body } = pagarCobrancaSchema.parse({ params: req.params, body: req.body });
    const cobranca = await cobrancaService.pagar(params.codigo, body.pedidoRef ?? null, body.metodo ?? null);
    return res.json(cobranca);
  },

  cancelar: async (req: Request, res: Response) => {
    const { params } = cobrancaParamSchema.parse({ params: req.params });
    await cobrancaService.cancelar(params.codigo);
    return res.json({ ok: true });
  },
};

export default cobrancaController;
