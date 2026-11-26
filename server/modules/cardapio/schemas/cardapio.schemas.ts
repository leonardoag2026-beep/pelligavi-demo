import { z } from 'zod';

export const produtoParamSchema = z.object({
  params: z.object({ slug: z.string().min(1).max(50) }),
});

export const precoSchema = z.object({
  params: z.object({ slug: z.string().min(1).max(50) }),
  body: z.object({
    tamanho: z.string().trim().min(1).max(20),
    valor: z.coerce.number().int().min(0).max(1000000),
  }),
});

export const tamanhoSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1).max(20) }),
  body: z.object({
    nome: z.string().trim().min(1).max(40),
    diametro_cm: z.coerce.number().int().min(10).max(90),
    fatias: z.coerce.number().int().min(1).max(40),
  }),
});

export const criarTamanhoSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(1).max(30),
    diametro_cm: z.coerce.number().int().min(10).max(90),
    fatias: z.coerce.number().int().min(1).max(40),
    fator: z.coerce.number().min(0.2).max(4),
  }),
});

export const bebidaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2).max(100),
    detalhe: z.string().trim().max(120).optional().default(''),
    preco: z.coerce.number().int().min(0).max(1000000),
  }),
});

export const salvarBebidaSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1).max(50) }),
  body: z.object({
    nome: z.string().trim().min(2).max(100),
    detalhe: z.string().trim().max(120).optional().default(''),
    preco: z.coerce.number().int().min(0).max(1000000),
  }),
});

export const imagemSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
  body: z.object({ nome: z.string().min(1), base64: z.string().min(16) }),
});

const receitaItem = z.object({
  id: z.string().min(1).max(50),
  gramas: z.coerce.number().int().min(1).max(5000),
  porcoes: z.coerce.number().int().min(0).max(20),
});

const precosSchema = z.record(
  z.string().trim().min(1).max(20),
  z.coerce.number().int().min(0).max(1000000),
);

export const salvarSaborSchema = z.object({
  params: z.object({ slug: z.string().min(1).max(50) }),
  body: z.object({
    nome: z.string().trim().min(2).max(60),
    ativo: z.boolean().default(true),
    precos: precosSchema.default({}),
    receita: z.array(receitaItem).min(1).max(20),
  }),
});

export const criarSaborSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(2).max(60),
    precos: precosSchema.default({}),
    receita: z.array(receitaItem).min(1).max(20),
  }),
});

export const ativoSchema = z.object({
  params: z.object({ slug: z.string().min(1).max(50) }),
  body: z.object({ ativo: z.boolean() }),
});

export type ProdutoParam = z.infer<typeof produtoParamSchema>;
export type PrecoBody = z.infer<typeof precoSchema>;
export type AtivoBody = z.infer<typeof ativoSchema>;
