import { z } from 'zod';

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish();

export const listaReembolsoSchema = z.object({
  query: z.object({ de: data, ate: data }),
});

export const novoReembolsoSchema = z.object({
  body: z.object({
    valor: z.coerce.number().int().min(0).max(10000000),
    motivo: z.string().trim().max(160).nullable().optional(),
    pedidoRef: z.string().trim().max(20).nullable().optional(),
  }),
});
