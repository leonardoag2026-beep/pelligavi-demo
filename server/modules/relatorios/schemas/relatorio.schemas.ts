import { z } from 'zod';

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD').nullable().optional();

export const relatorioQuerySchema = z.object({
  query: z.object({
    de: dia,
    ate: dia,
    itens: z.coerce.number().int().min(1).max(50).default(8),
  }),
});
