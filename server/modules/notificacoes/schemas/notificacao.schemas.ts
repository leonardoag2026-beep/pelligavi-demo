import { z } from 'zod';

export const listaNotificacaoSchema = z.object({
  query: z.object({
    limite: z.coerce.number().int().min(1).max(200).default(40),
  }),
});

export const idNotificacaoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const novaNotificacaoSchema = z.object({
  body: z.object({
    tipo: z.enum(['pedido', 'estoque', 'sistema', 'financeiro']),
    titulo: z.string().trim().min(1).max(120),
    texto: z.string().trim().max(240).nullable().optional(),
    meta: z.string().trim().max(40).nullable().optional(),
  }),
});
