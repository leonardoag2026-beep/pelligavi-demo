import { z } from 'zod';

const slug = z.string().min(1).max(40);

export const ingredienteParamSchema = z.object({
  params: z.object({ slug }),
});

export const criarIngredienteSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2).max(80),
    classe: z.enum(['rodela', 'desfiado', 'espalhado', 'fio']),
    tipo: z.string().trim().min(2).max(30),
    preco_porcao: z.coerce.number().int().min(0).max(1000000),
    custo_kg: z.coerce.number().int().min(0).max(1000000),
    gramas_porcao: z.coerce.number().int().min(1).max(2000),
    cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

export const ingredientePrecoSchema = z.object({
  params: z.object({ slug }),
  body: z.object({ preco: z.coerce.number().int().min(0).max(1000000) }),
});

export const ingredienteCustoSchema = z.object({
  params: z.object({ slug }),
  body: z.object({ custo_kg: z.coerce.number().int().min(0).max(1000000) }),
});

export const ingredienteClasseSchema = z.object({
  params: z.object({ slug: z.string().min(1).max(50) }),
  body: z.object({ classe: z.enum(['rodela', 'desfiado', 'espalhado', 'fio']) }),
});

export const ingredienteAtivoSchema = z.object({
  params: z.object({ slug }),
  body: z.object({ ativo: z.boolean() }),
});

export const ingredienteRenderSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    geometria: z.enum(['auto', 'fio', 'fios', 'rodela', 'desfiado', 'espalhado', 'rasgada', 'cubo', 'stl']).optional(),
    params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    modelo_url: z.string().trim().max(255).nullable().optional(),
    textura_url: z.string().trim().max(255).nullable().optional(),
  }),
});

export const ingredientePesoSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    gramas: z.coerce.number().int().min(1).max(5000),
    preco_kg: z.coerce.number().int().min(0).max(1000000),
  }),
});

export const ingredienteImagemSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    nome: z.string().trim().min(1).max(120),
    base64: z.string().min(20),
  }),
});

export const ingredienteTexturaSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    nome: z.string().trim().min(1).max(120),
    base64: z.string().min(32),
  }),
});

export const ingredienteModeloSchema = z.object({
  params: z.object({ slug }),
  body: z.object({
    nome: z.string().trim().min(1).max(120),
    base64: z.string().min(20),
  }),
});

export type IngredienteParam = z.infer<typeof ingredienteParamSchema>;
