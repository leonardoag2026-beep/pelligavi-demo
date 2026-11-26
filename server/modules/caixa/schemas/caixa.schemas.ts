import { z } from 'zod';

export const abrirCaixaSchema = z.object({
  body: z.object({
    valorInicial: z.coerce.number().int().min(0).max(100000000),
  }),
});

export const fecharCaixaSchema = z.object({
  body: z.object({
    valorContado: z.coerce.number().int().min(0).max(100000000),
    observacao: z.string().trim().max(255).optional().default(''),
  }),
});
