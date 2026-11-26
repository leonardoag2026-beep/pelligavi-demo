import { z } from 'zod';

const faixa = z.object({
  minimo: z.coerce.number().int().min(0).max(100000000),
  percentual: z.coerce.number().min(0).max(100),
});

export const salvarConfigSchema = z.object({
  body: z.object({
    taxaBase: z.coerce.number().int().min(0).max(1000000).optional(),
    metaFaturamento: z.coerce.number().int().min(0).max(1000000000).optional(),
    nome: z.string().trim().min(1).max(80).optional(),
    prazoEntregaMin: z.coerce.number().int().min(0).max(240).optional(),
    prazoEntregaMax: z.coerce.number().int().min(0).max(600).optional(),
    freteGratisAcima: z.coerce.number().int().min(0).max(1000000).optional(),
    prazoRetiradaMin: z.coerce.number().int().min(0).max(240).optional(),
    prazoRetiradaMax: z.coerce.number().int().min(0).max(600).optional(),
    raioEntregaKm: z.coerce.number().min(0).max(200).optional(),
    enderecoRetirada: z.string().trim().max(160).optional(),
    faixas: z.array(faixa).max(10).optional(),
  }),
});
