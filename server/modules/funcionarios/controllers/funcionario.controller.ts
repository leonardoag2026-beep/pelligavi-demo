import type { Request, Response } from 'express';
import funcionarioService from '../services/funcionario.service.js';
import {
  atualizarFuncionarioSchema,
  criarFuncionarioSchema,
  idFuncionarioSchema,
} from '../schemas/funcionario.schemas.js';

const funcionarioController = {
  listar: async (req: Request, res: Response) => {
    const { itens, folha } = await funcionarioService.listar(req.query.inativos === 'true');
    return res.json({ dados: itens, folha });
  },

  resumo: async (_req: Request, res: Response) => {
    const resumo = await funcionarioService.resumo();
    return res.json(resumo);
  },

  porId: async (req: Request, res: Response) => {
    const { params } = idFuncionarioSchema.parse({ params: req.params });
    return res.json(await funcionarioService.porId(params.id));
  },

  criar: async (req: Request, res: Response) => {
    const { body } = criarFuncionarioSchema.parse({ body: req.body });
    const criado = await funcionarioService.criar(body);
    return res.status(201).json(criado);
  },

  atualizar: async (req: Request, res: Response) => {
    const { params, body } = atualizarFuncionarioSchema.parse({ params: req.params, body: req.body });
    return res.json(await funcionarioService.atualizar(params.id, body));
  },

  remover: async (req: Request, res: Response) => {
    const { params } = idFuncionarioSchema.parse({ params: req.params });
    await funcionarioService.remover(params.id);
    return res.status(204).send();
  },
};

export default funcionarioController;
