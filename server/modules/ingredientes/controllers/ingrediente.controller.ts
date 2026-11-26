import type { Request, Response } from 'express';
import ingredienteService from '../services/ingrediente.service.js';
import { GEOMETRIAS } from '../services/receita.service.js';
import {
  criarIngredienteSchema,
  ingredienteAtivoSchema,
  ingredienteClasseSchema,
  ingredienteCustoSchema,
  ingredienteImagemSchema,
  ingredienteModeloSchema,
  ingredienteTexturaSchema,
  ingredientePesoSchema,
  ingredienteParamSchema,
  ingredientePrecoSchema,
  ingredienteRenderSchema,
} from '../schemas/ingrediente.schemas.js';

const ingredienteController = {
  listar: async (_req: Request, res: Response) => {
    const ingredientes = await ingredienteService.listar();
    return res.json(ingredientes);
  },

  porSlug: async (req: Request, res: Response) => {
    const { params } = ingredienteParamSchema.parse({ params: req.params });
    const ingrediente = await ingredienteService.porSlug(params.slug);
    return res.json(ingrediente);
  },

  atualizarPreco: async (req: Request, res: Response) => {
    const { params, body } = ingredientePrecoSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.atualizarPreco(params.slug, body.preco);
    return res.json({ ok: true });
  },

  atualizarCusto: async (req: Request, res: Response) => {
    const { params, body } = ingredienteCustoSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.atualizarCusto(params.slug, body.custo_kg);
    return res.json({ ok: true });
  },

  geometrias: async (_req: Request, res: Response) => {
    return res.json(GEOMETRIAS);
  },

  listarRender: async (_req: Request, res: Response) => {
    const render = await ingredienteService.listarRender();
    return res.json(render);
  },

  salvarRender: async (req: Request, res: Response) => {
    const { params, body } = ingredienteRenderSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.salvarRender(params.slug, body);
    return res.json({ ok: true });
  },

  atualizarPeso: async (req: Request, res: Response) => {
    const { params, body } = ingredientePesoSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.atualizarPeso(params.slug, body.gramas, body.preco_kg);
    return res.json({ ok: true });
  },

  enviarImagem: async (req: Request, res: Response) => {
    const { params, body } = ingredienteImagemSchema.parse({ params: req.params, body: req.body });
    const imagem = await ingredienteService.salvarImagem(params.slug, body.nome, body.base64);
    return res.status(201).json(imagem);
  },

  enviarModelo: async (req: Request, res: Response) => {
    const { params, body } = ingredienteModeloSchema.parse({ params: req.params, body: req.body });
    const modelo = await ingredienteService.salvarModelo(params.slug, body.nome, body.base64);
    return res.status(201).json(modelo);
  },

  enviarTextura: async (req: Request, res: Response) => {
    const { params, body } = ingredienteTexturaSchema.parse({ params: req.params, body: req.body });
    const textura = await ingredienteService.salvarTextura(params.slug, body.nome, body.base64);
    return res.status(201).json(textura);
  },

  definirClasse: async (req: Request, res: Response) => {
    const { params, body } = ingredienteClasseSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.definirClasse(params.slug, body.classe);
    return res.json({ ok: true });
  },

  criar: async (req: Request, res: Response) => {
    const { body } = criarIngredienteSchema.parse({ body: req.body });
    const criado = await ingredienteService.criar(body);
    return res.status(201).json(criado);
  },

  remover: async (req: Request, res: Response) => {
    const { params } = ingredienteParamSchema.parse({ params: req.params });
    await ingredienteService.remover(params.slug);
    return res.status(204).send();
  },

  definirAtivo: async (req: Request, res: Response) => {
    const { params, body } = ingredienteAtivoSchema.parse({ params: req.params, body: req.body });
    await ingredienteService.definirAtivo(params.slug, body.ativo);
    return res.json({ ok: true });
  },
};

export default ingredienteController;
