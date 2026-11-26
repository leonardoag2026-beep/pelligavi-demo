import type { Request, Response } from 'express';
import clienteService from '../services/cliente.service.js';
import {
  checkoutSchema,
  clienteParamSchema,
  listarClientesSchema,
  novoClienteSchema,
} from '../schemas/cliente.schemas.js';

const clienteController = {
  listar: async (req: Request, res: Response) => {
    const { query } = listarClientesSchema.parse({ query: req.query });
    const clientes = await clienteService.listar(query.busca);
    return res.json(clientes);
  },

  porId: async (req: Request, res: Response) => {
    const { params } = clienteParamSchema.parse({ params: req.params });
    const cliente = await clienteService.porId(params.id);
    return res.json(cliente);
  },

  criar: async (req: Request, res: Response) => {
    const { body } = novoClienteSchema.parse({ body: req.body });
    const cliente = await clienteService.criar({
      nome: body.nome,
      telefone: body.telefone ?? null,
      enderecos: body.enderecos,
    });
    return res.status(201).json(cliente);
  },

  atualizar: async (req: Request, res: Response) => {
    const { params } = clienteParamSchema.parse({ params: req.params });
    const { body } = novoClienteSchema.parse({ body: req.body });
    const cliente = await clienteService.atualizar(params.id, {
      nome: body.nome,
      telefone: body.telefone ?? null,
      enderecos: body.enderecos,
    });
    return res.json(cliente);
  },

  doCheckout: async (req: Request, res: Response) => {
    const { body } = checkoutSchema.parse({ body: req.body });
    const cliente = await clienteService.doCheckout({
      nome: body.nome,
      telefone: body.telefone ?? null,
      endereco: body.endereco ?? null,
    });
    return res.status(201).json(cliente);
  },

  anonimizar: async (req: Request, res: Response) => {
    const { params } = clienteParamSchema.parse({ params: req.params });
    const cliente = await clienteService.anonimizar(params.id);
    return res.json(cliente);
  },

  total: async (_req: Request, res: Response) => {
    const total = await clienteService.total();
    return res.json({ total });
  },
};

export default clienteController;
