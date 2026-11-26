import type { Request, Response } from 'express';
import cardapioService from '../services/cardapio.service.js';
import {
  ativoSchema,
  bebidaSchema,
  criarSaborSchema,
  criarTamanhoSchema,
  imagemSchema,
  precoSchema,
  produtoParamSchema,
  salvarBebidaSchema,
  salvarSaborSchema,
  tamanhoSchema,
} from '../schemas/cardapio.schemas.js';

const cardapioController = {
  listar: async (_req: Request, res: Response) => {
    const cardapio = await cardapioService.listar();
    return res.json(cardapio);
  },

  produto: async (req: Request, res: Response) => {
    const { params } = produtoParamSchema.parse({ params: req.params });
    const produto = await cardapioService.produto(params.slug);
    return res.json(produto);
  },

  sabor: async (req: Request, res: Response) => {
    const { params } = produtoParamSchema.parse({ params: req.params });
    const sabor = await cardapioService.sabor(params.slug);
    return res.json(sabor);
  },

  salvarSabor: async (req: Request, res: Response) => {
    const { params, body } = salvarSaborSchema.parse({ params: req.params, body: req.body });
    const sabor = await cardapioService.salvarSabor(params.slug, body);
    return res.json(sabor);
  },

  removerSabor: async (req: Request, res: Response) => {
    const { params } = produtoParamSchema.parse({ params: req.params });
    await cardapioService.removerSabor(params.slug);
    return res.status(204).send();
  },

  criarSabor: async (req: Request, res: Response) => {
    const { body } = criarSaborSchema.parse({ body: req.body });
    const criado = await cardapioService.criarSabor(body);
    return res.status(201).json(criado);
  },

  atualizarPreco: async (req: Request, res: Response) => {
    const { params, body } = precoSchema.parse({ params: req.params, body: req.body });
    await cardapioService.atualizarPreco(params.slug, body.tamanho, body.valor);
    return res.json({ ok: true });
  },

  atualizarTamanho: async (req: Request, res: Response) => {
    const { params, body } = tamanhoSchema.parse({ params: req.params, body: req.body });
    await cardapioService.atualizarTamanho(params.slug, body.nome, body.diametro_cm, body.fatias);
    return res.json({ ok: true });
  },

  enviarImagemBebida: async (req: Request, res: Response) => {
    const { params, body } = imagemSchema.parse({ params: req.params, body: req.body });
    const imagem = await cardapioService.salvarImagemBebida(params.slug, body.nome, body.base64);
    return res.status(201).json(imagem);
  },

  definirAtivo: async (req: Request, res: Response) => {
    const { params, body } = ativoSchema.parse({ params: req.params, body: req.body });
    await cardapioService.definirAtivo(params.slug, body.ativo);
    return res.json({ ok: true });
  },

  criarBebida: async (req: Request, res: Response) => {
    const { body } = bebidaSchema.parse({ body: req.body });
    const criada = await cardapioService.criarBebida(body);
    return res.status(201).json(criada);
  },

  salvarBebida: async (req: Request, res: Response) => {
    const { params, body } = salvarBebidaSchema.parse({ params: req.params, body: req.body });
    const salva = await cardapioService.salvarBebida(params.slug, body);
    return res.json(salva);
  },

  removerBebida: async (req: Request, res: Response) => {
    const { params } = produtoParamSchema.parse({ params: req.params });
    await cardapioService.removerBebida(params.slug);
    return res.status(204).send();
  },

  criarTamanho: async (req: Request, res: Response) => {
    const { body } = criarTamanhoSchema.parse({ body: req.body });
    const criado = await cardapioService.criarTamanho(body);
    return res.status(201).json(criado);
  },

  removerTamanho: async (req: Request, res: Response) => {
    const { params } = produtoParamSchema.parse({ params: req.params });
    await cardapioService.removerTamanho(params.slug);
    return res.status(204).send();
  },
};

export default cardapioController;
