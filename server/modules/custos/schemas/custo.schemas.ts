import { z } from 'zod';

export const contaParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

export const novaContaSchema = z.object({
  body: z.object({
    nome: z.string().trim().min(1).max(80),
    categoria: z.string().trim().min(1).max(60).default('Outros'),
    valor: z.coerce.number().int().min(0).max(100000000),
    tipo: z.enum(['mensal', 'imediato', 'periodico']).default('mensal'),
    intervaloDias: z.coerce.number().int().min(1).max(3650).nullable().optional(),
    diaVencimento: z.coerce.number().int().min(1).max(31).nullable().optional(),
    dataInicio: data,
    dataFim: data,
    repeticoes: z.coerce.number().int().min(1).max(1000).nullable().optional(),
    icone: z.string().trim().max(20).default('outros'),
  }).transform((b) => ({
    ...b,
    // o CHECK do banco exige NULL fora do tipo correspondente: aqui vira 422 limpo
    intervaloDias: b.tipo === 'periodico' ? b.intervaloDias ?? null : null,
    diaVencimento: b.tipo === 'mensal' ? b.diaVencimento ?? null : null,
  })),
});

export const compraSchema = z.object({
  body: z.object({
    slug: z.string().trim().min(1).max(40),
    gramas: z.coerce.number().int().positive().max(1000000),
    valorTotal: z.coerce.number().int().min(0).max(100000000),
    fornecedor: z.string().trim().max(80).nullable().optional(),
    compradaEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  }),
});

export const comprasQuerySchema = z.object({
  query: z.object({
    limite: z.coerce.number().int().min(1).max(200).default(30),
  }),
});

export type NovaContaBody = z.infer<typeof novaContaSchema>;
export type CompraBody = z.infer<typeof compraSchema>;
